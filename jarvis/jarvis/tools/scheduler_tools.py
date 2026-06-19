"""Tools that let JARVIS manage its own recurring tasks by voice/text.

"Jarvis, give me a news briefing every morning at 8" → schedule_task with a
cron schedule. The scheduler instance is provided via the ToolContext extras.
"""

from __future__ import annotations

from typing import Any

from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult


def _scheduler(ctx: ToolContext):
    return ctx.extras.get("scheduler")


def _schedule_task(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    sched = _scheduler(ctx)
    if sched is None or not sched.available:
        return ToolResult(text="The scheduler isn't running (install APScheduler).", ok=False)
    trigger = args.get("trigger", "cron")
    schedule = args.get("schedule", {})
    if not isinstance(schedule, dict) or not schedule:
        return ToolResult(text="A schedule object is required (e.g. {'hour':8}).", ok=False)
    tid = sched.add_task(
        name=args["name"], prompt=args["prompt"], trigger=trigger,
        schedule=schedule, speak=bool(args.get("speak", True)),
    )
    return ToolResult(text=f"Scheduled '{args['name']}' (task #{tid}).", data={"id": tid})


def _list_tasks(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    sched = _scheduler(ctx)
    if sched is None:
        return ToolResult(text="The scheduler isn't running.", ok=False)
    tasks = sched.store.all()
    if not tasks:
        return ToolResult(text="No scheduled tasks.")
    body = "\n".join(
        f"#{t.id} {t.name} [{t.trigger} {t.schedule}]"
        + ("" if t.enabled else " (disabled)")
        for t in tasks
    )
    return ToolResult(text=body)


def _cancel_task(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    sched = _scheduler(ctx)
    if sched is None:
        return ToolResult(text="The scheduler isn't running.", ok=False)
    ok = sched.remove_task(int(args["task_id"]))
    return ToolResult(text="Task cancelled." if ok else "No such task.", ok=ok)


def register(reg) -> None:
    reg.add(Tool(
        name="schedule_task",
        description=(
            "Create a recurring task that runs an instruction on a schedule. "
            "Use trigger='cron' with {hour,minute,day_of_week} for daily/weekly "
            "jobs, or trigger='interval' with {minutes} or {hours}."
        ),
        parameters={"type": "object", "properties": {
            "name": {"type": "string"},
            "prompt": {"type": "string", "description": "What JARVIS should do."},
            "trigger": {"type": "string", "enum": ["cron", "interval"]},
            "schedule": {"type": "object", "description": "Trigger kwargs, e.g. {'hour':8,'minute':0}."},
            "speak": {"type": "boolean"}},
            "required": ["name", "prompt", "schedule"]},
        handler=_schedule_task, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="list_tasks", description="List all scheduled recurring tasks.",
        parameters={"type": "object", "properties": {}},
        handler=_list_tasks, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="cancel_task", description="Cancel a scheduled task by id.",
        parameters={"type": "object", "properties": {"task_id": {"type": "integer"}},
                    "required": ["task_id"]},
        handler=_cancel_task, risk=RiskLevel.CONFIRM,
        confirm_summary=lambda a: f"cancel task #{a.get('task_id')}",
    ))
