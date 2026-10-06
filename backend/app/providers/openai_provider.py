"""OpenAI provider adapter — Chat Completions API.

- Base URL: https://api.openai.com/v1  (from OpenAI's API reference)
- Auth: API key in the Authorization header as `Bearer <key>`
- Endpoint: POST /chat/completions
- The key comes ONLY from the PROVIDER_API_KEY server environment variable.
  It is never logged, never returned by the API, never sent to the frontend.

Cost accounting uses gpt-4o-mini rates; override the model with PROVIDER_MODEL.
"""
from __future__ import annotations

import httpx

from ..config import settings
from .base import ProviderAdapter, ProviderError, ProviderResult

_API_BASE = "https://api.openai.com/v1"

# gpt-4o-mini list prices, USD per 1M tokens.
_RATE_IN = 0.15 / 1_000_000
_RATE_OUT = 0.60 / 1_000_000

DEFAULT_MODEL = "gpt-4o-mini"


class OpenAIProvider(ProviderAdapter):
    name = "openai"

    def __init__(self) -> None:
        key = settings.provider_api_key
        if not key:
            raise ProviderError(
                "PROVIDER_API_KEY is not set. Set it in the server environment; "
                "the key is never accepted from the frontend."
            )
        self._key = key
        self._model = settings.provider_model or DEFAULT_MODEL

    def complete(self, *, system: str, prompt: str, max_tokens: int) -> ProviderResult:
        try:
            with httpx.Client(timeout=120.0) as client:
                resp = client.post(
                    f"{_API_BASE}/chat/completions",
                    headers={"Authorization": f"Bearer {self._key}"},
                    json={
                        "model": self._model,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0.2,
                    },
                )
        except httpx.HTTPError as e:
            raise ProviderError(f"OpenAI request failed (network): {e}") from e

        if resp.status_code != 200:
            try:
                detail = resp.json().get("error", {}).get("message", "")
            except Exception:
                detail = ""
            raise ProviderError(
                f"OpenAI error {resp.status_code}: {detail[:300] or resp.text[:300]}"
            )

        try:
            data = resp.json()
            text = data["choices"][0]["message"]["content"] or ""
            usage = data.get("usage", {}) or {}
            in_tok = int(usage.get("prompt_tokens", 0))
            out_tok = int(usage.get("completion_tokens", 0))
        except (KeyError, IndexError, TypeError, ValueError) as e:
            raise ProviderError(f"OpenAI returned an unexpected response shape: {e}") from e

        if not text.strip():
            raise ProviderError("OpenAI returned an empty response.")

        return ProviderResult(
            text=text,
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_usd=in_tok * _RATE_IN + out_tok * _RATE_OUT,
            model=data.get("model", self._model),
        )

    def _worst_case_cost(self, input_tokens: int, max_output_tokens: int) -> float:
        return input_tokens * _RATE_IN + max_output_tokens * _RATE_OUT
