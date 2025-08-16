# Gatimbi Library Portal - Quick Start (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gatimbi Library Portal - Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js is installed" -ForegroundColor Green
        Write-Host "   Version: $nodeVersion" -ForegroundColor Gray
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Download the LTS version and restart your computer after installation." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ npm is available" -ForegroundColor Green
        Write-Host "   Version: $npmVersion" -ForegroundColor Gray
    } else {
        throw "npm not found"
    }
} catch {
    Write-Host "❌ npm is not available!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please restart your computer after Node.js installation." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Installing server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install server dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Installing client dependencies..." -ForegroundColor Yellow
Set-Location ..\client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install client dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ All dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Install MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor White
Write-Host "2. Start MongoDB service: net start MongoDB" -ForegroundColor White
Write-Host "3. Configure environment variables (see INSTALLATION.md)" -ForegroundColor White
Write-Host "4. Run setup: cd server && npm run setup" -ForegroundColor White
Write-Host "5. Start server: cd server && npm run dev" -ForegroundColor White
Write-Host "6. Start client: cd client && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see INSTALLATION.md" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to continue"
