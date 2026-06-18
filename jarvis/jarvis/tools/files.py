"""Read-only file tools (Phase 1).

Mutating file operations (create/move/rename/delete) arrive in Phase 3 behind
``RiskLevel.CONFIRM``. For now JARVIS can locate and read files to answer
questions and summarize documents.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult

# Don't blow up the model's context with huge files.
_MAX_CHARS = 8000


def _search_files(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    root = Path(args.get("directory") or Path.home()).expanduser()
    pattern = args.get("pattern", "*")
    if not root.exists():
        return ToolResult(text=f"No such directory: {root}", ok=False)
    matches = [str(p) for p in root.rglob(pattern) if p.is_file()][:50]
    if not matches:
        return ToolResult(text="No matching files.")
    return ToolResult(text="\n".join(matches), data={"matches": matches})


def _read_file(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    path = Path(args["path"]).expanduser()
    if not path.is_file():
        return ToolResult(text=f"No such file: {path}", ok=False)
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:  # binary / permission
        return ToolResult(text=f"Could not read file: {exc}", ok=False)
    truncated = len(text) > _MAX_CHARS
    return ToolResult(
        text=text[:_MAX_CHARS] + ("\n…[truncated]" if truncated else ""),
        data={"truncated": truncated, "chars": len(text)},
    )


def register(reg) -> None:
    reg.add(
        Tool(
            name="search_files",
            description="Find files under a directory by glob pattern (e.g. '*.pdf').",
            parameters={
                "type": "object",
                "properties": {
                    "directory": {"type": "string", "description": "Defaults to home."},
                    "pattern": {"type": "string", "description": "Glob, e.g. '*.txt'."},
                },
                "required": ["pattern"],
            },
            handler=_search_files,
            risk=RiskLevel.SAFE,
        )
    )
    reg.add(
        Tool(
            name="read_file",
            description="Read a UTF-8 text file's contents (truncated if large).",
            parameters={
                "type": "object",
                "properties": {"path": {"type": "string"}},
                "required": ["path"],
            },
            handler=_read_file,
            risk=RiskLevel.SAFE,
        )
    )
