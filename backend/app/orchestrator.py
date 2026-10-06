"""Thin custom orchestration loop.

Responsibilities ONLY:
  - create project / store objective
  - ask the provider (via adapter) to draft a plan
  - validate the plan (structure, exposure rule, task cap, ceiling)
  - record a plan-gate approval for the human
  - on approval: materialize tasks, hand to the worker
  - execute tasks via the worker: research → synthesis, honoring deps

It does NOT call provider SDKs directly, hold keys, or retry provider
failures silently. Failures are recorded on the task with a reason.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import budget
from .models import ActivityEvent, Approval, Plan, Project, Task
from .providers.base import ProviderAdapter, ProviderError

MAX_PLAN_TASKS = 8
PLAN_MAX_TOKENS = 1500
TASK_MAX_TOKENS = 2000


# ── events ──────────────────────────────────────────────────────────────

def log_event(db: Session, project_id: str, kind: str, text: str, role: str | None = None) -> ActivityEvent:
    e = ActivityEvent(project_id=project_id, kind=kind, role=role, text=text)
    db.add(e)
    return e


# ── projects ────────────────────────────────────────────────────────────

def create_project(db: Session, objective: str) -> Project:
    objective = objective.strip()
    if not objective:
        raise ValueError("Objective must not be empty.")
    if len(objective) > 2000:
        raise ValueError("Objective is too long (max 2000 chars).")
    p = Project(objective=objective, status="draft", budget_ceiling_usd=budget.settings.dev_budget_ceiling_usd)
    db.add(p)
    db.flush()
    log_event(db, p.id, "system", "Project created. Objective stored.")
    db.commit()
    db.refresh(p)
    return p


# ── plan generation + validation ────────────────────────────────────────

PLANNER_SYSTEM = (
    "You are the Planner role in the Orchestra MVP. Given an objective, "
    "output STRICT JSON only — no prose, no markdown fences — with this shape:\n"
    '{"tasks":[{"name":str,"kind":"research"|"synthesis","purpose":str,'
    '"network":bool,"privateData":bool,"tools":[str],"costCeiling":number}]}\n'
    "Rules: 2-4 research tasks then exactly 1 synthesis task. "
    "Research tasks: network=true, privateData=false. "
    "Synthesis task: network=false, privateData=true. "
    "costCeiling per task between 0.1 and 1.0 USD."
)


def _parse_plan_json(text: str) -> dict:
    """Parse the planner's JSON, tolerating markdown fences.

    Raises ValueError with a raw-text snippet so malformed output can be
    diagnosed from the failure reason instead of guessing.
    """
    raw = text.strip()
    # Strip ```json ... ``` / ``` ... ``` fences if the model added them.
    if raw.startswith("```"):
        lines = raw.splitlines()
        # drop opening fence line and trailing fence line
        body = [ln for ln in lines[1:] if ln.strip() != "```"]
        # also drop a leading "json" language tag if glued to the fence
        raw = "\n".join(body).strip()
        if raw.startswith("json\n") or raw.startswith("json "):
            raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        snippet = raw[:300].replace("\n", " ")
        raise ValueError(f"Planner returned invalid JSON ({e}); raw head: {snippet!r}")
    if not isinstance(data, dict):
        raise ValueError("Planner output must be a JSON object.")
    return data


def _validate_plan_tasks(raw_tasks: object) -> list[dict]:
    """Strict validation. Returns the cleaned task list or raises ValueError."""
    if not isinstance(raw_tasks, list) or not raw_tasks:
        raise ValueError("Plan must contain a non-empty 'tasks' list.")
    if len(raw_tasks) > MAX_PLAN_TASKS:
        raise ValueError(f"Plan has {len(raw_tasks)} tasks; MVP cap is {MAX_PLAN_TASKS}.")
    cleaned: list[dict] = []
    kinds: list[str] = []
    for i, t in enumerate(raw_tasks):
        if not isinstance(t, dict):
            raise ValueError(f"Task {i} is not an object.")
        name = str(t.get("name", "")).strip()
        kind = str(t.get("kind", "")).strip()
        if not name or kind not in ("research", "synthesis"):
            raise ValueError(f"Task {i}: need a name and kind research|synthesis.")
        network = bool(t.get("network", False))
        private = bool(t.get("privateData", False))
        # exposure rule: network XOR private data — never both, never neither
        if network == private:
            raise ValueError(
                f"Task {i} ({name!r}): exposure violation — "
                "a task must use network XOR private workspace data, never both/neither."
            )
        ceiling = t.get("costCeiling", 0.5)
        try:
            ceiling = float(ceiling)
        except (TypeError, ValueError):
            raise ValueError(f"Task {i}: costCeiling must be a number.")
        if not 0.05 <= ceiling <= 1.5:
            raise ValueError(f"Task {i}: costCeiling {ceiling} out of range.")
        cleaned.append(
            {
                "name": name[:200],
                "kind": kind,
                "purpose": str(t.get("purpose", ""))[:500],
                "network": network,
                "privateData": private,
                "tools": [str(x)[:64] for x in t.get("tools", [])][:6],
                "costCeiling": ceiling,
            }
        )
        kinds.append(kind)
    if "synthesis" not in kinds:
        raise ValueError("Plan must end with a synthesis task.")
    return cleaned


def request_plan(db: Session, project_id: str) -> Plan:
    """Create a plan row in 'generating' state. The worker performs the LLM call."""
    project = db.get(Project, project_id)
    if not project:
        raise ValueError("Project not found.")
    if project.status not in ("draft", "failed"):
        raise ValueError(f"Cannot plan while project is {project.status}.")
    version = db.query(Plan).filter(Plan.project_id == project_id).count() + 1
    plan = Plan(project_id=project_id, version=version, status="generating")
    db.add(plan)
    project.status = "awaiting_plan"
    db.flush()
    log_event(db, project_id, "plan", f"Plan v{version} generation requested.", role="Planner")
    db.commit()
    db.refresh(plan)
    return plan


def generate_plan(db: Session, provider: ProviderAdapter, plan: Plan) -> Plan:
    """Worker-side: call the provider, validate, and open a human approval gate."""
    project = db.get(Project, plan.project_id)
    assert project is not None
    prompt = f"Objective: {project.objective}\nOutput strict JSON."
    try:
        estimate = provider.estimate_cost_usd(PLANNER_SYSTEM + prompt, PLAN_MAX_TOKENS)
        budget.check_before_call(project, estimate)
        res = provider.complete(system=PLANNER_SYSTEM, prompt=prompt, max_tokens=PLAN_MAX_TOKENS)
        budget.record_spend(project, res.cost_usd)
        data = _parse_plan_json(res.text)
        tasks = _validate_plan_tasks(data.get("tasks"))
    except budget.BudgetExceeded as e:
        plan.status = "failed"
        plan.failure_reason = str(e)
        project.status = "failed"  # allow requesting a fresh plan (retry)
        log_event(db, project.id, "error", f"Plan generation stopped: {e}")
        db.commit()
        return plan
    except (ProviderError, ValueError, json.JSONDecodeError) as e:
        plan.status = "failed"
        plan.failure_reason = f"Plan generation failed: {e}"
        project.status = "failed"  # allow requesting a fresh plan (retry)
        log_event(db, project.id, "error", f"Plan generation failed: {e}", role="Planner")
        db.commit()
        return plan

    plan.tasks_json = tasks
    plan.cost_ceiling_usd = round(sum(t["costCeiling"] for t in tasks), 2)
    plan.status = "pending_approval"
    db.flush()
    approval = Approval(
        project_id=project.id,
        plan_id=plan.id,
        gate="plan",
        title=f"Approve plan v{plan.version}",
        description=f"Planner proposed {len(tasks)} tasks.",
        reason=f"Est. ceiling ${plan.cost_ceiling_usd:.2f}. Every task passed the exposure check.",
        status="pending",
    )
    db.add(approval)
    db.flush()
    log_event(db, project.id, "approval", f"Plan v{plan.version} ({len(tasks)} tasks) needs your approval.", role="Planner")
    db.commit()
    db.refresh(plan)
    return plan


def approve_plan(db: Session, approval_id: str) -> Plan:
    approval = db.get(Approval, approval_id)
    if not approval or approval.status != "pending" or approval.gate != "plan":
        raise ValueError("Approval not found or not pending.")
    plan = db.get(Plan, approval.plan_id)
    project = db.get(Project, approval.project_id)
    assert plan is not None and project is not None

    plan.status = "approved"
    approval.status = "approved"
    approval.decided_at = datetime.now(timezone.utc)
    # materialize tasks; synthesis depends on all research tasks
    research_ids: list[str] = []
    for t in plan.tasks_json:
        task = Task(
            project_id=project.id,
            plan_id=plan.id,
            name=t["name"],
            kind=t["kind"],
            status="ready",
            depends_on=[],
            cost_usd=0.0,
        )
        db.add(task)
        db.flush()
        if t["kind"] == "research":
            research_ids.append(task.id)
        else:
            task.depends_on = list(research_ids)
    project.status = "active"
    db.flush()
    log_event(db, project.id, "approval", f"Plan v{plan.version} approved. {len(plan.tasks_json)} tasks queued.")
    db.commit()
    db.refresh(plan)
    return plan


def reject_plan(db: Session, approval_id: str, note: str = "") -> Plan:
    approval = db.get(Approval, approval_id)
    if not approval or approval.status != "pending" or approval.gate != "plan":
        raise ValueError("Approval not found or not pending.")
    plan = db.get(Plan, approval.plan_id)
    project = db.get(Project, approval.project_id)
    assert plan is not None and project is not None
    plan.status = "rejected"
    approval.status = "rejected"
    approval.decided_at = datetime.now(timezone.utc)
    project.status = "draft"
    db.flush()
    log_event(db, project.id, "approval", f"Plan v{plan.version} rejected.{(' ' + note) if note else ''}")
    db.commit()
    return plan

