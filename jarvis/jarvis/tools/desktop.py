"""Desktop control: launching apps/games, windows, screenshots, websites.

Windows-first, with cross-platform behavior where it's cheap so the project
stays developable on macOS/Linux. Heavy deps (pyautogui, pygetwindow, mss) are
lazy-imported inside handlers, so the registry builds even when the desktop
extras aren't installed; a missing dep yields a clear message rather than a
crash.
"""

from __future__ import annotations

import os
import subprocess
import sys
import webbrowser
from datetime import datetime
from pathlib import Path
from typing import Any

from ..core.logging import get_logger
from ..core.paths import paths
from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult

log = get_logger("tools.desktop")
_IS_WIN = sys.platform.startswith("win")
_IS_MAC = sys.platform == "darwin"


def _open_application(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    name = args["name"].strip()
    try:
        if _IS_WIN:
            # `start` resolves Start-menu apps, registered names and paths.
            subprocess.Popen(["cmd", "/c", "start", "", name], shell=False)
        elif _IS_MAC:
            subprocess.Popen(["open", "-a", name])
        else:
            subprocess.Popen([name])
        return ToolResult(text=f"Opening {name}.")
    except Exception as exc:
        return ToolResult(text=f"Couldn't open {name}: {exc}", ok=False)


def _launch_game(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    target = args["target"].strip()
    try:
        if target.startswith("steam://"):
            webbrowser.open(target)  # Steam protocol handler
        elif Path(target).exists():
            if _IS_WIN:
                os.startfile(target)  # type: ignore[attr-defined]
            else:
                subprocess.Popen([target])
        else:
            return _open_application({"name": target}, ctx)
        return ToolResult(text=f"Launching {target}.")
    except Exception as exc:
        return ToolResult(text=f"Couldn't launch {target}: {exc}", ok=False)


def _close_application(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    name = args["name"].lower().strip()
    try:
        import psutil
    except ImportError:
        return ToolResult(text="Process control needs the 'psutil' package.", ok=False)
    killed = 0
    for proc in psutil.process_iter(["name"]):
        pname = (proc.info.get("name") or "").lower()
        if name in pname:
            try:
                proc.terminate()
                killed += 1
            except Exception:
                pass
    if killed:
        return ToolResult(text=f"Closed {killed} process(es) matching '{name}'.")
    return ToolResult(text=f"No running process matched '{name}'.", ok=False)


def _open_website(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    url = args["url"].strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return ToolResult(text=f"Opening {url}.")


def _take_screenshot(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    out_dir = paths.data_dir / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"screenshot_{datetime.now():%Y%m%d_%H%M%S}.png"
    try:
        import mss

        with mss.mss() as sct:
            sct.shot(output=str(path))
        return ToolResult(text=f"Screenshot saved to {path}.", data={"path": str(path)})
    except Exception as exc:
        return ToolResult(text=f"Couldn't take a screenshot: {exc}", ok=False)


def _list_windows(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    try:
        import pygetwindow as gw

        titles = [t for t in gw.getAllTitles() if t.strip()]
        return ToolResult(text="\n".join(titles) or "No visible windows.")
    except Exception as exc:
        return ToolResult(text=f"Window listing unavailable: {exc}", ok=False)


def _focus_window(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    title = args["title"]
    try:
        import pygetwindow as gw

        matches = gw.getWindowsWithTitle(title)
        if not matches:
            return ToolResult(text=f"No window titled like '{title}'.", ok=False)
        matches[0].activate()
        return ToolResult(text=f"Focused '{matches[0].title}'.")
    except Exception as exc:
        return ToolResult(text=f"Couldn't focus the window: {exc}", ok=False)


def register(reg) -> None:
    reg.add(Tool(
        name="open_application",
        description="Open/launch a desktop application by name (e.g. 'Spotify', 'notepad', 'chrome').",
        parameters={"type": "object", "properties": {"name": {"type": "string"}},
                    "required": ["name"]},
        handler=_open_application, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="launch_game",
        description="Launch a game by executable path, Start-menu name, or steam:// URI.",
        parameters={"type": "object", "properties": {"target": {"type": "string"}},
                    "required": ["target"]},
        handler=_launch_game, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="close_application",
        description="Close/terminate running processes whose name matches the given text.",
        parameters={"type": "object", "properties": {"name": {"type": "string"}},
                    "required": ["name"]},
        handler=_close_application, risk=RiskLevel.CONFIRM,
        confirm_summary=lambda a: f"close all processes matching '{a.get('name')}'",
    ))
    reg.add(Tool(
        name="open_website",
        description="Open a URL in the default browser.",
        parameters={"type": "object", "properties": {"url": {"type": "string"}},
                    "required": ["url"]},
        handler=_open_website, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="take_screenshot",
        description="Capture the screen to a PNG file and return its path.",
        parameters={"type": "object", "properties": {}},
        handler=_take_screenshot, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="list_windows",
        description="List the titles of all open windows.",
        parameters={"type": "object", "properties": {}},
        handler=_list_windows, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="focus_window",
        description="Bring a window to the foreground by (partial) title.",
        parameters={"type": "object", "properties": {"title": {"type": "string"}},
                    "required": ["title"]},
        handler=_focus_window, risk=RiskLevel.SAFE,
    ))
