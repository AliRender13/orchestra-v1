"""Provider adapter interface. All provider access goes through this.

The frontend never sees keys. The worker never imports a provider SDK
directly — it calls `get_provider().complete(...)`.

A new real provider = one new module implementing this ABC + a
`PROVIDER=<name>` env choice. No other code changes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ProviderResult:
    text: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    model: str


class ProviderError(Exception):
    """Raised for any provider failure: auth, rate limit, network, bad response.

    The worker catches this and marks the task failed — it NEVER silently
    substitutes a fake result.
    """


class ProviderAdapter(ABC):
    name: str = "base"

    @abstractmethod
    def complete(self, *, system: str, prompt: str, max_tokens: int) -> ProviderResult:
        """One chat completion. Raises ProviderError on any failure."""
        raise NotImplementedError

    def estimate_cost_usd(self, prompt_text: str, max_tokens: int) -> float:
        """Worst-case cost estimate BEFORE calling. Used for ceiling checks."""
        prompt_tokens = max(1, len(prompt_text) // 4)
        return self._worst_case_cost(prompt_tokens, max_tokens)

    def _worst_case_cost(self, input_tokens: int, max_output_tokens: int) -> float:
        raise NotImplementedError


def get_provider() -> ProviderAdapter:
    """Factory. Reads PROVIDER env; the real adapter is chosen at startup."""
    from ..config import settings

    name = settings.provider
    if name == "fake":
        from .fake import FakeProvider

        return FakeProvider()
    if name == "anthropic":
        from .anthropic import AnthropicProvider

        return AnthropicProvider()
    if name == "openai":
        from .openai_provider import OpenAIProvider

        return OpenAIProvider()
    if name == "deepseek":
        from .deepseek import DeepSeekProvider

        return DeepSeekProvider()
    if name == "gemini":
        from .gemini import GeminiProvider

        return GeminiProvider()
    raise ValueError(f"Unknown PROVIDER={name!r}. Use fake|anthropic|openai|deepseek|gemini.")
