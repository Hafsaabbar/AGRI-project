@echo off
echo Starting AgriMart Environment...
cd /d "%~dp0"

echo Checking for Oracle Wallet...
if not exist "server\wallet\cwallet.sso" (
    echo [WARNING] Oracle Wallet files not detected in server\wallet!
    echo Connection to database will likely fail.
) else (
    echo [OK] Wallet found.
)

echo Starting Backend Server...
start "AgriMart Server" cmd /k "cd server && npm install && node index.js"

echo Waiting for server to initialize...
timeout /t 5 >nul

echo Starting Frontend Client...
start "AgriMart Client" cmd /k "cd client && npm install && npm run dev"

echo.
echo ==================================================
echo AgriMart is running!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo ==================================================
echo.
pause
