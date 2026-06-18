"""Tools that let JARVIS manage its own long-term memory.

These make "remember / recall / search / forget" first-class model actions, so
JARVIS can durably store preferences, goals and projects mid-conversation.
"""

from __future__ import annotations

from typing import Any

from ..memory.longterm import VALID_KINDS
from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult


def _remember(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    mid = ctx.memory.remember(
        value=args["value"],
        kind=args.get("kind", "fact"),
        key=args.get("key"),
        importance=int(args.get("importance", 3)),
    )
    return ToolResult(text=f"Noted (memory #{mid}).", data={"id": mid})


def _search(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    results = ctx.memory.search(args["query"], limit=int(args.get("limit", 8)))
    if not results:
        return ToolResult(text="No matching memories.")
    body = "\n".join(f"#{m.id} {m.render()}" for m in results)
    return ToolResult(text=body, data={"ids": [m.id for m in results]})


def _forget(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    ok = ctx.memory.forget(int(args["memory_id"]))
    return ToolResult(
        text="Forgotten." if ok else "No such memory.", ok=ok
    )


def register(reg) -> None:
    reg.add(
        Tool(
            name="remember",
            description=(
                "Store a durable fact about the user for long-term recall: a "
                "preference, goal, project, routine, instruction or contact. Use "
                "when the user states something worth remembering across sessions."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "value": {"type": "string", "description": "The fact to store."},
                    "kind": {
                        "type": "string",
                        "enum": sorted(VALID_KINDS),
                        "description": "Category of the memory.",
                    },
                    "key": {"type": "string", "description": "Optional short label."},
                    "importance": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "1 (trivial) to 5 (critical).",
                    },
                },
                "required": ["value"],
            },
            handler=_remember,
            risk=RiskLevel.SAFE,
        )
    )
    reg.add(
        Tool(
            name="search_memory",
            description="Search the user's long-term memory by keyword.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 25},
                },
                "required": ["query"],
            },
            handler=_search,
            risk=RiskLevel.SAFE,
        )
    )
    reg.add(
        Tool(
            name="forget_memory",
            description="Permanently delete a memory by its id.",
            parameters={
                "type": "object",
                "properties": {"memory_id": {"type": "integer"}},
                "required": ["memory_id"],
            },
            handler=_forget,
            risk=RiskLevel.CONFIRM,
            confirm_summary=lambda a: f"delete memory #{a.get('memory_id')}",
        )
    )
