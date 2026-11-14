@echo off
title Stop Copycat Copiers Server
echo Stopping Copycat Copiers Web Printing Server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3005" ^| findstr "LISTENING"') do (
  echo Terminating process PID: %%a on port 3005...
  taskkill /f /pid %%a >nul 2>&1
)
echo Server stopped.
timeout /t 2 /nobreak >nul
