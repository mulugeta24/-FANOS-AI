# FANOS Suricata Backend Verification Script
# Verifies that the Windows backend is ready to receive events from Ubuntu collector

Write-Host "========================================"
Write-Host "FANOS Suricata Backend Verification"
Write-Host "========================================"
Write-Host ""

$backendPath = "c:\Fanos Aii\backend"
$envFile = Join-Path $backendPath ".env"

# Check if backend directory exists
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: Backend directory not found at $backendPath" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Checking backend configuration..." -ForegroundColor Cyan
Write-Host "---"

# Check .env file
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: Backend .env file not found at $envFile" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Backend .env file exists" -ForegroundColor Green

# Check for SURICATA_INGEST_TOKEN
$tokenLine = Select-String -Path $envFile -Pattern "^SURICATA_INGEST_TOKEN=" -ErrorAction SilentlyContinue
if ($tokenLine) {
    $token = ($tokenLine.Line -split "=", 2)[1].Trim()
    if ($token -and $token -ne "") {
        Write-Host "[OK] SURICATA_INGEST_TOKEN is configured" -ForegroundColor Green
        Write-Host "     Token: $($token.Substring(0, [Math]::Min(10, $token.Length)))..." -ForegroundColor Gray
    } else {
        Write-Host "[WARN] SURICATA_INGEST_TOKEN is empty" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] SURICATA_INGEST_TOKEN not found in .env" -ForegroundColor Red
    Write-Host "        Add: SURICATA_INGEST_TOKEN=your-secure-token-here" -ForegroundColor Yellow
    exit 1
}

# Check for required correlation settings
$correlationSettings = @(
    "FANOS_SURICATA_CORRELATION_WINDOW_SECONDS",
    "FANOS_SURICATA_CORRELATION_MAX_EVENTS",
    "FANOS_DEDUP_WINDOW_SECONDS"
)

foreach ($setting in $correlationSettings) {
    $line = Select-String -Path $envFile -Pattern "^$setting=" -ErrorAction SilentlyContinue
    if ($line) {
        Write-Host "[OK] $setting is configured" -ForegroundColor Green
    } else {
        Write-Host "[WARN] $setting not found (using defaults)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Step 2: Checking database configuration..." -ForegroundColor Cyan
Write-Host "---"

$dbLine = Select-String -Path $envFile -Pattern "^DATABASE_URL=" -ErrorAction SilentlyContinue
if ($dbLine) {
    $dbUrl = ($dbLine.Line -split "=", 2)[1].Trim()
    Write-Host "[OK] DATABASE_URL is configured" -ForegroundColor Green
    if ($dbUrl -match "localhost|127\.0\.0\.1") {
        Write-Host "     Database: PostgreSQL (localhost)" -ForegroundColor Gray
    }
} else {
    Write-Host "[ERROR] DATABASE_URL not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Checking Redis configuration..." -ForegroundColor Cyan
Write-Host "---"

$redisLine = Select-String -Path $envFile -Pattern "^REDIS_URL=" -ErrorAction SilentlyContinue
if ($redisLine) {
    $redisUrl = ($redisLine.Line -split "=", 2)[1].Trim()
    if ($redisUrl -and $redisUrl -ne "") {
        Write-Host "[OK] REDIS_URL is configured" -ForegroundColor Green
        Write-Host "     Redis: $redisUrl" -ForegroundColor Gray
    } else {
        Write-Host "[WARN] REDIS_URL is empty (deduplication disabled)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] REDIS_URL not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 4: Checking backend API endpoint..." -ForegroundColor Cyan
Write-Host "---"

# Check if backend is running
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Backend is running and responding" -ForegroundColor Green
    Write-Host "     Service: $($healthResponse.service)" -ForegroundColor Gray
    Write-Host "     Version: $($healthResponse.version)" -ForegroundColor Gray
    Write-Host "     Status: $($healthResponse.status)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Backend is not responding at http://localhost:8000/health" -ForegroundColor Red
    Write-Host "        Start backend with: cd '$backendPath'; python run.py" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Continuing verification (backend must be running for Ubuntu connection)..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 5: Checking Windows Firewall..." -ForegroundColor Cyan
Write-Host "---"

# Check if port 8000 is allowed
$firewallRule = Get-NetFirewallRule -DisplayName "FANOS Backend" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "[OK] Firewall rule 'FANOS Backend' exists" -ForegroundColor Green
    
    $portFilter = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $firewallRule -ErrorAction SilentlyContinue
    if ($portFilter) {
        Write-Host "     Local Port: $($portFilter.LocalPort)" -ForegroundColor Gray
    }
} else {
    Write-Host "[WARN] Firewall rule 'FANOS Backend' not found" -ForegroundColor Yellow
    Write-Host "       Ubuntu VM may not be able to connect" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create firewall rule, run as Administrator:" -ForegroundColor Yellow
    Write-Host "New-NetFirewallRule -DisplayName 'FANOS Backend' -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Step 6: Checking network adapter..." -ForegroundColor Cyan
Write-Host "---"

# Check for VirtualBox Host-Only adapter with 192.168.56.1
$hostOnlyAdapter = Get-NetIPAddress -IPAddress "192.168.56.1" -ErrorAction SilentlyContinue
if ($hostOnlyAdapter) {
    Write-Host "[OK] Host-Only network adapter configured with IP 192.168.56.1" -ForegroundColor Green
    Write-Host "     Interface: $($hostOnlyAdapter.InterfaceAlias)" -ForegroundColor Gray
} else {
    Write-Host "[WARN] 192.168.56.1 not found on any network adapter" -ForegroundColor Yellow
    Write-Host "       Ensure VirtualBox Host-Only adapter is configured" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================"
Write-Host "Verification Summary"
Write-Host "========================================"
Write-Host ""

Write-Host "Backend Configuration:" -ForegroundColor Cyan
Write-Host "  Location: $backendPath"
Write-Host "  Configuration: $envFile"
Write-Host "  Endpoint: http://192.168.56.1:8000/api/v1/suricata/events"
Write-Host ""

Write-Host "Ubuntu Collector Configuration:" -ForegroundColor Cyan
Write-Host "  FANOS_SURICATA_URL: http://192.168.56.1:8000/api/v1/suricata/events"
Write-Host "  FANOS_SURICATA_TOKEN: <must match SURICATA_INGEST_TOKEN above>"
Write-Host "  SURICATA_SENSOR_ID: ubuntu-suricata-01"
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Ensure backend is running:"
Write-Host "     cd '$backendPath'"
Write-Host "     python run.py"
Write-Host ""
Write-Host "  2. Configure Windows Firewall (if not already done):"
Write-Host "     New-NetFirewallRule -DisplayName 'FANOS Backend' -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow"
Write-Host ""
Write-Host "  3. Deploy collector on Ubuntu VM:"
Write-Host "     See: suricata-lab/collector/UBUNTU_DEPLOYMENT.md"
Write-Host ""
Write-Host "  4. Test connection from Ubuntu:"
Write-Host "     curl -i http://192.168.56.1:8000/health"
Write-Host ""
