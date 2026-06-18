"""Tool primitives.

A :class:`Tool` is a named callable with a JSON-schema for its arguments and a
risk level. :class:`ToolContext` carries the shared services a tool may need
(memory, settings, event bus) so tools stay free of global state. Tools return a
:class:`ToolResult` whose ``text`` is fed back to the model.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Callable

from ..security.permissions import RiskLevel

if TYPE_CHECKING:  # avoid import cycles at runtime
    from ..core.config import Settings
    from ..core.events import EventBus
    from ..memory.longterm import LongTermMemory


@dataclass
class ToolContext:
    settings: "Settings"
    memory: "LongTermMemory"
    events: "EventBus"
    extras: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolResult:
    text: str
    ok: bool = True
    data: dict[str, Any] | None = None


# A handler receives the parsed args and the context, returns a result.
Handler = Callable[[dict[str, Any], ToolContext], ToolResult]


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]          # JSON schema for arguments
    handler: Handler
    risk: RiskLevel = RiskLevel.SAFE
    confirm_summary: Callable[[dict[str, Any]], str] | None = None

    def schema(self) -> dict[str, Any]:
        """Anthropic tool definition."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters,
        }

    def summarize(self, args: dict[str, Any]) -> str:
        if self.confirm_summary:
            return self.confirm_summary(args)
        return f"{self.name}({args})"
