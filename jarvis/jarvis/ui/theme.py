"""Iron-Man HUD theme: colors and a Qt stylesheet (QSS).

Kept free of any Qt import so it can be unit-tested and reused. The palette is a
dark, futuristic HUD — near-black backgrounds, arc-reactor cyan accents, and a
gold highlight, echoing Stark's interfaces.
"""

from __future__ import annotations

COLORS = {
    "bg": "#0a0e14",
    "panel": "#0e1620",
    "panel_alt": "#111c28",
    "border": "#16364a",
    "cyan": "#38e1ff",       # arc-reactor cyan
    "cyan_dim": "#1b6f8a",
    "gold": "#ffcf6b",       # Stark gold
    "text": "#cfe8f3",
    "text_dim": "#6f8a99",
    "danger": "#ff5a6a",
    "ok": "#5affa0",
}

# Status → accent color, used by the state indicator.
STATE_COLORS = {
    "listening_for_wake": COLORS["cyan_dim"],
    "waking": COLORS["gold"],
    "listening": COLORS["cyan"],
    "thinking": COLORS["gold"],
    "speaking": COLORS["ok"],
    "idle": COLORS["text_dim"],
}


def stylesheet() -> str:
    c = COLORS
    return f"""
    QWidget {{
        background-color: {c['bg']};
        color: {c['text']};
        font-family: 'Segoe UI', 'Consolas', monospace;
        font-size: 13px;
    }}
    QFrame#Panel {{
        background-color: {c['panel']};
        border: 1px solid {c['border']};
        border-radius: 10px;
    }}
    QLabel#PanelTitle {{
        color: {c['cyan']};
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 2px;
    }}
    QLabel#Brand {{
        color: {c['cyan']};
        font-size: 22px;
        font-weight: bold;
        letter-spacing: 6px;
    }}
    QTextEdit, QListWidget, QLineEdit {{
        background-color: {c['panel_alt']};
        border: 1px solid {c['border']};
        border-radius: 8px;
        padding: 6px;
        selection-background-color: {c['cyan_dim']};
    }}
    QPushButton {{
        background-color: {c['panel_alt']};
        border: 1px solid {c['cyan_dim']};
        border-radius: 8px;
        padding: 6px 14px;
        color: {c['cyan']};
    }}
    QPushButton:hover {{ border-color: {c['cyan']}; color: #ffffff; }}
    QPushButton#Danger {{ border-color: {c['danger']}; color: {c['danger']}; }}
    QScrollBar:vertical {{ background: {c['panel']}; width: 10px; }}
    QScrollBar::handle:vertical {{ background: {c['cyan_dim']}; border-radius: 5px; }}
    """
