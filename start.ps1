Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          Starting Spark ERP (School Portal)       " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Free ports 5000 and 5173 if currently occupied
Write-Host "`n[*] Freeing ports 5000 and 5173 if in use..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 5000, 5173 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object {
    Write-Host "  Closing existing process on port $($_.LocalPort) (PID $($_.OwningProcess))..." -ForegroundColor DarkYellow
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Check dependencies
if (-not (Test-Path "$scriptDir\backend\node_modules")) {
    Write-Host "[*] Backend dependencies missing. Installing..." -ForegroundColor Yellow
    npm --prefix "$scriptDir\backend" install
}

if (-not (Test-Path "$scriptDir\school portal\node_modules")) {
    Write-Host "[*] Frontend dependencies missing. Installing..." -ForegroundColor Yellow
    npm --prefix "$scriptDir\school portal" install
}

Write-Host "`n[1/2] Launching Backend on http://localhost:5000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\backend'; Write-Host '--- SPARK ERP BACKEND (Port 5000) ---' -ForegroundColor Yellow; npm start"

Start-Sleep -Seconds 2

Write-Host "[2/2] Launching Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\school portal'; Write-Host '--- SPARK ERP FRONTEND (Port 5173) ---' -ForegroundColor Yellow; npm run dev"

Write-Host "`nBoth services are starting in dedicated terminal windows!" -ForegroundColor Cyan
Write-Host "  - Backend API:  http://localhost:5000/api" -ForegroundColor Gray
Write-Host "  - Frontend App: http://localhost:5173" -ForegroundColor Gray
