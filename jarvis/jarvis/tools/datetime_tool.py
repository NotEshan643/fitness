"""Time/date awareness — small but used constantly (greetings, scheduling)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult


def _now(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    now = datetime.now().astimezone()
    return ToolResult(
        text=now.strftime("%A, %d %B %Y, %H:%M %Z"),
        data={"iso": now.isoformat()},
    )


def register(reg) -> None:
    reg.add(
        Tool(
            name="current_datetime",
            description="Get the current local date, time and weekday.",
            parameters={"type": "object", "properties": {}},
            handler=_now,
            risk=RiskLevel.SAFE,
        )
    )
