@echo off
title Spark ERP Stopper
echo ===================================================
echo           Stopping Spark ERP Services
echo ===================================================
echo.
echo [*] Stopping services on port 5000 (Backend) and port 5173 (Frontend)...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Get-NetTCPConnection -LocalPort 5000, 5173 -State Listen -ErrorAction SilentlyContinue | " ^
    "Where-Object { $_.OwningProcess -gt 0 } | " ^
    "ForEach-Object { " ^
    "    Write-Host '  - Terminating process on port ' $_.LocalPort ' (PID ' $_.OwningProcess ')...'; " ^
    "    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue " ^
    "}"

echo.
echo [OK] All Spark ERP services have been stopped.
echo ===================================================
echo.
pause
