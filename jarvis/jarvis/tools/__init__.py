"""The assistant's "hands" — capabilities Claude can invoke via tool-use.

Adding a capability is adding one :class:`Tool` to the registry. Each tool
declares a JSON schema (so Claude can call it natively) and a risk level (so the
permission layer can gate it). Phase-1 ships memory, time, file read/search and
a web-search interface; later phases register desktop/system/spotify tools.
"""

from .base import Tool, ToolContext, ToolResult
from .registry import ToolRegistry, build_default_registry

__all__ = [
    "Tool",
    "ToolContext",
    "ToolResult",
    "ToolRegistry",
    "build_default_registry",
]
