"""Phase 7 tests: the Qt-free theme layer (HUD widgets need a display)."""

from __future__ import annotations

from jarvis.ui import theme


def test_stylesheet_uses_palette():
    qss = theme.stylesheet()
    assert theme.COLORS["bg"] in qss
    assert theme.COLORS["cyan"] in qss
    assert "border-radius" in qss


def test_state_colors_cover_pipeline_states():
    for state in ("listening_for_wake", "waking", "listening", "thinking", "speaking"):
        assert state in theme.STATE_COLORS
        assert theme.STATE_COLORS[state].startswith("#")


if __name__ == "__main__":
    test_stylesheet_uses_palette()
    test_state_colors_cover_pipeline_states()
    print("ALL UI TESTS PASSED")
