"""Backend tests for the V1 vertical slice.

Covers: project creation, task creation, plan approval, provider adapter,
budget ceiling, task execution, result persistence, failure handling.
All run against the deterministic fake provider — no network, no spend.
"""
from __future__ import annotations

import pytest

from app import budget, orchestrator
from app.budget import BudgetExceeded
from app.models import Approval, Plan, Project, Task
from app.orchestrator import _validate_plan_tasks
from app.providers.base import ProviderError, get_provider
from app.providers.fake import FakeProvider
from app.worker import execute_task, run_once

MISSION = "Compare LangGraph, CrewAI, and AutoGen for building a multi-agent AI application."


# ── 1. project creation ─────────────────────────────────────────────────

def test_create_project_ok(client):
    r = client.post("/api/projects", json={"objective": MISSION})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["objective"] == MISSION
    assert body["status"] == "draft"
    assert body["budget_ceiling_usd"] > 0


def test_create_project_rejects_empty(client):
    r = client.post("/api/projects", json={"objective": "   "})
    assert r.status_code == 400


def test_create_project_rejects_too_long(client):
    r = client.post("/api/projects", json={"objective": "x" * 2001})
    assert r.status_code in (400, 422)


# ── 2/3. plan generation + approval ─────────────────────────────────────

def _make_project_with_plan(db) -> Project:
    p = orchestrator.create_project(db, MISSION)
    plan = orchestrator.request_plan(db, p.id)
    orchestrator.generate_plan(db, FakeProvider(), plan)
    return p


def test_plan_generation_produces_valid_plan(db):
    p = _make_project_with_plan(db)
    plan = db.query(Plan).filter(Plan.project_id == p.id).one()
    assert plan.status == "pending_approval"
    assert len(plan.tasks_json) == 4
    kinds = [t["kind"] for t in plan.tasks_json]
    assert kinds.count("research") == 3 and kinds.count("synthesis") == 1
    # an approval gate was opened for the human
    ap = db.query(Approval).filter(Approval.plan_id == plan.id).one()
    assert ap.gate == "plan" and ap.status == "pending"


def test_plan_validation_rejects_exposure_violation():
    bad = [{"name": "Bad", "kind": "research", "network": True, "privateData": True,
            "tools": [], "costCeiling": 0.5}]
    with pytest.raises(ValueError, match="exposure violation"):
        _validate_plan_tasks(bad)


def test_plan_validation_rejects_too_many_tasks():
    many = [{"name": f"t{i}", "kind": "research", "network": True, "privateData": False,
             "tools": [], "costCeiling": 0.5} for i in range(9)]
    with pytest.raises(ValueError, match="cap"):
        _validate_plan_tasks(many)


def test_approve_plan_creates_tasks(db):
    p = _make_project_with_plan(db)
    ap = db.query(Approval).filter(Approval.project_id == p.id).one()
    orchestrator.approve_plan(db, ap.id)
    tasks = db.query(Task).filter(Task.project_id == p.id).order_by(Task.created_at).all()
    assert len(tasks) == 4
    synth = [t for t in tasks if t.kind == "synthesis"][0]
    research_ids = {t.id for t in tasks if t.kind == "research"}
    assert set(synth.depends_on) == research_ids  # synthesis waits for research
    db.refresh(p)
    assert p.status == "active"


def test_reject_plan_returns_to_draft(db):
    p = _make_project_with_plan(db)
    ap = db.query(Approval).filter(Approval.project_id == p.id).one()
    orchestrator.reject_plan(db, ap.id, "too expensive")
    db.refresh(p)
    assert p.status == "draft"
    assert db.query(Task).filter(Task.project_id == p.id).count() == 0


def test_approve_via_api(client, db):
    r = client.post("/api/projects", json={"objective": MISSION})
    pid = r.json()["id"]
    client.post(f"/api/projects/{pid}/plan")
    # worker would do this; drive it directly with the fake provider
    plan = db.query(Plan).filter(Plan.project_id == pid).one()
    orchestrator.generate_plan(db, FakeProvider(), plan)
    ap = db.query(Approval).filter(Approval.project_id == pid).one()
    r = client.post(f"/api/approvals/{ap.id}/approve")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "approved"
    r = client.get(f"/api/projects/{pid}/tasks")
    assert len(r.json()) == 4


# ── 4. provider adapter ─────────────────────────────────────────────────

def test_provider_factory_returns_fake_when_unset(monkeypatch):
    import app.config as cfg

    monkeypatch.setattr(cfg.settings, "provider", "fake")
    assert get_provider().name == "fake"
    monkeypatch.setattr(cfg.settings, "provider", "nope")
    with pytest.raises(ValueError, match="Unknown PROVIDER"):
        get_provider()


def test_fake_provider_is_deterministic():
    f = FakeProvider()
    a = f.complete(system="s", prompt="research x", max_tokens=100)
    b = f.complete(system="s", prompt="research x", max_tokens=100)
    assert a.text == b.text and a.cost_usd == b.cost_usd and a.cost_usd > 0


def test_fake_provider_plan_json_parses():
    f = FakeProvider()
    r = f.complete(system="You are the Planner. Output strict JSON plan.", prompt="x", max_tokens=1500)
    import json
    tasks = _validate_plan_tasks(json.loads(r.text)["tasks"])
    assert len(tasks) == 4


# ── 5. budget ceiling ───────────────────────────────────────────────────

def test_ceiling_blocks_before_call():
    p = Project(objective="x", budget_ceiling_usd=0.000001, budget_spent_usd=0.0)
    with pytest.raises(BudgetExceeded):
        budget.check_before_call(p, estimate_usd=0.01)


def test_ceiling_allows_within_budget():
    p = Project(objective="x", budget_ceiling_usd=2.0, budget_spent_usd=0.0)
    budget.check_before_call(p, estimate_usd=0.01)  # no raise
    budget.record_spend(p, 0.01)
    assert p.budget_spent_usd == pytest.approx(0.01)


def test_worker_stops_task_on_ceiling(db, monkeypatch):
    p = orchestrator.create_project(db, MISSION)
    p.budget_ceiling_usd = 0.0000001  # absurdly small: any call breaches
    db.commit()
    plan = orchestrator.request_plan(db, p.id)
    orchestrator.generate_plan(db, FakeProvider(), plan)
    # plan generation itself should have failed on the ceiling
    db.refresh(plan)
    assert plan.status == "failed"
    assert "ceiling" in (plan.failure_reason or "").lower()


# ── 6/7. task execution + result persistence ────────────────────────────

def _approved_project(db) -> Project:
    p = _make_project_with_plan(db)
    ap = db.query(Approval).filter(Approval.project_id == p.id).one()
    orchestrator.approve_plan(db, ap.id)
    return p


def test_research_task_executes_and_persists(db):
    p = _approved_project(db)
    task = db.query(Task).filter(Task.project_id == p.id, Task.kind == "research").first()
    execute_task(db, FakeProvider(), task)
    db.refresh(task)
    assert task.status == "completed"
    assert task.result and len(task.result) > 20
    assert task.cost_usd > 0
    assert task.input_tokens > 0 and task.output_tokens > 0
    db.refresh(p)
    assert p.budget_spent_usd > 0


def test_synthesis_waits_for_research_deps(db):
    p = _approved_project(db)
    synth = db.query(Task).filter(Task.project_id == p.id, Task.kind == "synthesis").one()
    # research not done → worker must not pick up synthesis
    import app.worker as wmod
    assert wmod._deps_completed(db, synth) is False


def test_full_mission_with_fake_provider(db, db_engine, monkeypatch):
    """End-to-end with the fake provider: the whole golden path completes."""
    import app.worker as wmod
    from sqlalchemy.orm import sessionmaker

    # the worker gets its own sessions from the same test database
    factory = sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(wmod, "SessionLocal", factory)

    p = _approved_project(db)
    pid = p.id
    for _ in range(20):  # worker iterations until quiescent
        run_once(FakeProvider())
        db.expire_all()
        remaining = db.query(Task).filter(
            Task.project_id == pid, Task.status.notin_(["completed"])).count()
        if remaining == 0:
            break
    tasks = db.query(Task).filter(Task.project_id == pid).all()
    assert len(tasks) == 4
    assert all(t.status == "completed" for t in tasks), [(t.name, t.status) for t in tasks]
    synth = [t for t in tasks if t.kind == "synthesis"][0]
    assert synth.result and "SYNTHESIS" in synth.result
    proj = db.get(Project, pid)
    assert proj.status == "completed"
    assert proj.budget_spent_usd > 0
    # activity/audit trail recorded
    from app.models import ActivityEvent
    kinds = {e.kind for e in db.query(ActivityEvent).filter(ActivityEvent.project_id == pid)}
    assert {"plan", "approval", "start", "complete", "system"} <= kinds


# ── 8. failure handling ─────────────────────────────────────────────────

class BrokenProvider(FakeProvider):
    name = "broken"

    def complete(self, *, system, prompt, max_tokens):
        raise ProviderError("401 unauthorized — bad API key")


def test_provider_failure_marks_task_failed_no_fake_result(db):
    p = _approved_project(db)
    task = db.query(Task).filter(Task.project_id == p.id, Task.kind == "research").first()
    execute_task(db, BrokenProvider(), task)
    db.refresh(task)
    assert task.status == "failed"
    assert task.result is None  # NEVER a silent fake result
    assert "Provider error" in (task.failure_reason or "")


def test_retry_failed_task_via_api(client, db):
    p = _approved_project(db)
    task = db.query(Task).filter(Task.project_id == p.id, Task.kind == "research").first()
    execute_task(db, BrokenProvider(), task)
    r = client.post(f"/api/tasks/{task.id}/retry")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "ready"


def test_run_snapshot_shape(client, db):
    p = _approved_project(db)
    r = client.get(f"/api/projects/{p.id}/run")
    assert r.status_code == 200, r.text
    body = r.json()
    assert {"project", "plan", "tasks", "events", "approvals"} <= set(body)
    assert len(body["tasks"]) == 4
    assert body["project"]["budget_ceiling_usd"] > 0
