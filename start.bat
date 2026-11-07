@echo off
setlocal enabledelayedexpansion
title Spark ERP Launcher

echo ===================================================
echo           Starting Spark ERP (School Portal)
echo ===================================================
echo.

:: 1. Verify Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js was not found in your system PATH!
    echo Please install Node.js from https://nodejs.org or add it to PATH.
    echo.
    pause
    exit /b 1
)

:: 2. Check and free existing processes on Port 5000 and 5173 to prevent EADDRINUSE crashes
echo [*] Checking and freeing ports 5000 and 5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5000, 5173 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 3. Verify dependencies
if not exist "%~dp0backend\node_modules\" (
    echo [*] Backend dependencies missing. Installing...
    pushd "%~dp0backend"
    call npm install
    popd
)

if not exist "%~dp0school portal\node_modules\" (
    echo [*] Frontend dependencies missing. Installing...
    pushd "%~dp0school portal"
    call npm install
    popd
)

:: 4. Launch Backend in a dedicated window
echo.
echo [1/2] Launching Backend on http://localhost:5000 ...
start "Spark ERP - Backend (Port 5000)" /D "%~dp0backend" cmd /k "npm start"

:: Small delay to allow backend to initialize first
ping 127.0.0.1 -n 3 >nul

:: 5. Launch Frontend in a dedicated window
echo [2/2] Launching Frontend on http://localhost:5173 ...
start "Spark ERP - Frontend (Port 5173)" /D "%~dp0school portal" cmd /k "npm run dev"

echo.
echo ===================================================
echo  Both services launched in separate windows!
echo  - Backend API:       http://localhost:5000/api
echo  - Swagger API Docs:  http://localhost:5000/api-docs
echo  - Frontend App: http://localhost:5173
echo ===================================================
echo.
echo Press any key to close this launcher window (services will stay running)...
pause >nul
exit /b 0
