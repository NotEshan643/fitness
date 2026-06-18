"""Entry point: ``python -m jarvis`` (voice) / ``python -m jarvis --text``."""

from __future__ import annotations

import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="jarvis", description="JARVIS assistant")
    parser.add_argument(
        "--text",
        action="store_true",
        help="Run the text conversation loop (no microphone needed).",
    )
    parser.add_argument(
        "--ui",
        action="store_true",
        help="Launch the HUD dashboard + system tray.",
    )
    args = parser.parse_args(argv)

    # Import after arg parsing so --help is instant and import errors are scoped.
    from .app import JarvisApp

    app = JarvisApp()
    try:
        if args.ui:
            app.run_ui()
        elif args.text:
            app.run_text()
        else:
            app.run_voice()
    except KeyboardInterrupt:
        app.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
