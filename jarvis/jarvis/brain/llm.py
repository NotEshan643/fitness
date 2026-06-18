"""Thin wrapper over the Anthropic Messages API.

Isolates the rest of the app from the SDK so the model provider can evolve (or be
mocked in tests) without touching the agent loop. Construction is lazy and
fail-soft: a missing key produces a clear error only when the brain is actually
used.
"""

from __future__ import annotations

from typing import Any

from ..core.config import Settings
from ..core.logging import get_logger

log = get_logger("brain.llm")


class LLMError(RuntimeError):
    pass


class LLMClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client = None

    @property
    def client(self):
        if self._client is None:
            key = self.settings.secrets.anthropic_api_key
            if not key:
                raise LLMError(
                    "ANTHROPIC_API_KEY is not set. Add it to .env, Sir."
                )
            try:
                import anthropic
            except ImportError as exc:  # pragma: no cover
                raise LLMError("The 'anthropic' package is not installed.") from exc
            self._client = anthropic.Anthropic(api_key=key)
        return self._client

    def complete(
        self,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ):
        """One turn of the Messages API. Returns the raw response object.

        ``model`` overrides the default brain model (e.g. a cheaper model for
        background tasks like memory extraction).
        """
        b = self.settings.brain
        try:
            return self.client.messages.create(
                model=model or b.model,
                max_tokens=b.max_tokens,
                temperature=b.temperature,
                system=system,
                messages=messages,
                tools=tools or [],
            )
        except Exception as exc:  # surface a clean, in-character error upstream
            log.exception("Anthropic request failed")
            raise LLMError(str(exc)) from exc
