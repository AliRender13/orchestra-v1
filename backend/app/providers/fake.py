"""Deterministic fake provider — for tests and offline development ONLY.

It never touches the network and never spends money. The worker only uses
it when PROVIDER=fake. A real-provider failure NEVER falls back to this:
failures surface as task failures with a retry option.
"""
from __future__ import annotations

import json

from .base import ProviderAdapter, ProviderResult


class FakeProvider(ProviderAdapter):
    name = "fake"

    # ~$0.00001 per call — keeps the dev ceiling math honest in tests.
    _RATE_IN = 0.10 / 1_000_000
    _RATE_OUT = 0.20 / 1_000_000

    def complete(self, *, system: str, prompt: str, max_tokens: int) -> ProviderResult:
        low = (system + "\n" + prompt).lower()
        if "output strict json" in low and "plan" in low:
            text = json.dumps(
                {
                    "tasks": [
                        {
                            "name": "Research LangGraph architecture",
                            "kind": "research",
                            "purpose": "Gather facts on LangGraph checkpointing and tool use.",
                            "network": True,
                            "privateData": False,
                            "tools": ["web-search"],
                            "costCeiling": 0.6,
                        },
                        {
                            "name": "Research CrewAI and AutoGen",
                            "kind": "research",
                            "purpose": "Gather facts on CrewAI and AutoGen.",
                            "network": True,
                            "privateData": False,
                            "tools": ["web-search"],
                            "costCeiling": 0.6,
                        },
                        {
                            "name": "Research OpenAI Agents SDK",
                            "kind": "research",
                            "purpose": "Gather facts on the Agents SDK guardrail model.",
                            "network": True,
                            "privateData": False,
                            "tools": ["web-search"],
                            "costCeiling": 0.5,
                        },
                        {
                            "name": "Synthesize comparison matrix",
                            "kind": "synthesis",
                            "purpose": "Combine research into a comparison matrix.",
                            "network": False,
                            "privateData": True,
                            "tools": ["file-reader"],
                            "costCeiling": 0.8,
                        },
                    ]
                }
            )
        elif "synthesis" in low:
            text = (
                "SYNTHESIS (fake): Combining the research briefs — "
                "LangGraph leads on durable execution, CrewAI on team ergonomics, "
                "AutoGen on flexibility. Recommendation: LangGraph for Orchestra."
            )
        else:
            text = (
                "RESEARCH (fake): Findings on the requested topic. "
                "Claim 1: supported by training knowledge. "
                "Claim 2: plausible, needs source check."
            )
        text = text[: max_tokens * 4]
        in_tok = max(1, len(system + prompt) // 4)
        out_tok = max(1, len(text) // 4)
        return ProviderResult(
            text=text,
            input_tokens=in_tok,
            output_tokens=out_tok,
            cost_usd=in_tok * self._RATE_IN + out_tok * self._RATE_OUT,
            model="fake-1",
        )

    def _worst_case_cost(self, input_tokens: int, max_output_tokens: int) -> float:
        return input_tokens * self._RATE_IN + max_output_tokens * self._RATE_OUT
