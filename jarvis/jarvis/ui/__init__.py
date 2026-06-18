"""UI layer — Iron-Man HUD dashboard + system tray (Phase 7).

A PySide6 dark, futuristic HUD subscribing to the event bus: current status,
microphone state, live transcript, memory browser/editor, scheduled tasks,
system info and notifications. A ``QSystemTrayIcon`` keeps JARVIS resident; a
global hotkey toggles the HUD.
"""
