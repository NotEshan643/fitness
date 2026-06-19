"""System tray presence + the GUI entry point.

JARVIS stays resident in the tray; clicking the icon (or the global-ish toggle)
shows/hides the HUD. The arc-reactor icon is painted at runtime so no binary
asset is shipped. ``run_dashboard`` builds the QApplication, optionally starts
the hands-free voice loop on a background thread, and runs the Qt event loop.
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

from PySide6.QtCore import Qt, QObject, Signal
from PySide6.QtGui import QAction, QColor, QIcon, QPainter, QPixmap
from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon

from ..core.logging import get_logger
from . import theme
from .dashboard import DashboardWindow

if TYPE_CHECKING:
    from ..app import JarvisApp

log = get_logger("ui.tray")


def _arc_reactor_icon() -> QIcon:
    pix = QPixmap(64, 64)
    pix.fill(Qt.transparent)
    p = QPainter(pix)
    p.setRenderHint(QPainter.Antialiasing)
    p.setBrush(QColor(theme.COLORS["cyan"]))
    p.setPen(QColor(theme.COLORS["cyan"]))
    p.drawEllipse(20, 20, 24, 24)
    p.setBrush(Qt.NoBrush)
    p.drawEllipse(10, 10, 44, 44)
    p.end()
    return QIcon(pix)


def run_dashboard(app: "JarvisApp") -> int:
    qapp = QApplication.instance() or QApplication([])
    qapp.setQuitOnLastWindowClosed(False)  # keep running in the tray

    window = DashboardWindow(app)
    icon = _arc_reactor_icon()

    tray = QSystemTrayIcon(icon)
    tray.setToolTip(app.settings.assistant.name)
    menu = QMenu()

    def toggle() -> None:
        window.setVisible(not window.isVisible())

    show_action = QAction("Show / Hide HUD")
    show_action.triggered.connect(toggle)
    quit_action = QAction("Power down")

    def _quit() -> None:
        app.shutdown()
        qapp.quit()

    quit_action.triggered.connect(_quit)
    menu.addAction(show_action)
    menu.addSeparator()
    menu.addAction(quit_action)
    tray.setContextMenu(menu)
    tray.activated.connect(
        lambda reason: toggle() if reason == QSystemTrayIcon.Trigger else None
    )
    tray.show()

    _register_hotkey(app, toggle)

    if not app.settings.ui.start_minimized:
        window.show()

    # Greet, and optionally start the hands-free voice loop in the background.
    app.events.emit("transcript", role="assistant", text=app.greeting)
    _maybe_start_voice(app)

    return qapp.exec()


class _HotkeySignal(QObject):
    triggered = Signal()


def _register_hotkey(app: "JarvisApp", toggle) -> None:
    """Optional global hotkey (pynput) to show/hide the HUD.

    The OS listener runs on its own thread, so it emits a Qt signal to perform
    the toggle on the GUI thread.
    """
    combo = app.settings.ui.hotkey_toggle
    if not combo:
        return
    try:
        from pynput import keyboard
    except Exception:
        log.info("Global hotkey unavailable (install pynput to enable %s)", combo)
        return

    signal = _HotkeySignal()
    signal.triggered.connect(toggle)
    app._hotkey_signal = signal  # keep a reference alive

    # "ctrl+alt+j" → pynput's "<ctrl>+<alt>+j"
    spec = "+".join(
        f"<{p}>" if p in {"ctrl", "alt", "shift", "cmd"} else p
        for p in combo.lower().split("+")
    )
    try:
        listener = keyboard.GlobalHotKeys({spec: signal.triggered.emit})
        listener.daemon = True
        listener.start()
        log.info("Global hotkey registered: %s", combo)
    except Exception:
        log.warning("Could not register hotkey %s", combo)


def _maybe_start_voice(app: "JarvisApp") -> None:
    if not app.settings.wake.enabled:
        return
    try:
        from ..voice.pipeline import VoicePipeline
    except Exception as exc:
        log.info("Voice loop not started (deps missing): %s", exc)
        return

    def _run() -> None:
        try:
            VoicePipeline(app).run()
        except Exception:
            log.exception("Voice loop crashed")

    threading.Thread(target=_run, daemon=True).start()
