"""Mutating file operations: create / rename / move / delete.

All writes are ``CONFIRM``-gated so destructive actions require the user's
go-ahead (per the security model). Deletes go to the OS recycle bin when
``send2trash`` is available — reversible by design — and only fall back to a
permanent delete if it isn't, which the confirmation summary makes explicit.
Read-only search/read live in :mod:`jarvis.tools.files`.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from ..core.logging import get_logger
from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult

log = get_logger("tools.file_ops")


def _create_folder(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    path = Path(args["path"]).expanduser()
    try:
        path.mkdir(parents=True, exist_ok=True)
        return ToolResult(text=f"Created folder {path}.")
    except Exception as exc:
        return ToolResult(text=f"Couldn't create folder: {exc}", ok=False)


def _rename(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    src = Path(args["path"]).expanduser()
    new_name = args["new_name"]
    if not src.exists():
        return ToolResult(text=f"No such path: {src}", ok=False)
    dest = src.with_name(new_name)
    if dest.exists():
        return ToolResult(text=f"Target already exists: {dest}", ok=False)
    try:
        src.rename(dest)
        return ToolResult(text=f"Renamed to {dest}.")
    except Exception as exc:
        return ToolResult(text=f"Couldn't rename: {exc}", ok=False)


def _move(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    src = Path(args["source"]).expanduser()
    dest = Path(args["destination"]).expanduser()
    if not src.exists():
        return ToolResult(text=f"No such path: {src}", ok=False)
    try:
        final = shutil.move(str(src), str(dest))
        return ToolResult(text=f"Moved to {final}.")
    except Exception as exc:
        return ToolResult(text=f"Couldn't move: {exc}", ok=False)


def _delete(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    path = Path(args["path"]).expanduser()
    if not path.exists():
        return ToolResult(text=f"No such path: {path}", ok=False)
    # Prefer the recycle bin (reversible).
    try:
        import send2trash

        send2trash.send2trash(str(path))
        return ToolResult(text=f"Sent {path} to the recycle bin.")
    except ImportError:
        pass
    try:
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
        return ToolResult(text=f"Permanently deleted {path}.")
    except Exception as exc:
        return ToolResult(text=f"Couldn't delete: {exc}", ok=False)


def register(reg) -> None:
    reg.add(Tool(
        name="create_folder",
        description="Create a new folder (and any missing parents).",
        parameters={"type": "object", "properties": {"path": {"type": "string"}},
                    "required": ["path"]},
        handler=_create_folder, risk=RiskLevel.CONFIRM,
        confirm_summary=lambda a: f"create folder {a.get('path')}",
    ))
    reg.add(Tool(
        name="rename_path",
        description="Rename a file or folder.",
        parameters={"type": "object", "properties": {
            "path": {"type": "string"}, "new_name": {"type": "string"}},
            "required": ["path", "new_name"]},
        handler=_rename, risk=RiskLevel.CONFIRM,
        confirm_summary=lambda a: f"rename {a.get('path')} to {a.get('new_name')}",
    ))
    reg.add(Tool(
        name="move_path",
        description="Move a file or folder to a new location.",
        parameters={"type": "object", "properties": {
            "source": {"type": "string"}, "destination": {"type": "string"}},
            "required": ["source", "destination"]},
        handler=_move, risk=RiskLevel.CONFIRM,
        confirm_summary=lambda a: f"move {a.get('source')} to {a.get('destination')}",
    ))
    reg.add(Tool(
        name="delete_path",
        description="Delete a file or folder (to the recycle bin when possible).",
        parameters={"type": "object", "properties": {"path": {"type": "string"}},
                    "required": ["path"]},
        handler=_delete, risk=RiskLevel.CONFIRM,
        confirm_summary=lambda a: f"delete {a.get('path')}",
    ))
