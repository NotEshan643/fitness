"""Phase 4 tests: HTML extraction and graceful no-key behavior (no network)."""

from __future__ import annotations

import os
import tempfile

os.environ.setdefault("JARVIS_HOME", tempfile.mkdtemp())

from jarvis.app import JarvisApp  # noqa: E402
from jarvis.tools.base import ToolContext  # noqa: E402
from jarvis.tools.web import _extract_text  # noqa: E402

_HTML = """
<html><head><title>T</title><style>.x{color:red}</style></head>
<body>
  <script>var a = 1;</script>
  <h1>Quarterly Report</h1>
  <p>Revenue grew by 20% this quarter.</p>
  <p>Margins held steady.</p>
</body></html>
"""


def test_extract_text_strips_markup_and_scripts():
    text = _extract_text(_HTML)
    assert "Revenue grew by 20%" in text
    assert "var a = 1" not in text       # script content removed
    assert "color:red" not in text       # style content removed
    assert "<p>" not in text             # tags stripped


def test_web_tools_registered_and_degrade_without_key():
    app = JarvisApp()
    for name in ("web_search", "get_news", "fetch_webpage"):
        assert app.registry.get(name) is not None
    app.settings.secrets.tavily_api_key = ""
    ctx = ToolContext(settings=app.settings, memory=app.memory, events=app.events)
    r = app.registry.dispatch("web_search", {"query": "anything"}, ctx)
    assert not r.ok and "not configured" in r.text.lower() or "TAVILY" in r.text
    app.shutdown()


if __name__ == "__main__":
    test_extract_text_strips_markup_and_scripts()
    test_web_tools_registered_and_degrade_without_key()
    print("ALL WEB TESTS PASSED")
