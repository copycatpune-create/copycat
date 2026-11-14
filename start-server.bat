@echo off
title Copycat Copiers - Web Printing App Server
cd /d "%~dp0"

:loop
echo ========================================================
echo   Copycat Copiers Web Printing System
echo   Online at: http://localhost:3005
echo   Network/Mobile: http://192.168.1.34:3005
echo ========================================================
"C:\Program Files\nodejs\node.exe" server.js
echo.
echo [Warning: Server process stopped at %TIME%]
echo Auto-restarting server in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
