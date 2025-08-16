@echo off
echo ========================================
echo   Gatimbi Library Portal - Quick Start
echo ========================================
echo.

echo Checking prerequisites...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and restart your computer after installation.
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
    node --version
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available!
    echo.
    echo Please restart your computer after Node.js installation.
    echo.
    pause
    exit /b 1
) else (
    echo ✅ npm is available
    npm --version
)

echo.
echo Installing server dependencies...
cd server
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install server dependencies
    pause
    exit /b 1
)

echo.
echo Installing client dependencies...
cd ..\client
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install client dependencies
    pause
    exit /b 1
)

echo.
echo ✅ All dependencies installed successfully!
echo.
echo ========================================
echo   Next Steps:
echo ========================================
echo.
echo 1. Install MongoDB from: https://www.mongodb.com/try/download/community
echo 2. Start MongoDB service: net start MongoDB
echo 3. Configure environment variables (see INSTALLATION.md)
echo 4. Run setup: cd server && npm run setup
echo 5. Start server: cd server && npm run dev
echo 6. Start client: cd client && npm run dev
echo.
echo For detailed instructions, see INSTALLATION.md
echo.
pause
