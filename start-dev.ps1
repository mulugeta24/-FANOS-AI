# FANOS AI — Development Startup Script (PowerShell)
# Run from the project root: .\start-dev.ps1

Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          FANOS AI — Development Server           ║" -ForegroundColor Cyan
Write-Host "║  AI-Powered Intrusion Detection & Response       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Check prerequisites ──────────────────────────────────────
$nodeOk   = Get-Command node   -ErrorAction SilentlyContinue
$npmOk    = Get-Command npm    -ErrorAction SilentlyContinue
$pythonOk = Get-Command python -ErrorAction SilentlyContinue

if (-not $nodeOk)   { Write-Host "✗ Node.js not found. Install from https://nodejs.org" -ForegroundColor Red; exit 1 }
if (-not $npmOk)    { Write-Host "✗ npm not found."   -ForegroundColor Red; exit 1 }
if (-not $pythonOk) { Write-Host "✗ Python not found. Install from https://python.org" -ForegroundColor Red; exit 1 }

Write-Host "✓ Node.js $(node --version)" -ForegroundColor Green
Write-Host "✓ Python $(python --version)" -ForegroundColor Green
Write-Host ""

# ── Backend setup ────────────────────────────────────────────
Write-Host "Setting up backend..." -ForegroundColor Yellow
Set-Location backend

if (-not (Test-Path ".venv")) {
    Write-Host "  Creating virtual environment..."
    python -m venv .venv
}

Write-Host "  Activating virtual environment..."
& .\.venv\Scripts\Activate.ps1

Write-Host "  Installing Python dependencies..."
pip install -r requirements.txt --quiet

if (-not (Test-Path ".env")) {
    Write-Host "  Creating .env from .env.example..."
    Copy-Item .env.example .env
    Write-Host "  ⚠  Edit backend\.env with your DATABASE_URL and SECRET_KEY" -ForegroundColor Yellow
}

Write-Host "  Starting FastAPI backend on http://localhost:8000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\.venv\Scripts\Activate.ps1; python run.py"

Set-Location ..

# ── Frontend setup ───────────────────────────────────────────
Write-Host ""
Write-Host "Setting up frontend..." -ForegroundColor Yellow
Set-Location frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing npm packages (first run — takes a few minutes)..."
    npm install
} else {
    Write-Host "  node_modules found, skipping npm install"
}

Write-Host "  Starting Vite dev server on http://localhost:3000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Set-Location ..

# ── Done ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  FANOS AI is starting up!                        ║" -ForegroundColor Green
Write-Host "║                                                  ║" -ForegroundColor Green
Write-Host "║  Frontend  →  http://localhost:3000              ║" -ForegroundColor Green
Write-Host "║  Backend   →  http://localhost:8000              ║" -ForegroundColor Green
Write-Host "║  API Docs  →  http://localhost:8000/api/docs     ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
