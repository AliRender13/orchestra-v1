"""Orchestra V1 API — first vertical slice.

Thin HTTP layer over the orchestrator. No business logic here beyond
request/response shaping. Provider keys never leave the server.
"""
from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import orchestrator
from .config import settings
from .db import get_db, init_db
from .models import ActivityEvent, Approval, Plan, Project, Task
from .schemas import (
    ApprovalDecide,
    ApprovalOut,
    EventOut,
    HealthOut,
    PlanOut,
    PlanTaskOut,
    ProjectCreate,
    ProjectOut,
    RunOut,
    TaskOut,
)

app = FastAPI(title="Orchestra V1", version="0.1.0")

if settings.cors_allow_all:
    # DEV ONLY: the demo is a single HTML file (origin "null").
    # Tighten before any real deployment.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
def _startup() -> None:
    init_db()


# ── shaping helpers ─────────────────────────────────────────────────────

def _plan_out(p: Plan) -> PlanOut:
    return PlanOut(
        id=p.id,
        project_id=p.project_id,
        version=p.version,
        status=p.status,
        cost_ceiling_usd=p.cost_ceiling_usd,
        tasks=[PlanTaskOut(**t) for t in (p.tasks_json or [])],
        failure_reason=p.failure_reason,
    )


def _task_out(t: Task) -> TaskOut:
    return TaskOut(
        id=t.id, project_id=t.project_id, name=t.name, kind=t.kind,
        status=t.status, progress=t.progress, depends_on=t.depends_on or [],
        result=t.result, artifacts=t.artifacts or [], failure_reason=t.failure_reason,
        cost_usd=t.cost_usd, input_tokens=t.input_tokens, output_tokens=t.output_tokens,
    )


def _approval_out(a: Approval) -> ApprovalOut:
    return ApprovalOut(
        id=a.id, project_id=a.project_id, plan_id=a.plan_id, gate=a.gate,
        title=a.title, description=a.description, reason=a.reason,
        status=a.status, requested_at=a.requested_at,
    )


def _get_project(db: Session, project_id: str) -> Project:
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found.")
    return p


# ── health ──────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthOut)
def health():
    return HealthOut(
        ok=True,
        provider=settings.provider,
        provider_configured=_provider_configured(),
        ceiling_usd=settings.dev_budget_ceiling_usd,
    )


def _provider_configured() -> bool:
    if settings.provider == "fake":
        return True
    if settings.provider_api_key:
        return True
    if settings.provider == "gemini":
        # Gemini uses the connected vault credential via authd surrogate
        # exchange — no PROVIDER_API_KEY needed.
        import os

        sock = os.environ.get("JARVIS_AUTHD_SOCK", "/run/hatch/auth/authd.sock")
        return os.path.exists(sock)
    return False


# ── projects ────────────────────────────────────────────────────────────

@app.post("/api/projects", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    try:
        p = orchestrator.create_project(db, body.objective)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return ProjectOut(**{c: getattr(p, c) for c in
                         ("id", "objective", "status", "budget_ceiling_usd", "budget_spent_usd", "created_at")})


@app.get("/api/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    ps = db.query(Project).order_by(Project.created_at.desc()).all()
    return [ProjectOut(**{c: getattr(p, c) for c in
                          ("id", "objective", "status", "budget_ceiling_usd", "budget_spent_usd", "created_at")})
            for p in ps]


@app.get("/api/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    return ProjectOut(**{c: getattr(p, c) for c in
                         ("id", "objective", "status", "budget_ceiling_usd", "budget_spent_usd", "created_at")})


# ── plan ────────────────────────────────────────────────────────────────

@app.post("/api/projects/{project_id}/plan", response_model=PlanOut, status_code=202)
def request_plan(project_id: str, db: Session = Depends(get_db)):
    _get_project(db, project_id)
    try:
        plan = orchestrator.request_plan(db, project_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return _plan_out(plan)


@app.get("/api/projects/{project_id}/plan", response_model=PlanOut | None)
def get_plan(project_id: str, db: Session = Depends(get_db)):
    _get_project(db, project_id)
    plan = (
        db.query(Plan).filter(Plan.project_id == project_id)
        .order_by(Plan.version.desc()).first()
    )
    return _plan_out(plan) if plan else None


# ── approvals ───────────────────────────────────────────────────────────

@app.get("/api/approvals", response_model=list[ApprovalOut])
def list_approvals(project_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Approval).order_by(Approval.requested_at.desc())
    if project_id:
        q = q.filter(Approval.project_id == project_id)
    return [_approval_out(a) for a in q.all()]


@app.post("/api/approvals/{approval_id}/approve", response_model=PlanOut)
def approve(approval_id: str, db: Session = Depends(get_db)):
    try:
        plan = orchestrator.approve_plan(db, approval_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return _plan_out(plan)


@app.post("/api/approvals/{approval_id}/reject")
def reject(approval_id: str, body: ApprovalDecide, db: Session = Depends(get_db)):
    try:
        orchestrator.reject_plan(db, approval_id, body.note)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


# ── tasks ───────────────────────────────────────────────────────────────

@app.get("/api/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(project_id: str, db: Session = Depends(get_db)):
    _get_project(db, project_id)
    tasks = db.query(Task).filter(Task.project_id == project_id).order_by(Task.created_at).all()
    return [_task_out(t) for t in tasks]


@app.post("/api/tasks/{task_id}/retry", response_model=TaskOut)
def retry_task(task_id: str, db: Session = Depends(get_db)):
    t = db.get(Task, task_id)
    if not t:
        raise HTTPException(404, "Task not found.")
    if t.status != "failed":
        raise HTTPException(400, "Only failed tasks can be retried.")
    t.status = "ready"
    t.progress = 0
    t.failure_reason = None
    orchestrator.log_event(db, t.project_id, "system", f"{t.name} queued for retry.")
    db.commit()
    db.refresh(t)
    return _task_out(t)


@app.post("/api/tasks/{task_id}/pause", response_model=TaskOut)
def pause_task(task_id: str, db: Session = Depends(get_db)):
    t = db.get(Task, task_id)
    if not t:
        raise HTTPException(404, "Task not found.")
    if t.status not in ("ready", "running"):
        raise HTTPException(400, f"Cannot pause a {t.status} task.")
    t.status = "paused"
    orchestrator.log_event(db, t.project_id, "system", f"{t.name} paused by you.")
    db.commit()
    db.refresh(t)
    return _task_out(t)


@app.post("/api/tasks/{task_id}/resume", response_model=TaskOut)
def resume_task(task_id: str, db: Session = Depends(get_db)):
    t = db.get(Task, task_id)
    if not t:
        raise HTTPException(404, "Task not found.")
    if t.status != "paused":
        raise HTTPException(400, f"Cannot resume a {t.status} task.")
    t.status = "ready"
    orchestrator.log_event(db, t.project_id, "system", f"{t.name} resumed.")
    db.commit()
    db.refresh(t)
    return _task_out(t)


# ── project controls ────────────────────────────────────────────────────

@app.post("/api/projects/{project_id}/pause")
def pause_project(project_id: str, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    if p.status != "active":
        raise HTTPException(400, f"Cannot pause a {p.status} project.")
    p.status = "paused"
    orchestrator.log_event(db, p.id, "system", "Project paused by you.")
    db.commit()
    return {"ok": True, "status": p.status}


@app.post("/api/projects/{project_id}/resume")
def resume_project(project_id: str, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    if p.status != "paused":
        raise HTTPException(400, f"Cannot resume a {p.status} project.")
    p.status = "active"
    orchestrator.log_event(db, p.id, "system", "Project resumed.")
    db.commit()
    return {"ok": True, "status": p.status}


@app.post("/api/projects/{project_id}/cancel")
def cancel_project(project_id: str, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    if p.status not in ("active", "paused", "awaiting_plan"):
        raise HTTPException(400, f"Cannot cancel a {p.status} project.")
    p.status = "cancelled"
    orchestrator.log_event(
        db, p.id, "system",
        f"Project cancelled. Spent ${p.budget_spent_usd:.4f} of ${p.budget_ceiling_usd:.2f} ceiling.",
    )
    db.commit()
    return {"ok": True, "status": p.status}


# ── run snapshot + activity ─────────────────────────────────────────────

@app.get("/api/projects/{project_id}/run", response_model=RunOut)
def get_run(project_id: str, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    plan = (
        db.query(Plan).filter(Plan.project_id == project_id)
        .order_by(Plan.version.desc()).first()
    )
    tasks = db.query(Task).filter(Task.project_id == project_id).order_by(Task.created_at).all()
    events = (
        db.query(ActivityEvent).filter(ActivityEvent.project_id == project_id)
        .order_by(ActivityEvent.created_at).all()
    )
    approvals = (
        db.query(Approval).filter(Approval.project_id == project_id)
        .order_by(Approval.requested_at).all()
    )
    return RunOut(
        project=ProjectOut(**{c: getattr(p, c) for c in
                              ("id", "objective", "status", "budget_ceiling_usd", "budget_spent_usd", "created_at")}),
        plan=_plan_out(plan) if plan else None,
        tasks=[_task_out(t) for t in tasks],
        events=[EventOut(id=e.id, kind=e.kind, role=e.role, text=e.text, created_at=e.created_at) for e in events],
        approvals=[_approval_out(a) for a in approvals],
    )


@app.get("/api/projects/{project_id}/activity", response_model=list[EventOut])
def list_activity(project_id: str, db: Session = Depends(get_db)):
    _get_project(db, project_id)
    events = (
        db.query(ActivityEvent).filter(ActivityEvent.project_id == project_id)
        .order_by(ActivityEvent.created_at).all()
    )
    return [EventOut(id=e.id, kind=e.kind, role=e.role, text=e.text, created_at=e.created_at) for e in events]
