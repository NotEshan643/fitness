"""Phase 8 tests: task store CRUD, trigger building, and tool wiring."""

from __future__ import annotations

import os
import tempfile

os.environ.setdefault("JARVIS_HOME", tempfile.mkdtemp())

from jarvis.app import JarvisApp  # noqa: E402
from jarvis.memory.database import Database  # noqa: E402
from jarvis.scheduler.store import TaskStore  # noqa: E402
from jarvis.scheduler.tasks import build_trigger  # noqa: E402
from jarvis.tools.base import ToolContext  # noqa: E402


def test_task_store_crud():
    db = Database(db_path=tempfile.mktemp(suffix=".db"))
    store = TaskStore(db)
    tid = store.add("Morning briefing", "Give me a news briefing.", "cron",
                    {"hour": 8, "minute": 0}, speak=True)
    task = store.get(tid)
    assert task and task.name == "Morning briefing"
    assert task.schedule == {"hour": 8, "minute": 0}
    assert len(store.all()) == 1
    assert store.remove(tid)
    assert store.get(tid) is None


def test_build_trigger_cron_and_interval():
    from jarvis.scheduler.store import ScheduledTask

    cron = ScheduledTask(1, "x", "p", "cron", {"hour": 8}, True, True)
    interval = ScheduledTask(2, "y", "p", "interval", {"minutes": 30}, True, True)
    # Constructs without raising; type names confirm the right trigger.
    assert type(build_trigger(cron)).__name__ == "CronTrigger"
    assert type(build_trigger(interval)).__name__ == "IntervalTrigger"


def test_scheduler_tools_registered_and_usable():
    app = JarvisApp()
    for name in ("schedule_task", "list_tasks", "cancel_task"):
        assert app.registry.get(name) is not None

    ctx = ToolContext(settings=app.settings, memory=app.memory, events=app.events,
                      extras=app.agent.tool_extras)
    r = app.registry.dispatch(
        "schedule_task",
        {"name": "Hydrate", "prompt": "Remind me to drink water.",
         "trigger": "interval", "schedule": {"hours": 2}},
        ctx,
    )
    assert r.ok, r.text
    listed = app.registry.dispatch("list_tasks", {}, ctx)
    assert "Hydrate" in listed.text
    app.shutdown()


if __name__ == "__main__":
    test_task_store_crud()
    try:
        test_build_trigger_cron_and_interval()
    except ImportError:
        print("(APScheduler not installed; skipping trigger test)")
    test_scheduler_tools_registered_and_usable()
    print("ALL SCHEDULER TESTS PASSED")
