"""Pydantic request/response shapes. These are the frontend-facing contracts."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    objective: str = Field(min_length=1, max_length=2000)


class ProjectOut(BaseModel):
    id: str
    objective: str
    status: str
    budget_ceiling_usd: float
    budget_spent_usd: float
    created_at: datetime


class PlanTaskOut(BaseModel):
    name: str
    kind: str
    purpose: str = ""
    network: bool
    privateData: bool
    tools: list[str] = []
    costCeiling: float


class PlanOut(BaseModel):
    id: str
    project_id: str
    version: int
    status: str
    cost_ceiling_usd: float
    tasks: list[PlanTaskOut] = []
    failure_reason: str | None = None


class TaskOut(BaseModel):
    id: str
    project_id: str
    name: str
    kind: str
    status: str
    progress: int
    depends_on: list[str] = []
    result: str | None = None
    artifacts: list = []
    failure_reason: str | None = None
    cost_usd: float
    input_tokens: int
    output_tokens: int


class ApprovalOut(BaseModel):
    id: str
    project_id: str
    plan_id: str | None
    gate: str
    title: str
    description: str
    reason: str
    status: str
    requested_at: datetime


class ApprovalDecide(BaseModel):
    note: str = Field(default="", max_length=1000)


class EventOut(BaseModel):
    id: str
    kind: str
    role: str | None
    text: str
    created_at: datetime


class RunOut(BaseModel):
    """Everything the project workspace needs in one call."""
    project: ProjectOut
    plan: PlanOut | None
    tasks: list[TaskOut]
    events: list[EventOut]
    approvals: list[ApprovalOut]


class HealthOut(BaseModel):
    ok: bool
    provider: str
    provider_configured: bool
    ceiling_usd: float
