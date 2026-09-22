@echo off
title ShopScout Server & Admin Launcher
echo ==================================================
echo   Starting ShopScout E-Commerce & Auto-Detect Server...
echo ==================================================
cd /d "%~dp0"

:: Start Node.js server
start "ShopScout Server" cmd /k "node server.js"

:: Wait 2 seconds for server to start
timeout /t 2 /nobreak >nul

:: Open browser directly to Admin Products page
start http://localhost:3000/admin/products.html

echo.
echo [OK] Server started on http://localhost:3000
echo [OK] Opened Admin Panel in browser.
echo You can keep the server window running in background.
echo ==================================================
