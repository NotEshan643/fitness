@echo off
title JARVIS
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate
    echo Installing dependencies...
    pip install -e .
) else (
    call .venv\Scripts\activate
)

if "%~1"=="text" (
    python -m jarvis --text
) else (
    python -m jarvis
)
pause
