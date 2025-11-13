@echo off
title VIBER BREACH SYSTEM - INSTALLATION
color 0A
cd /d "%~dp0"
echo.
echo ═══════════════════════════════════════════════════
echo VIBER BREACH SYSTEM - INSTALLATION
echo ═══════════════════════════════════════════════════
echo.
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo Node.js: OK
node --version
echo.
echo Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed!
    echo.
    pause
    exit /b 1
)
echo npm: OK
npm --version
echo.
echo ═══════════════════════════════════════════════════
echo Installing dependencies...
echo ═══════════════════════════════════════════════════
echo.
npm install
echo.
echo ═══════════════════════════════════════════════════
echo INSTALLATION COMPLETE!
echo ═══════════════════════════════════════════════════
echo.
echo Next steps:
echo 1. Run START-SERVER.bat on PC
echo 2. Run START-LAPTOP.bat on LAPTOP
echo 3. Run START-APP.bat on PC
echo.
echo Read README.md for detailed instructions.
echo.
pause
