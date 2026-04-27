@echo off
title AI Infra Learning - Electron Dev
echo Starting AI Infra Learning Electron dev mode...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Dev.ps1" %*
pause
