param(
    [switch]$WithTelegramBot
)

# FANOS AI & FANOS WAF - Full Platform Startup Script (PowerShell)
# Run from the project root: .\start-all.ps1
# Optional: .\start-all.ps1 -WithTelegramBot

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     FANOS AI - Unified AI-Powered Cybersecurity Platform       " -ForegroundColor Cyan
Write-Host "   ML URL Threat Detection, Suricata/Zeek IDS, and WAF Systems  " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = $PSScriptRoot
if (-not $rootPath) { $rootPath = Get-Location }

# 1. Check prerequisites
$nodeOk   = Get-Command node   -ErrorAction SilentlyContinue
$npmOk    = Get-Command npm    -ErrorAction SilentlyContinue
$pythonOk = Get-Command python -ErrorAction SilentlyContinue

if (-not $nodeOk)   { Write-Host "[!] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red; exit 1 }
if (-not $npmOk)    { Write-Host "[!] npm not found."   -ForegroundColor Red; exit 1 }
if (-not $pythonOk) { Write-Host "[!] Python not found. Install from https://python.org" -ForegroundColor Red; exit 1 }

Write-Host "[+] Prerequisites checked:" -ForegroundColor Green
Write-Host "  - Node.js $(node --version)"
Write-Host "  - npm v$(npm --version)"
Write-Host "  - Python $(python --version)"
Write-Host ""

# Helper function to check if port is in use
function Test-PortActive($port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

# 2. Start FANOS AI Backend (Port 8000)
$aiBackendPath = Join-Path $rootPath "backend"
if (Test-PortActive 8000) {
    Write-Host "[+] FANOS AI Backend is already running on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "Starting [1/5] FANOS AI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
    $aiBackendCmd = "try { `$host.UI.RawUI.WindowTitle = 'FANOS AI Backend (8000)' } catch {}; Set-Location -LiteralPath '$aiBackendPath'; & '$aiBackendPath\.venv\Scripts\python.exe' run.py"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $aiBackendCmd
}

# 3. Start FANOS AI Frontend (Port 3000)
$aiFrontendPath = Join-Path $rootPath "frontend"
if (Test-PortActive 3000) {
    Write-Host "[+] FANOS AI Frontend is already running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "Starting [2/5] FANOS AI Frontend on http://localhost:3000 ..." -ForegroundColor Yellow
    $aiFrontendCmd = "try { `$host.UI.RawUI.WindowTitle = 'FANOS AI Frontend (3000)' } catch {}; Set-Location -LiteralPath '$aiFrontendPath'; `$env:NODE_OPTIONS='--max-old-space-size=4096'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $aiFrontendCmd
}

# 4. Start FANOS WAF Backend (Port 8001)
$wafBackendPath = Join-Path $rootPath "fanos-waf\backend"
if (Test-PortActive 8001) {
    Write-Host "[+] FANOS WAF Backend is already running on http://127.0.0.1:8001" -ForegroundColor Green
} else {
    Write-Host "Starting [3/5] FANOS WAF Backend on http://127.0.0.1:8001 ..." -ForegroundColor Yellow
    $wafBackendCmd = "try { `$host.UI.RawUI.WindowTitle = 'FANOS WAF Backend (8001)' } catch {}; Set-Location -LiteralPath '$wafBackendPath'; & '$wafBackendPath\.venv\Scripts\python.exe' run.py"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $wafBackendCmd
}

# 5. Start FANOS WAF Frontend (Port 3001)
$wafFrontendPath = Join-Path $rootPath "fanos-waf\frontend"
if (Test-PortActive 3001) {
    Write-Host "[+] FANOS WAF Frontend is already running on http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "Starting [4/5] FANOS WAF Frontend on http://localhost:3001 ..." -ForegroundColor Yellow
    $wafFrontendCmd = "try { `$host.UI.RawUI.WindowTitle = 'FANOS WAF Frontend (3001)' } catch {}; Set-Location -LiteralPath '$wafFrontendPath'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $wafFrontendCmd
}

# 6. Start FANOS WAF Reverse Proxy Traffic Listener (Port 8002)
if (Test-PortActive 8002) {
    Write-Host "[+] FANOS WAF Reverse Proxy is already running on http://127.0.0.1:8002" -ForegroundColor Green
} else {
    Write-Host "Starting [5/5] FANOS WAF Reverse Proxy on http://127.0.0.1:8002 ..." -ForegroundColor Yellow
    $wafProxyCmd = "try { `$host.UI.RawUI.WindowTitle = 'FANOS WAF Traffic Proxy (8002)' } catch {}; Set-Location -LiteralPath '$wafBackendPath'; & '$wafBackendPath\.venv\Scripts\python.exe' proxy_listener.py"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $wafProxyCmd
}

# 7. Start Telegram Threat Intelligence Bot (Optional)
if ($WithTelegramBot) {
    $tbotPath = Join-Path $rootPath "integrations\telegram_bot"
    Write-Host "Starting [Optional] FANOS Telegram Bot ..." -ForegroundColor Yellow
    $tbotCmd = "try { `$host.UI.RawUI.WindowTitle = 'FANOS Telegram Threat Bot' } catch {}; Set-Location -LiteralPath '$tbotPath'; & '$aiBackendPath\.venv\Scripts\python.exe' telegram_bot.py"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $tbotCmd
}

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "         Unified FANOS AI Platform Services Launched!           " -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "  [FANOS AI Platform - Unified Browser Entry Point]" -ForegroundColor Green
Write-Host "  - Browser Entry Point: http://localhost:3000" -ForegroundColor Green
Write-Host "  - URL Threat Detection: http://localhost:3000/threat-detection" -ForegroundColor Green
Write-Host "  - Backend API:         http://localhost:8000" -ForegroundColor Green
Write-Host "  - Backend Health:      http://localhost:8000/api/health" -ForegroundColor Green
Write-Host "  - Swagger Docs:        http://localhost:8000/api/docs" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "  [FANOS WAF Dashboard & Engine]" -ForegroundColor Green
Write-Host "  - Frontend:            http://localhost:3001" -ForegroundColor Green
Write-Host "  - Management API:      http://127.0.0.1:8001" -ForegroundColor Green
Write-Host "  - Traffic Proxy:       http://127.0.0.1:8002 (Inline Protection)" -ForegroundColor Green
if ($WithTelegramBot) {
    Write-Host "" -ForegroundColor Green
    Write-Host "  [Telegram Bot]:        Active (integrations/telegram_bot)" -ForegroundColor Green
}
Write-Host "================================================================" -ForegroundColor Green
