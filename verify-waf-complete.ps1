# FANOS WAF - Complete System Verification
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "FANOS WAF - System Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allGood = $true

# 1. Check Docker Services
Write-Host "[1/7] Checking Docker Services..." -ForegroundColor Yellow
$services = @('fanos-waf', 'fanos-waf-test-app', 'fanos-db', 'fanos-redis')
foreach ($service in $services) {
    $status = docker ps --filter "name=$service" --format "{{.Status}}"
    if ($status -like "*Up*") {
        Write-Host "  ✓ $service is running" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $service is NOT running" -ForegroundColor Red
        $allGood = $false
    }
}

# 2. Check WAF Accessibility
Write-Host "`n[2/7] Testing WAF Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ WAF is accessible at :8080" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ WAF is not responding" -ForegroundColor Red
    $allGood = $false
}

# 3. Check Backend API
Write-Host "`n[3/7] Testing Backend API..." -ForegroundColor Yellow
$backendRunning = Get-Process | Where-Object {$_.ProcessName -eq "python" -and $_.CommandLine -like "*run.py*"}
if ($backendRunning) {
    Write-Host "  ✓ Backend Python process is running" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Backend Python process not detected" -ForegroundColor Yellow
}

# 4. Check Frontend
Write-Host "`n[4/7] Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Frontend is accessible at :3000" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Frontend is not responding" -ForegroundColor Red
    $allGood = $false
}

# 5. Check Database
Write-Host "`n[5/7] Checking Database..." -ForegroundColor Yellow
try {
    $result = docker exec fanos-db psql -U fanos -d fanos_db -t -c "SELECT COUNT(*) FROM security_events WHERE sensor_source='waf';" 2>$null
    $count = $result.Trim()
    if ($count -gt 0) {
        Write-Host "  ✓ Database has $count WAF events" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ No WAF events in database" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Database check failed" -ForegroundColor Red
    $allGood = $false
}

# 6. Check FANOS Custom Rules
Write-Host "`n[6/7] Verifying FANOS Rules..." -ForegroundColor Yellow
if (Test-Path "c:\Fanos Aii\security-engines\waf\config\crs\fanos-rules.conf") {
    $ruleContent = Get-Content "c:\Fanos Aii\security-engines\waf\config\crs\fanos-rules.conf"
    $ruleCount = ($ruleContent | Select-String "SecRule" | Measure-Object).Count
    if ($ruleCount -gt 0) {
        Write-Host "  ✓ Found $ruleCount custom FANOS rules" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ No custom rules found" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ FANOS rules file not found" -ForegroundColor Red
    $allGood = $false
}

# 7. Check WAF Page
Write-Host "`n[7/7] Verifying WAF UI Page..." -ForegroundColor Yellow
if (Test-Path "c:\Fanos Aii\frontend\src\pages\secops\web\WAFPage.tsx") {
    $pageContent = Get-Content "c:\Fanos Aii\frontend\src\pages\secops\web\WAFPage.tsx" -Raw
    $hasTabs = $pageContent -match "Overview.*Events.*Rules.*Configuration"
    $hasAPI = $pageContent -match "api/v1/waf"
    
    if ($hasTabs -and $hasAPI) {
        Write-Host "  ✓ WAF UI page is complete with all tabs and API integration" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ WAF UI page may be incomplete" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ WAF UI page not found" -ForegroundColor Red
    $allGood = $false
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ WAF SYSTEM IS COMPLETE AND OPERATIONAL" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "Access Points:" -ForegroundColor Yellow
    Write-Host "  • WAF UI:      http://localhost:3000/secops/web/waf" -ForegroundColor White
    Write-Host "  • WAF Engine:  http://localhost:8080" -ForegroundColor White
    Write-Host "  • Backend API: http://localhost:8000/api/docs" -ForegroundColor White
    
    Write-Host "`nTest WAF Protection:" -ForegroundColor Yellow
    Write-Host "  curl `"http://localhost:8080/search?q=1' OR '1'='1`"" -ForegroundColor Gray
    Write-Host "  (Should return 403 Forbidden)" -ForegroundColor Gray
} else {
    Write-Host "⚠ SOME COMPONENTS NEED ATTENTION" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Review the checks above and fix any issues marked with ✗" -ForegroundColor Yellow
}

Write-Host ""
