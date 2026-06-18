"""Web research interface.

Phase 1 ships the tool surface and a provider abstraction so the agent loop can
already *plan* research. Live search is enabled when ``TAVILY_API_KEY`` is set;
otherwise the tool returns a clear, honest "not configured" message rather than
fabricating results. Phase 4 fills in extraction + summarization with citations.
"""

from __future__ import annotations

from typing import Any

from ..core.logging import get_logger
from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult

log = get_logger("tools.web")


def _web_search(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    query = args["query"]
    api_key = ctx.settings.secrets.tavily_api_key
    if not api_key:
        return ToolResult(
            text=(
                "Web search is not configured, Sir. Add TAVILY_API_KEY to .env to "
                "enable live research."
            ),
            ok=False,
        )
    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=api_key)
        resp = client.search(query, max_results=int(args.get("max_results", 5)))
        results = resp.get("results", [])
        lines = [
            f"- {r.get('title')} — {r.get('url')}\n  {r.get('content', '')[:300]}"
            for r in results
        ]
        body = "\n".join(lines) if lines else "No results."
        return ToolResult(text=body, data={"results": results})
    except Exception as exc:  # network / SDK missing
        log.exception("web_search failed")
        return ToolResult(text=f"Search failed: {exc}", ok=False)


def register(reg) -> None:
    reg.add(
        Tool(
            name="web_search",
            description=(
                "Search the web for current information, news and facts. Returns "
                "titles, URLs and snippets; cite the URLs in your answer."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "max_results": {"type": "integer", "minimum": 1, "maximum": 10},
                },
                "required": ["query"],
            },
            handler=_web_search,
            risk=RiskLevel.SAFE,
        )
    )
