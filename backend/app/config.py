"""Server-side settings. Everything secret comes from the environment.

Never hardcode keys. Never return them from the API.
"""
from __future__ import annotations

import os


def _f(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://orchestra:orchestra@localhost:5432/orchestra",
    )
    # one of: fake | anthropic | openai | deepseek | gemini
    provider: str = os.getenv("PROVIDER", "fake").lower()
    provider_api_key: str | None = os.getenv("PROVIDER_API_KEY")
    provider_model: str = os.getenv("PROVIDER_MODEL", "")
    # Hard development spending ceiling (USD) for the whole project.
    # When a provider call would exceed it, execution STOPS — no silent fallback.
    dev_budget_ceiling_usd: float = _f("DEV_BUDGET_CEILING_USD", 2.00)
    worker_poll_sec: float = _f("WORKER_POLL_SEC", 3.0)
    # Dev-only CORS: the demo is a single HTML file (origin "null").
    # NOT production-grade — tighten before any real deployment.
    cors_allow_all: bool = os.getenv("CORS_ALLOW_ALL", "1") == "1"


settings = Settings()
