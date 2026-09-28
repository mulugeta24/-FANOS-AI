# FANOS WAF Integration Test Script
# ===================================
# Tests the complete WAF → Backend pipeline

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "FANOS WAF INTEGRATION TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Verify WAF is running
Write-Host "[1/7] Checking WAF status..." -ForegroundColor Yellow
$wafStatus = docker ps --filter "name=fanos-waf" --format "{{.Status}}"
if ($wafStatus -like "*Up*") {
    Write-Host "✓ WAF is running" -ForegroundColor Green
} else {
    Write-Host "✗ WAF is not running" -ForegroundColor Red
    Write-Host "Start with: docker compose up -d waf" -ForegroundColor Yellow
    exit 1
}

# Test 2: Verify backend is running
Write-Host "`n[2/7] Checking backend status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Backend is not responding" -ForegroundColor Red
    Write-Host "Start with: docker compose up -d backend" -ForegroundColor Yellow
    exit 1
}

# Test 3: Send normal request to WAF
Write-Host "`n[3/7] Testing normal WAF traffic..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Normal traffic passes through (HTTP 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ WAF not accessible" -ForegroundColor Red
    exit 1
}

# Test 4: Send SQL injection attack (should be blocked)
Write-Host "`n[4/7] Testing SQL injection detection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/search?q=1' OR '1'='1" -TimeoutSec 5 -UseBasicParsing -SkipHttpErrorCheck
    if ($response.StatusCode -eq 403) {
        Write-Host "✓ SQL injection blocked (HTTP 403)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Unexpected status: HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Request failed" -ForegroundColor Red
}

# Test 5: Send FANOS custom rule test (time-based SQL injection)
Write-Host "`n[5/7] Testing FANOS custom rule 9500001..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/search?q=test' AND SLEEP(5)--" -TimeoutSec 5 -UseBasicParsing -SkipHttpErrorCheck
    if ($response.StatusCode -eq 403) {
        Write-Host "✓ FANOS rule triggered (HTTP 403)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Unexpected status: HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Request failed" -ForegroundColor Red
}

# Test 6: Wait for collector to process events
Write-Host "`n[6/7] Waiting for event processing..." -ForegroundColor Yellow
Write-Host "Waiting 10 seconds for collector to forward events..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Test 7: Query WAF events from backend API
Write-Host "`n[7/7] Querying WAF events from backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/waf/events?limit=5" -TimeoutSec 5 -UseBasicParsing
    $events = $response.Content | ConvertFrom-Json
    
    if ($events.Count -gt 0) {
        Write-Host "✓ Found $($events.Count) WAF events in backend" -ForegroundColor Green
        
        Write-Host "`nRecent WAF events:" -ForegroundColor Cyan
        foreach ($event in $events) {
            Write-Host "  • $($event.severity) - $($event.attack_type) from $($event.source_ip)" -ForegroundColor White
            Write-Host "    Target: $($event.target)" -ForegroundColor Gray
            Write-Host "    Risk Score: $($event.risk_score)" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠ No WAF events found yet" -ForegroundColor Yellow
        Write-Host "Events may still be processing. Check collector logs:" -ForegroundColor Gray
        Write-Host "  docker logs fanos-waf-collector" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to query WAF events: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Query WAF statistics
Write-Host "`n[8/7] Checking WAF statistics..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/waf/stats?hours=1" -TimeoutSec 5 -UseBasicParsing
    $stats = $response.Content | ConvertFrom-Json
    
    Write-Host "✓ WAF Statistics (last 1 hour):" -ForegroundColor Green
    Write-Host "  Total events:  $($stats.total_events)" -ForegroundColor White
    Write-Host "  Blocked:       $($stats.blocked)" -ForegroundColor White
    Write-Host "  Logged:        $($stats.logged)" -ForegroundColor White
    Write-Host "  Critical:      $($stats.critical)" -ForegroundColor Red
    Write-Host "  High:          $($stats.high)" -ForegroundColor Yellow
    Write-Host "  Medium:        $($stats.medium)" -ForegroundColor Cyan
    Write-Host "  Low:           $($stats.low)" -ForegroundColor Gray
} catch {
    Write-Host "⚠ Could not retrieve stats" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "INTEGRATION TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check collector logs:  docker logs -f fanos-waf-collector" -ForegroundColor Gray
Write-Host "2. View WAF events API:   http://localhost:8000/api/docs" -ForegroundColor Gray
Write-Host "3. Query database:        docker exec -it fanos-db psql -U fanos -d fanos_db" -ForegroundColor Gray
Write-Host "   SELECT * FROM security_events WHERE sensor_source='waf' ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Gray
