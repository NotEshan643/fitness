"""UI layer — Iron-Man HUD dashboard + system tray (Phase 7).

A PySide6 dark, futuristic HUD subscribing to the event bus: status, mic state,
live transcript (with a text input), a memory browser/editor, tool/activity feed
and live system info. A ``QSystemTrayIcon`` keeps JARVIS resident and toggles
the HUD. Launch with ``python -m jarvis --ui``.

``theme`` is Qt-free and always importable; ``dashboard``/``tray`` require
PySide6 and are imported lazily by the orchestrator (falls back to text mode).
"""

from . import theme

__all__ = ["theme"]
