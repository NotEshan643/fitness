# Packaging & autostart (Windows)

How to turn the JARVIS source into a resident desktop app on your PC.

## 1. Install everything
```powershell
cd jarvis
python -m venv .venv
.venv\Scripts\activate
pip install -e .[full]
copy .env.example .env          # then fill in your API keys
copy config\settings.example.yaml config\settings.yaml
```

## 2. Run
```powershell
python -m jarvis --ui           # HUD + tray + background voice
python -m jarvis                # headless voice
python -m jarvis --text         # text only
```

## 3. Build a standalone .exe (PyInstaller)
```powershell
pip install pyinstaller
pyinstaller --noconfirm --windowed --name JARVIS ^
  --collect-all openwakeword ^
  --collect-submodules jarvis ^
  jarvis\__main__.py
```
The app appears in `dist\JARVIS\JARVIS.exe`. Keep `.env` and `config\` beside it
(or rely on `%APPDATA%\JARVIS`). Cloud SDKs (anthropic, elevenlabs, deepgram)
bundle cleanly; for local Whisper/sentence-transformers add `--collect-all`
for those packages too.

## 4. Launch on login
**Simplest** — put a shortcut to `JARVIS.exe` (or `START-JARVIS.bat`) in:
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
```
**Or** create a Task Scheduler task: Trigger = *At log on*, Action = the exe,
"Run only when user is logged on" so the tray and audio work.

## 5. First-run checklist
- `ANTHROPIC_API_KEY` set in `.env` (required).
- Microphone permission granted to the terminal/app.
- For Spotify: a Premium account + `SPOTIFY_CLIENT_ID/SECRET`; the first
  `spotify_*` call opens a browser to authorize.
- Global hotkey (default `ctrl+alt+j`) needs `pynput`; toggles the HUD.
