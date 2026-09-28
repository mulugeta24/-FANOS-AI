# ──────────────────────────────────────────────────────────────
# FANOS WAF — Test Runner (PowerShell)
# ──────────────────────────────────────────────────────────────
#
# Usage:  .\run_tests.ps1
# From:   security-engines\waf\tests\
#
# ──────────────────────────────────────────────────────────────

param(
    [switch]$SkipStartup,
    [switch]$Verbose
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       FANOS WAF — Test Runner                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$ProjectRoot = (Get-Item "$PSScriptRoot\..\..\..").FullName
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray

# ── Step 1: Start WAF services ──────────────────────────────
if (-not $SkipStartup) {
    Write-Host ""
    Write-Host "Starting WAF services..." -ForegroundColor Yellow

    docker compose -f "$ProjectRoot\docker-compose.yml" up -d waf-test-app waf
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to start WAF services" -ForegroundColor Red
        exit 1
    }

    Write-Host "✓ WAF services started" -ForegroundColor Green

    # Wait for health
    Write-Host ""
    Write-Host "Waiting for WAF to become healthy..." -ForegroundColor Yellow

    $maxWait = 60
    $elapsed = 0
    $healthy = $false

    while ($elapsed -lt $maxWait) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/" `
                -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        } catch {
            # WAF not ready yet
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
        if ($elapsed % 10 -eq 0) {
            Write-Host "  Still waiting... ($elapsed`s)" -ForegroundColor Gray
        }
    }

    if (-not $healthy) {
        Write-Host "✗ WAF did not become healthy within $maxWait seconds" -ForegroundColor Red
        Write-Host ""
        Write-Host "Checking container status:" -ForegroundColor Yellow
        docker compose -f "$ProjectRoot\docker-compose.yml" ps waf-test-app waf
        Write-Host ""
        Write-Host "WAF logs:" -ForegroundColor Yellow
        docker logs --tail 20 fanos-waf
        exit 1
    }

    Write-Host "✓ WAF is healthy and responding" -ForegroundColor Green
}

# ── Step 2: Run tests ───────────────────────────────────────
Write-Host ""
Write-Host "Running test suite..." -ForegroundColor Yellow
Write-Host ""

$testArgs = @("$PSScriptRoot\test_waf.py", "--skip-wait")
if ($Verbose) {
    $testArgs += "--verbose"
}

python @testArgs
$testExitCode = $LASTEXITCODE

# ── Step 3: Show container status ───────────────────────────
Write-Host ""
Write-Host "Container status:" -ForegroundColor Yellow
docker compose -f "$ProjectRoot\docker-compose.yml" ps waf-test-app waf

Write-Host ""
if ($testExitCode -eq 0) {
    Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ All WAF tests passed!                        ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ✗ Some WAF tests failed                        ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Red
}

exit $testExitCode
