"""System control: volume, media keys, power state and diagnostics.

Power actions (shutdown/restart/sleep) are ``SENSITIVE`` and additionally gated
by ``permissions.allow_shutdown``. Lock is ``CONFIRM``. Volume/media/info are
``SAFE``. Platform-specific commands are isolated here behind one tool surface.
"""

from __future__ import annotations

import subprocess
import sys
from typing import Any

from ..core.logging import get_logger
from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult

log = get_logger("tools.system")
_IS_WIN = sys.platform.startswith("win")
_IS_MAC = sys.platform == "darwin"

_MEDIA_KEYS = {
    "playpause": "playpause",
    "play": "playpause",
    "pause": "playpause",
    "next": "nexttrack",
    "previous": "prevtrack",
    "prev": "prevtrack",
    "mute": "volumemute",
    "volumeup": "volumeup",
    "volumedown": "volumedown",
}


def _media_control(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    action = args["action"].lower()
    key = _MEDIA_KEYS.get(action)
    if not key:
        return ToolResult(text=f"Unknown media action '{action}'.", ok=False)
    try:
        import pyautogui

        pyautogui.press(key)
        return ToolResult(text=f"Media: {action}.")
    except Exception as exc:
        return ToolResult(text=f"Media control unavailable: {exc}", ok=False)


def _set_volume(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    level = max(0, min(100, int(args["level"])))
    try:
        if _IS_WIN:
            from ctypes import cast, POINTER

            from comtypes import CLSCTX_ALL
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

            devices = AudioUtilities.GetSpeakers()
            iface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            vol = cast(iface, POINTER(IAudioEndpointVolume))
            vol.SetMasterVolumeLevelScalar(level / 100.0, None)
        elif _IS_MAC:
            subprocess.run(["osascript", "-e", f"set volume output volume {level}"])
        else:
            subprocess.run(["amixer", "-q", "sset", "Master", f"{level}%"])
        return ToolResult(text=f"Volume set to {level}%.")
    except Exception as exc:
        return ToolResult(text=f"Couldn't set volume: {exc}", ok=False)


def _system_info(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    try:
        import psutil

        cpu = psutil.cpu_percent(interval=0.3)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        battery = psutil.sensors_battery() if hasattr(psutil, "sensors_battery") else None
        lines = [
            f"CPU: {cpu:.0f}%",
            f"Memory: {mem.percent:.0f}% of {mem.total / 1e9:.1f} GB",
            f"Disk: {disk.percent:.0f}% used",
        ]
        if battery is not None:
            lines.append(f"Battery: {battery.percent:.0f}%"
                         + (" (charging)" if battery.power_plugged else ""))
        return ToolResult(text=" | ".join(lines))
    except ImportError:
        return ToolResult(text="System info needs the 'psutil' package.", ok=False)


def _list_processes(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    try:
        import psutil
    except ImportError:
        return ToolResult(text="Process monitoring needs the 'psutil' package.", ok=False)
    procs = []
    for p in psutil.process_iter(["name", "cpu_percent", "memory_percent"]):
        procs.append((p.info.get("name") or "?", p.info.get("memory_percent") or 0.0))
    top = sorted(procs, key=lambda x: x[1], reverse=True)[:10]
    body = "\n".join(f"{name}: {mem:.1f}% mem" for name, mem in top)
    return ToolResult(text="Top processes by memory:\n" + body)


def _power(action: str):
    def handler(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        try:
            if _IS_WIN:
                cmds = {
                    "shutdown": ["shutdown", "/s", "/t", "5"],
                    "restart": ["shutdown", "/r", "/t", "5"],
                    "lock": ["rundll32.exe", "user32.dll,LockWorkStation"],
                    "sleep": ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"],
                }
            elif _IS_MAC:
                cmds = {
                    "shutdown": ["osascript", "-e", 'tell app "System Events" to shut down'],
                    "restart": ["osascript", "-e", 'tell app "System Events" to restart'],
                    "lock": ["pmset", "displaysleepnow"],
                    "sleep": ["pmset", "sleepnow"],
                }
            else:
                cmds = {
                    "shutdown": ["systemctl", "poweroff"],
                    "restart": ["systemctl", "reboot"],
                    "lock": ["loginctl", "lock-session"],
                    "sleep": ["systemctl", "suspend"],
                }
            subprocess.Popen(cmds[action])
            verb = {"shutdown": "Shutting down", "restart": "Restarting",
                    "lock": "Locking", "sleep": "Going to sleep"}[action]
            return ToolResult(text=f"{verb}, Sir.")
        except Exception as exc:
            return ToolResult(text=f"Couldn't {action}: {exc}", ok=False)

    return handler


def register(reg) -> None:
    reg.add(Tool(
        name="media_control",
        description="Control media playback: play/pause, next, previous, mute.",
        parameters={"type": "object", "properties": {
            "action": {"type": "string",
                       "enum": ["play", "pause", "playpause", "next", "previous", "mute"]}},
            "required": ["action"]},
        handler=_media_control, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="set_volume",
        description="Set the system master volume to a level from 0 to 100.",
        parameters={"type": "object", "properties": {
            "level": {"type": "integer", "minimum": 0, "maximum": 100}},
            "required": ["level"]},
        handler=_set_volume, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="system_info",
        description="Report CPU, memory, disk and battery status.",
        parameters={"type": "object", "properties": {}},
        handler=_system_info, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="list_processes",
        description="List the top running processes by memory usage.",
        parameters={"type": "object", "properties": {}},
        handler=_list_processes, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="lock_pc",
        description="Lock the workstation.",
        parameters={"type": "object", "properties": {}},
        handler=_power("lock"), risk=RiskLevel.CONFIRM,
        confirm_summary=lambda a: "lock the PC",
    ))
    for action, desc in [
        ("shutdown", "Shut down the computer."),
        ("restart", "Restart the computer."),
        ("sleep", "Put the computer to sleep."),
    ]:
        reg.add(Tool(
            name=f"{action}_pc",
            description=desc,
            parameters={"type": "object", "properties": {}},
            handler=_power(action), risk=RiskLevel.SENSITIVE,
            confirm_summary=lambda a, _act=action: f"{_act} the PC",
        ))
