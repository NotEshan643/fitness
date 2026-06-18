"""The JARVIS HUD dashboard (PySide6).

A dark, futuristic control surface that subscribes to the event bus every other
module emits to. Panels: status + mic state, live transcript (with a text input
so the HUD is usable without a mic), long-term memory browser/editor, recent
tool/audit activity, and live system info.

GUI updates must happen on the Qt thread, but events arrive from worker threads
(voice pipeline, agent). We bridge them with Qt signals — emitting a signal from
any thread is safe and Qt marshals delivery to the GUI thread.

Importing this module requires PySide6; the orchestrator catches ImportError and
falls back to a non-GUI mode.
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

from PySide6.QtCore import Qt, QObject, QTimer, Signal
from PySide6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from ..core.logging import get_logger
from . import theme

if TYPE_CHECKING:
    from ..app import JarvisApp

log = get_logger("ui.dashboard")


class _Bridge(QObject):
    """Re-emits EventBus events as thread-safe Qt signals."""

    transcript = Signal(str, str)   # role, text
    state = Signal(str)             # state name
    tool = Signal(str)             # tool summary
    notify = Signal(str)           # notification text


def _panel(title: str) -> tuple[QFrame, QVBoxLayout]:
    frame = QFrame()
    frame.setObjectName("Panel")
    outer = QVBoxLayout(frame)
    label = QLabel(title)
    label.setObjectName("PanelTitle")
    outer.addWidget(label)
    return frame, outer


class DashboardWindow(QWidget):
    def __init__(self, app: "JarvisApp") -> None:
        super().__init__()
        self.app = app
        self.bridge = _Bridge()
        self.setWindowTitle("JARVIS")
        self.resize(1040, 680)
        self.setStyleSheet(theme.stylesheet())
        self._build()
        self._wire_events()
        self._start_sysinfo_timer()
        self.refresh_memory()

    # ── layout ─────────────────────────────────────────────────────────
    def _build(self) -> None:
        root = QGridLayout(self)

        # Header
        header = QHBoxLayout()
        brand = QLabel(self.app.settings.assistant.name)
        brand.setObjectName("Brand")
        self.state_label = QLabel("● STANDBY")
        self.state_label.setStyleSheet(f"color: {theme.COLORS['text_dim']};")
        header.addWidget(brand)
        header.addStretch()
        header.addWidget(self.state_label)
        root.addLayout(header, 0, 0, 1, 2)

        # Transcript panel (left, tall)
        tframe, tlay = _panel("CONVERSATION")
        self.transcript_view = QTextEdit()
        self.transcript_view.setReadOnly(True)
        tlay.addWidget(self.transcript_view)
        input_row = QHBoxLayout()
        self.input = QLineEdit()
        self.input.setPlaceholderText("Type to JARVIS…")
        self.input.returnPressed.connect(self._on_send)
        send = QPushButton("Send")
        send.clicked.connect(self._on_send)
        input_row.addWidget(self.input)
        input_row.addWidget(send)
        tlay.addLayout(input_row)
        root.addWidget(tframe, 1, 0, 2, 1)

        # Memory panel (right top)
        mframe, mlay = _panel("MEMORY")
        self.memory_list = QListWidget()
        mlay.addWidget(self.memory_list)
        mrow = QHBoxLayout()
        addbtn = QPushButton("Add")
        addbtn.clicked.connect(self._on_add_memory)
        delbtn = QPushButton("Forget")
        delbtn.setObjectName("Danger")
        delbtn.clicked.connect(self._on_forget_memory)
        mrow.addWidget(addbtn)
        mrow.addWidget(delbtn)
        mlay.addLayout(mrow)
        root.addWidget(mframe, 1, 1)

        # Activity + system panel (right bottom)
        aframe, alay = _panel("ACTIVITY & SYSTEM")
        self.sysinfo = QLabel("…")
        self.sysinfo.setStyleSheet(f"color: {theme.COLORS['gold']};")
        self.activity = QTextEdit()
        self.activity.setReadOnly(True)
        alay.addWidget(self.sysinfo)
        alay.addWidget(self.activity)
        root.addWidget(aframe, 2, 1)

        root.setColumnStretch(0, 2)
        root.setColumnStretch(1, 1)

    # ── event wiring ───────────────────────────────────────────────────
    def _wire_events(self) -> None:
        ev = self.app.events
        ev.subscribe("transcript", lambda e: self.bridge.transcript.emit(
            e.payload.get("role", ""), e.payload.get("text", "")))
        ev.subscribe("state", lambda e: self.bridge.state.emit(e.payload.get("state", "idle")))
        ev.subscribe("tool", lambda e: self.bridge.tool.emit(
            f"{e.payload.get('tool')}({e.payload.get('args')})"))
        ev.subscribe("notify", lambda e: self.bridge.notify.emit(e.payload.get("text", "")))

        self.bridge.transcript.connect(self._on_transcript)
        self.bridge.state.connect(self._on_state)
        self.bridge.tool.connect(lambda s: self._log_activity(f"⚙ {s}"))
        self.bridge.notify.connect(lambda s: self._log_activity(f"🔔 {s}"))

    def _on_transcript(self, role: str, text: str) -> None:
        c = theme.COLORS
        who = self.app.settings.assistant.name if role == "assistant" else "You"
        color = c["cyan"] if role == "assistant" else c["gold"]
        self.transcript_view.append(
            f'<span style="color:{color}"><b>{who}:</b></span> '
            f'<span style="color:{c["text"]}">{text}</span><br>'
        )

    def _on_state(self, state: str) -> None:
        color = theme.STATE_COLORS.get(state, theme.COLORS["text_dim"])
        self.state_label.setText(f"● {state.replace('_', ' ').upper()}")
        self.state_label.setStyleSheet(f"color: {color};")

    def _log_activity(self, line: str) -> None:
        self.activity.append(line)

    # ── interactions ───────────────────────────────────────────────────
    def _on_send(self) -> None:
        text = self.input.text().strip()
        if not text:
            return
        self.input.clear()

        def _work() -> None:
            # Confirmations from the HUD: simple modal isn't thread-safe, so the
            # typed path auto-declines destructive actions; use voice or buttons
            # for those. (A Qt confirm dialog is wired via the bridge in voice.)
            self.app.agent.respond(text, confirm=lambda s: False)
            self.bridge.state.emit("idle")
            # Memory may have changed via tools; refresh on the GUI thread.
            QTimer.singleShot(0, self.refresh_memory)

        threading.Thread(target=_work, daemon=True).start()

    def refresh_memory(self) -> None:
        self.memory_list.clear()
        for m in self.app.memory.all():
            item = QListWidgetItem(f"#{m.id} {m.render()}")
            item.setData(Qt.UserRole, m.id)
            self.memory_list.addItem(item)

    def _on_add_memory(self) -> None:
        text, ok = QInputDialog.getText(self, "Add memory", "Fact to remember:")
        if ok and text.strip():
            self.app.memory.remember(text.strip(), source="dashboard")
            self.refresh_memory()

    def _on_forget_memory(self) -> None:
        item = self.memory_list.currentItem()
        if item is None:
            return
        self.app.memory.forget(int(item.data(Qt.UserRole)))
        self.refresh_memory()

    # ── system info ────────────────────────────────────────────────────
    def _start_sysinfo_timer(self) -> None:
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._update_sysinfo)
        self._timer.start(3000)
        self._update_sysinfo()

    def _update_sysinfo(self) -> None:
        try:
            import psutil

            cpu = psutil.cpu_percent()
            mem = psutil.virtual_memory().percent
            self.sysinfo.setText(f"CPU {cpu:.0f}%   ·   MEM {mem:.0f}%")
        except Exception:
            self.sysinfo.setText("system info unavailable")
