"""Single worker process: `python -m app.worker`.

Polls the database and does the real work:
  1. plans stuck in 'generating'  → run the planner LLM call
  2. 'ready' tasks whose deps completed → execute via the provider

One worker initially. It never invents results: a provider failure marks
the task failed with the reason, and the UI shows a retry option.
"""
from __future__ import annotations

import time
import traceback

from sqlalchemy.orm import Session

from . import budget
from .config import settings
from .db import SessionLocal, init_db
from .models import ActivityEvent, Plan, Project, Task
from .orchestrator import TASK_MAX_TOKENS, generate_plan, log_event
from .providers.base import ProviderAdapter, ProviderError, get_provider

RESEARCH_SYSTEM = (
    "You are the Research role in the Orchestra MVP. Research the given topic "
    "using your own knowledge. Be specific and factual. Distinguish what you "
    "know confidently from what is uncertain. Do not invent URLs, version "
    "numbers, or statistics you are not sure about — say when you are unsure."
)

SYNTHESIS_SYSTEM = (
    "You are the Synthesis role in the Orchestra MVP. You receive research "
    "briefs as context and must combine them into the requested deliverable. "
    "Use only the provided context — do not add facts from outside it. "
    "Flag anything you cannot trace to the context."
)


def _deps_completed(db: Session, task: Task) -> bool:
    if not task.depends_on:
        return True
    done = {
        t.id
        for t in db.query(Task).filter(Task.id.in_(task.depends_on), Task.status == "completed")
    }
    return set(task.depends_on) <= done


def _build_prompt(db: Session, task: Task) -> tuple[str, str]:
    if task.kind == "synthesis":
        prior = (
            db.query(Task)
            .filter(Task.project_id == task.project_id, Task.kind == "research", Task.status == "completed")
            .order_by(Task.created_at)
            .all()
        )
        context = "\n\n".join(f"## {t.name}\n{t.result or ''}" for t in prior)
        system = SYNTHESIS_SYSTEM
        prompt = f"Deliverable: {task.name}\n\nResearch context:\n{context}"
    else:
        system = RESEARCH_SYSTEM
        prompt = f"Research topic: {task.name}\n\nWrite a focused research brief."
    return system, prompt


def execute_task(db: Session, provider: ProviderAdapter, task: Task) -> None:
    project = db.get(Project, task.project_id)
    assert project is not None
    task.status = "running"
    task.progress = 5
    db.flush()
    log_event(db, project.id, "start", f"Started {task.name.lower()}", role=task.kind.capitalize())
    db.commit()

    system, prompt = _build_prompt(db, task)
    try:
        estimate = provider.estimate_cost_usd(system + prompt, TASK_MAX_TOKENS)
        budget.check_before_call(project, estimate)
        res = provider.complete(system=system, prompt=prompt, max_tokens=TASK_MAX_TOKENS)
        budget.record_spend(project, res.cost_usd)
    except budget.BudgetExceeded as e:
        task.status = "failed"
        task.failure_reason = str(e)
        log_event(db, project.id, "error", f"{task.name}: stopped — {e}")
        db.commit()
        return
    except ProviderError as e:
        task.status = "failed"
        task.failure_reason = f"Provider error: {e}"
        log_event(db, project.id, "error", f"{task.name}: provider error — {e}")
        db.commit()
        return
    except Exception as e:  # defensive: never lose the failure
        task.status = "failed"
        task.failure_reason = f"Unexpected error: {e}"
        log_event(db, project.id, "error", f"{task.name}: unexpected error — {e}")
        db.commit()
        return

    task.result = res.text
    task.input_tokens = res.input_tokens
    task.output_tokens = res.output_tokens
    task.cost_usd = round(res.cost_usd, 6)
    task.progress = 100
    task.status = "completed"
    db.flush()
    log_event(
        db,
        project.id,
        "complete",
        f"Completed {task.name.lower()} (${res.cost_usd:.4f})",
        role=task.kind.capitalize(),
    )
    # project completion check
    remaining = (
        db.query(Task)
        .filter(Task.project_id == project.id, Task.status.notin_(["completed"]))
        .count()
    )
    if remaining == 0:
        project.status = "completed"
        log_event(db, project.id, "system", "All tasks completed. Final result is ready for review.")
    db.commit()


def run_once(provider: ProviderAdapter | None = None) -> dict:
    """One poll iteration. Returns counts — handy for tests and the CLI."""
    provider = provider or get_provider()
    db: Session = SessionLocal()
    done = {"plans": 0, "tasks": 0}
    try:
        for plan in db.query(Plan).filter(Plan.status == "generating").all():
            proj = db.get(Project, plan.project_id)
            if not proj or proj.status != "awaiting_plan":
                continue
            try:
                generate_plan(db, provider, plan)
                done["plans"] += 1
            except Exception:
                traceback.print_exc()
                db.rollback()
        # one task per iteration keeps the single worker honest and simple
        task = (
            db.query(Task)
            .filter(Task.status == "ready")
            .order_by(Task.created_at)
            .first()
        )
        if task:
            project = db.get(Project, task.project_id)
            if project and project.status == "active" and _deps_completed(db, task):
                try:
                    execute_task(db, provider, task)
                    done["tasks"] += 1
                except Exception:
                    traceback.print_exc()
                    db.rollback()
        return done
    finally:
        db.close()


def main() -> None:
    init_db()
    print(f"[worker] provider={get_provider().name} poll={settings.worker_poll_sec}s "
          f"ceiling=${settings.dev_budget_ceiling_usd:.2f}")
    while True:
        try:
            done = run_once()
            if done["plans"] or done["tasks"]:
                print(f"[worker] did {done}")
        except Exception:
            traceback.print_exc()
        time.sleep(settings.worker_poll_sec)


if __name__ == "__main__":
    main()
