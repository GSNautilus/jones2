@echo off
rem Start Jones 2: the dev server for the browser client, then the game in your browser.
rem Double-click this file, or run it from any folder. Close this window to stop the server.
title Jones 2
cd /d "%~dp0"

if not exist node_modules (
  echo First run: installing packages...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting the game at http://localhost:5174 ...
echo Close this window to stop it.
call npm run dev -w @jones2/client -- --open
if errorlevel 1 pause
