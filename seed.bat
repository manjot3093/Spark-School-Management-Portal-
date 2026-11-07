@echo off
title Spark ERP - Demo Data Seeder
echo ===================================================
echo           Spark ERP Demo Data Seeder
echo ===================================================
echo.
echo [*] Seeding rich demo data into MongoDB Atlas...
echo.

pushd "%~dp0backend"
call node scripts/seedFullDemoData.js
popd

echo.
echo ===================================================
echo  Demo data has been populated across all modules!
echo ===================================================
echo.
pause
