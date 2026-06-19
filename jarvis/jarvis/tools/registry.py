"""Tool registry — the single source of truth for what JARVIS can do.

The agent loop asks the registry for Anthropic tool schemas and dispatches calls
back through it. Registration is modular: each tool module exposes ``register``,
and :func:`build_default_registry` wires up the phase-appropriate set.
"""

from __future__ import annotations

from ..core.logging import get_logger
from .base import Tool, ToolContext, ToolResult

log = get_logger("tools.registry")


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def add(self, tool: Tool) -> None:
        if tool.name in self._tools:
            log.warning("Tool %s already registered; overwriting", tool.name)
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def names(self) -> list[str]:
        return sorted(self._tools)

    def schemas(self) -> list[dict]:
        return [t.schema() for t in self._tools.values()]

    def dispatch(self, name: str, args: dict, ctx: ToolContext) -> ToolResult:
        tool = self._tools.get(name)
        if tool is None:
            return ToolResult(text=f"Unknown tool: {name}", ok=False)
        return tool.handler(args or {}, ctx)


def build_default_registry() -> ToolRegistry:
    """Register every tool available in the current phase."""
    from . import (
        datetime_tool,
        desktop,
        file_ops,
        files,
        memory_tools,
        scheduler_tools,
        spotify,
        system,
        web,
    )

    reg = ToolRegistry()
    for module in (
        memory_tools,
        files,
        file_ops,
        datetime_tool,
        desktop,
        system,
        web,
        spotify,
        scheduler_tools,
    ):
        module.register(reg)
    log.info("Registered %d tools: %s", len(reg.names()), ", ".join(reg.names()))
    return reg
