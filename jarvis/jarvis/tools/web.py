"""Internet research: web search, news, and page fetch + extraction.

- ``web_search`` / ``get_news`` use Tavily (one key, search + synthesized answer).
  Without ``TAVILY_API_KEY`` they return an honest "not configured" message
  rather than inventing results.
- ``fetch_webpage`` needs no API key — it fetches a URL with httpx and extracts
  the readable main text (trafilatura, with a tag-stripping fallback), so the
  agent can read and summarize any page and cite the source.

Multi-step research ("research competitors", "find AI news and summarize") is
not a single tool: the agent loop composes search → fetch → summarize itself.
"""

from __future__ import annotations

import re
from typing import Any

from ..core.logging import get_logger
from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult

log = get_logger("tools.web")

_MAX_CHARS = 6000
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\n{3,}")


def _extract_text(html: str) -> str:
    """Best-effort readable-text extraction. Pure for testability."""
    try:
        import trafilatura

        extracted = trafilatura.extract(html, include_comments=False, include_tables=False)
        if extracted:
            return extracted.strip()
    except Exception:
        pass
    # Fallback: drop scripts/styles, strip tags, collapse whitespace.
    cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    text = _TAG_RE.sub(" ", cleaned)
    text = re.sub(r"[ \t]+", " ", text)
    return _WS_RE.sub("\n\n", text).strip()


def _tavily(ctx: ToolContext):
    key = ctx.settings.secrets.tavily_api_key
    if not key:
        return None
    from tavily import TavilyClient

    return TavilyClient(api_key=key)


def _web_search(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    client = _tavily(ctx)
    if client is None:
        return ToolResult(
            text="Web search isn't configured, Sir. Add TAVILY_API_KEY to .env.",
            ok=False,
        )
    try:
        resp = client.search(
            args["query"],
            max_results=int(args.get("max_results", 5)),
            include_answer=True,
        )
    except Exception as exc:
        log.exception("web_search failed")
        return ToolResult(text=f"Search failed: {exc}", ok=False)

    out = []
    if resp.get("answer"):
        out.append(f"Summary: {resp['answer']}\n")
    for r in resp.get("results", []):
        out.append(f"- {r.get('title')} ({r.get('url')})\n  {r.get('content', '')[:300]}")
    return ToolResult(text="\n".join(out) or "No results.", data={"results": resp.get("results")})


def _get_news(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    client = _tavily(ctx)
    if client is None:
        return ToolResult(text="News isn't configured, Sir. Add TAVILY_API_KEY.", ok=False)
    try:
        resp = client.search(
            args["query"],
            topic="news",
            days=int(args.get("days", 3)),
            max_results=int(args.get("max_results", 6)),
            include_answer=True,
        )
    except Exception as exc:
        return ToolResult(text=f"News fetch failed: {exc}", ok=False)
    out = []
    if resp.get("answer"):
        out.append(f"Briefing: {resp['answer']}\n")
    for r in resp.get("results", []):
        out.append(f"- {r.get('title')} ({r.get('url')})")
    return ToolResult(text="\n".join(out) or "No recent news.", data={"results": resp.get("results")})


def _fetch_webpage(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    url = args["url"].strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        import httpx

        headers = {"User-Agent": "Mozilla/5.0 (JARVIS research agent)"}
        with httpx.Client(follow_redirects=True, timeout=20.0, headers=headers) as client:
            resp = client.get(url)
            resp.raise_for_status()
            text = _extract_text(resp.text)
    except Exception as exc:
        return ToolResult(text=f"Couldn't fetch {url}: {exc}", ok=False)

    truncated = len(text) > _MAX_CHARS
    body = text[:_MAX_CHARS] + ("\n…[truncated]" if truncated else "")
    return ToolResult(
        text=f"Source: {url}\n\n{body}",
        data={"url": url, "truncated": truncated, "chars": len(text)},
    )


def register(reg) -> None:
    reg.add(Tool(
        name="web_search",
        description=(
            "Search the web for current information and facts. Returns a synthesized "
            "summary plus titles/URLs/snippets. Cite the URLs in your answer."
        ),
        parameters={"type": "object", "properties": {
            "query": {"type": "string"},
            "max_results": {"type": "integer", "minimum": 1, "maximum": 10}},
            "required": ["query"]},
        handler=_web_search, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="get_news",
        description="Get recent news on a topic from the last few days, with a briefing.",
        parameters={"type": "object", "properties": {
            "query": {"type": "string"},
            "days": {"type": "integer", "minimum": 1, "maximum": 14},
            "max_results": {"type": "integer", "minimum": 1, "maximum": 10}},
            "required": ["query"]},
        handler=_get_news, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(
        name="fetch_webpage",
        description=(
            "Fetch a web page and return its readable main text, so you can read or "
            "summarize it. No API key required. Always cite the source URL."
        ),
        parameters={"type": "object", "properties": {"url": {"type": "string"}},
                    "required": ["url"]},
        handler=_fetch_webpage, risk=RiskLevel.SAFE,
    ))
