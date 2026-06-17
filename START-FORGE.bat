@echo off
title FORGE Fitness OS
cd /d "%~dp0"

echo.
echo   ===============================
echo      Starting FORGE Fitness OS
echo   ===============================
echo.

REM First-time setup: install components only if missing (runs once).
if not exist node_modules (
  echo   First-time setup - installing components.
  echo   This happens only once and may take a few minutes...
  echo.
  call npm install
  echo.
)

echo   Launching... your browser will open automatically.
echo   To STOP FORGE, just close this window.
echo.

call npm run dev
pause
