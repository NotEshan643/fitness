"""APScheduler-backed runner for recurring tasks.

Builds triggers from stored task definitions, runs each job through the Agent,
and announces results. The trigger-construction logic is a pure function so it's
unit-testable without a running scheduler.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ..core.logging import get_logger
from .store import ScheduledTask, TaskStore

if TYPE_CHECKING:
    from ..app import JarvisApp

log = get_logger("scheduler")


def build_trigger(task: ScheduledTask):
    """Translate a stored task into an APScheduler trigger.

    cron  → schedule like {"hour": 8, "minute": 0, "day_of_week": "mon-fri"}
    interval → schedule like {"minutes": 30} or {"hours": 1}
    """
    if task.trigger == "interval":
        from apscheduler.triggers.interval import IntervalTrigger

        return IntervalTrigger(**task.schedule)
    from apscheduler.triggers.cron import CronTrigger

    return CronTrigger(**task.schedule)


class TaskScheduler:
    def __init__(self, app: "JarvisApp") -> None:
        self.app = app
        self.store = TaskStore(app.db)
        self._sched = None

    @property
    def available(self) -> bool:
        return self._sched is not None

    def start(self) -> None:
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
        except Exception:
            log.info("APScheduler not installed; recurring tasks disabled.")
            return
        self._sched = BackgroundScheduler(daemon=True)
        for task in self.store.all(enabled_only=True):
            self._schedule(task)
        self._sched.start()
        log.info("Scheduler started with %d task(s)", len(self.store.all(enabled_only=True)))

    def stop(self) -> None:
        if self._sched is not None:
            try:
                self._sched.shutdown(wait=False)
            except Exception:
                pass

    # ── task management ────────────────────────────────────────────────
    def add_task(
        self,
        name: str,
        prompt: str,
        trigger: str,
        schedule: dict[str, Any],
        speak: bool = True,
    ) -> int:
        task_id = self.store.add(name, prompt, trigger, schedule, speak)
        if self._sched is not None:
            self._schedule(self.store.get(task_id))
        return task_id

    def remove_task(self, task_id: int) -> bool:
        if self._sched is not None:
            try:
                self._sched.remove_job(str(task_id))
            except Exception:
                pass
        return self.store.remove(task_id)

    def _schedule(self, task: ScheduledTask) -> None:
        try:
            self._sched.add_job(
                self._run, build_trigger(task), id=str(task.id),
                args=[task.id], replace_existing=True,
            )
        except Exception:
            log.exception("Could not schedule task %s", task.name)

    # ── execution ──────────────────────────────────────────────────────
    def _run(self, task_id: int) -> None:
        task = self.store.get(task_id)
        if task is None or not task.enabled:
            return
        log.info("Running scheduled task: %s", task.name)
        try:
            # Scheduled tasks never auto-confirm destructive actions.
            reply = self.app.agent.respond(task.prompt, confirm=lambda s: False)
        except Exception:
            log.exception("Scheduled task %s failed", task.name)
            return
        self.store.mark_run(task_id)
        self.app.events.emit("notify", text=f"{task.name}: {reply}")
        if task.speak:
            self._announce(reply)

    def _announce(self, text: str) -> None:
        """Best-effort spoken output for a briefing (no-op if no TTS)."""
        try:
            from ..voice.audio import Speaker
            from ..voice.tts import make_tts

            make_tts(self.app.settings, Speaker()).speak(text)
        except Exception:
            log.debug("No TTS available for scheduled announcement")
