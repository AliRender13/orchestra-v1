"""Hard development spending ceiling.

Rule: BEFORE every provider call, estimate the worst-case cost. If
spent + estimate > ceiling, STOP — mark the work failed with a clear
reason. Never exceed, never silently continue.
"""
from __future__ import annotations

from .config import settings
from .models import Project


class BudgetExceeded(Exception):
    """Raised when a provider call would breach the hard ceiling."""


def ceiling_usd(project: Project) -> float:
    return project.budget_ceiling_usd or settings.dev_budget_ceiling_usd


def check_before_call(project: Project, estimate_usd: float) -> None:
    """Raise BudgetExceeded if this call would breach the ceiling."""
    limit = ceiling_usd(project)
    if project.budget_spent_usd + estimate_usd > limit:
        raise BudgetExceeded(
            f"Hard ceiling ${limit:.2f} would be exceeded "
            f"(spent ${project.budget_spent_usd:.4f} + est. ${estimate_usd:.4f}). Stopping."
        )


def record_spend(project: Project, actual_usd: float) -> None:
    project.budget_spent_usd = round(project.budget_spent_usd + actual_usd, 6)
