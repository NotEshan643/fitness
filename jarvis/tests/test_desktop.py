"""Phase 3 tests: file operations and permission gating of system tools.

File ops are fully exercised against a temp directory. Desktop/system tools that
need a display or Windows APIs are only checked for registration + risk level.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

os.environ.setdefault("JARVIS_HOME", tempfile.mkdtemp())

from jarvis.app import JarvisApp  # noqa: E402
from jarvis.security.permissions import (  # noqa: E402
    ConfirmationRequired,
    RiskLevel,
)
from jarvis.tools.base import ToolContext  # noqa: E402


def _ctx(app):
    return ToolContext(settings=app.settings, memory=app.memory, events=app.events)


def test_file_ops_lifecycle():
    app = JarvisApp()
    ctx = _ctx(app)
    work = Path(tempfile.mkdtemp())

    folder = work / "project"
    r = app.registry.dispatch("create_folder", {"path": str(folder)}, ctx)
    assert r.ok and folder.is_dir()

    # Create a file to rename/move/delete.
    f = folder / "notes.txt"
    f.write_text("hello")

    r = app.registry.dispatch("rename_path", {"path": str(f), "new_name": "todo.txt"}, ctx)
    assert r.ok and (folder / "todo.txt").exists() and not f.exists()

    dest = work / "archive"
    dest.mkdir()
    r = app.registry.dispatch(
        "move_path", {"source": str(folder / "todo.txt"), "destination": str(dest)}, ctx
    )
    assert r.ok and (dest / "todo.txt").exists()

    r = app.registry.dispatch("delete_path", {"path": str(dest / "todo.txt")}, ctx)
    assert r.ok and not (dest / "todo.txt").exists()
    app.shutdown()


def test_destructive_and_power_tools_are_gated():
    app = JarvisApp()

    # Deleting requires confirmation.
    delete = app.registry.get("delete_path")
    assert delete.risk == RiskLevel.CONFIRM
    try:
        app.permissions.check("delete_path", delete.risk, "delete x", confirmed=False)
        assert False, "delete should require confirmation"
    except ConfirmationRequired:
        pass

    # Power tools are SENSITIVE and respect allow_shutdown.
    shutdown = app.registry.get("shutdown_pc")
    assert shutdown.risk == RiskLevel.SENSITIVE
    app.settings.permissions.allow_shutdown = False
    try:
        app.permissions.check("shutdown_pc", shutdown.risk, "shutdown", confirmed=True)
        assert False, "shutdown must be blocked when disabled"
    except PermissionError:
        pass
    app.shutdown()


if __name__ == "__main__":
    test_file_ops_lifecycle()
    test_destructive_and_power_tools_are_gated()
    print("ALL DESKTOP TESTS PASSED")
