"""Task scheduler — recurring jobs that run through the Agent (Phase 8).

Job definitions are persisted in SQLite and reloaded on startup, so a morning
briefing survives restarts. Each job hands a prompt to the same Agent used for
conversation, then announces the result (spoken if a voice backend is available,
and always pushed to the HUD via a ``notify`` event).

APScheduler is optional: without it the scheduler logs and disables itself; the
rest of JARVIS is unaffected.
"""

from .store import ScheduledTask, TaskStore
from .tasks import TaskScheduler

__all__ = ["TaskScheduler", "TaskStore", "ScheduledTask"]
