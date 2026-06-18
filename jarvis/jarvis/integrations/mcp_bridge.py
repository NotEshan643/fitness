"""Bridge external MCP servers into JARVIS's tool registry.

Why generic MCP instead of bespoke Google APIs: the same code path connects
Google Calendar, Google Drive, Miro, GitHub, or any future MCP server the user
configures in ``settings.integrations.mcp_servers`` — each server's tools become
first-class JARVIS tools the agent can call, with sensible permission gating.

MCP is async; JARVIS's tool handlers are sync. We run a single asyncio loop on a
dedicated daemon thread, keep persistent client sessions there, and dispatch
each tool call via ``run_coroutine_threadsafe``. The bridge is fully optional:
no servers configured, or the ``mcp`` package missing, simply yields no tools.
"""

from __future__ import annotations

import asyncio
import json
import threading
from typing import Any

from ..core.config import MCPServerCfg, Settings
from ..core.logging import get_logger
from ..security.permissions import RiskLevel
from ..tools.base import Tool, ToolContext, ToolResult

log = get_logger("integrations.mcp")

# Tool-name verbs that imply a write/side effect → require confirmation.
_MUTATING = ("create", "update", "delete", "remove", "write", "send", "move",
             "add", "insert", "set", "respond", "reply", "upload")


def mcp_risk_for(tool_name: str) -> RiskLevel:
    """Heuristic risk: mutating verbs confirm, everything else is safe (reads)."""
    lower = tool_name.lower()
    return RiskLevel.CONFIRM if any(v in lower for v in _MUTATING) else RiskLevel.SAFE


class MCPBridge:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._sessions: dict[str, Any] = {}
        self._stacks: list[Any] = []

    def start(self) -> list[Tool]:
        """Connect all enabled servers; return their tools wrapped for JARVIS."""
        servers = [s for s in self.settings.integrations.mcp_servers if s.enabled]
        if not servers:
            return []
        try:
            import mcp  # noqa: F401
        except Exception:
            log.warning(
                "%d MCP server(s) configured but the 'mcp' package isn't installed; "
                "run: pip install mcp",
                len(servers),
            )
            return []

        self._start_loop()
        tools: list[Tool] = []
        for cfg in servers:
            try:
                tools.extend(self._connect(cfg))
            except Exception:
                log.exception("Failed to connect MCP server %s", cfg.name)
        log.info("MCP bridge exposed %d tool(s)", len(tools))
        return tools

    # ── event loop plumbing ────────────────────────────────────────────
    def _start_loop(self) -> None:
        if self._loop is not None:
            return
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._loop.run_forever, daemon=True)
        self._thread.start()

    def _run(self, coro, timeout: float = 30.0):
        assert self._loop is not None
        return asyncio.run_coroutine_threadsafe(coro, self._loop).result(timeout)

    # ── connection + tool wrapping ─────────────────────────────────────
    def _connect(self, cfg: MCPServerCfg) -> list[Tool]:
        from contextlib import AsyncExitStack

        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        async def _open():
            stack = AsyncExitStack()
            if cfg.transport == "sse":
                from mcp.client.sse import sse_client

                read, write = await stack.enter_async_context(sse_client(cfg.url))
            else:
                params = StdioServerParameters(
                    command=cfg.command, args=cfg.args, env=cfg.env or None
                )
                read, write = await stack.enter_async_context(stdio_client(params))
            session = await stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            listed = await session.list_tools()
            return stack, session, listed.tools

        stack, session, mcp_tools = self._run(_open(), timeout=60.0)
        self._stacks.append(stack)
        self._sessions[cfg.name] = session

        tools: list[Tool] = []
        for mt in mcp_tools:
            tools.append(self._wrap(cfg.name, mt))
        return tools

    def _wrap(self, server: str, mcp_tool) -> Tool:
        name = f"{server}__{mcp_tool.name}"
        schema = getattr(mcp_tool, "inputSchema", None) or {
            "type": "object", "properties": {}
        }

        def handler(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
            session = self._sessions[server]
            try:
                result = self._run(session.call_tool(mcp_tool.name, args or {}))
            except Exception as exc:
                return ToolResult(text=f"{name} failed: {exc}", ok=False)
            return ToolResult(text=_render(result))

        return Tool(
            name=name,
            description=(mcp_tool.description or f"{server} tool {mcp_tool.name}")[:1000],
            parameters=schema,
            handler=handler,
            risk=mcp_risk_for(mcp_tool.name),
            confirm_summary=lambda a, _n=name: f"run {_n}",
        )

    def stop(self) -> None:
        if self._loop is None:
            return
        async def _close():
            for stack in self._stacks:
                try:
                    await stack.aclose()
                except Exception:
                    pass
        try:
            self._run(_close(), timeout=10.0)
        except Exception:
            pass
        self._loop.call_soon_threadsafe(self._loop.stop)


def _render(result) -> str:
    """Flatten an MCP CallToolResult into text for the model."""
    parts = []
    for block in getattr(result, "content", []) or []:
        text = getattr(block, "text", None)
        if text:
            parts.append(text)
        elif getattr(block, "type", None) == "json":
            parts.append(json.dumps(getattr(block, "data", {}), default=str))
    return "\n".join(parts) if parts else "(no content)"
