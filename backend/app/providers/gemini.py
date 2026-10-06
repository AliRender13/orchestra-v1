"""Google Gemini provider adapter — Generative Language API.

- Base URL: https://generativelanguage.googleapis.com/v1beta (Google's API reference)
- Auth: the connected `custom.gemini` credential via authd surrogate exchange.
  The adapter never sees the raw key: it sends an `hsurr:*` surrogate in the
  `x-goog-api-key` header and the egress layer swaps in the real credential.
  Surrogates are only ever sent to generativelanguage.googleapis.com.
  (Dev fallback: PROVIDER_API_KEY env, server-side only.)
- Endpoint: POST /v1beta/models/{model}:generateContent
- Free tier (confirmed on Google's official pricing page, Oct 2026): free input &
  output tokens within rate limits, no billing required. Caveat: free-tier
  content may be used to improve Google's products — fine for this prototype.
"""
from __future__ import annotations

import importlib.util
import os
from urllib.parse import urlparse

import httpx

from ..config import settings
from .base import ProviderAdapter, ProviderError, ProviderResult

_API_BASE = "https://generativelanguage.googleapis.com"
_API_HOST = "generativelanguage.googleapis.com"
_CREDENTIAL_NAME = "custom.gemini"
_HELPER_PATH = "/opt/hatch/skills/skill-creator/bin/dynamic_credentials.py"
_CA_BUNDLE = "/run/hatch/egress-tls/ca-bundle.pem"

# Responsive free-tier Flash model. Override with PROVIDER_MODEL.
# (gemini-2.5-flash was retired for new users; gemini-3.8-flash is currently
# capacity-constrained with 503s; the lite alias answers reliably.)
DEFAULT_MODEL = "gemini-flash-lite-latest"


def _load_dc():
    spec = importlib.util.spec_from_file_location("dynamic_credentials", _HELPER_PATH)
    if spec is None or spec.loader is None:
        raise ProviderError(f"Credential helper not found at {_HELPER_PATH}.")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class GeminiProvider(ProviderAdapter):
    name = "gemini"

    def __init__(self) -> None:
        self._model = settings.provider_model or DEFAULT_MODEL
        self._env_key = settings.provider_api_key  # dev fallback only

    def _auth_headers(self, url: str) -> dict[str, str]:
        host = (urlparse(url).hostname or "").lower()
        if host != _API_HOST:
            raise ProviderError(f"Refusing to send Gemini credentials to {host}.")
        # Primary: connected vault credential via authd surrogate exchange.
        try:
            dc = _load_dc()
            entry = dc.dynamic_credential_entry(_CREDENTIAL_NAME, "access_token")
            surrogate = str(entry.get("surrogate", "")).strip()
            placement = entry.get("placement")
            if not surrogate.startswith("hsurr:"):
                raise ProviderError("authd returned a non-surrogate credential value.")
            if isinstance(placement, dict) and isinstance(placement.get("custom_header"), str):
                return {placement["custom_header"]: surrogate}
            raise ProviderError(f"Unsupported credential placement: {placement!r}")
        except ProviderError:
            raise
        except Exception as e:
            if self._env_key:
                return {"x-goog-api-key": self._env_key}
            raise ProviderError(f"Gemini credential unavailable (authd: {e}).")

    def complete(self, *, system: str, prompt: str, max_tokens: int) -> ProviderResult:
        url = f"{_API_BASE}/v1beta/models/{self._model}:generateContent"
        headers = self._auth_headers(url)
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.2},
        }
        try:
            # trust_env=False: this machine's no_proxy value breaks httpx's env
            # parsing (bracketed IPv6). The egress proxy is set explicitly so
            # the surrogate credential is swapped on the approved path; its
            # CA bundle is needed because the proxy terminates TLS.
            proxy = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
            verify = _CA_BUNDLE if os.path.exists(_CA_BUNDLE) else True
            # Generous timeout: the free tier can be slow under load.
            with httpx.Client(timeout=300.0, trust_env=False, proxy=proxy, verify=verify) as client:
                resp = client.post(url, headers=headers, json=body)
        except httpx.HTTPError as e:
            raise ProviderError(f"Gemini request failed (network): {e}") from e

        if resp.status_code != 200:
            try:
                detail = resp.json().get("error", {}).get("message", "")
            except Exception:
                detail = ""
            raise ProviderError(
                f"Gemini error {resp.status_code}: {detail[:300] or resp.text[:300]}"
            )

        try:
            data = resp.json()
            cand = data["candidates"][0]
            parts = cand.get("content", {}).get("parts", [])
            text = "".join(p.get("text", "") for p in parts)
            usage = data.get("usageMetadata", {}) or {}
            in_tok = int(usage.get("promptTokenCount", 0))
            out_tok = int(usage.get("candidatesTokenCount", 0))
        except (KeyError, IndexError, TypeError, ValueError) as e:
            raise ProviderError(f"Gemini returned an unexpected response shape: {e}") from e

        if not text.strip():
            reason = cand.get("finishReason", "unknown")
            raise ProviderError(f"Gemini returned no text (finishReason={reason}).")

        # Free tier: nothing is spent. Cost accounting stays honest at $0.00;
        # the hard dev ceiling remains as a backstop.
        return ProviderResult(
            text=text,
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_usd=0.0,
            model=data.get("modelVersion", self._model),
        )

    def _worst_case_cost(self, input_tokens: int, max_output_tokens: int) -> float:
        # Free tier — worst case is $0. The ceiling check still runs; it just
        # never trips on cost while the key is on the free tier.
        return 0.0
