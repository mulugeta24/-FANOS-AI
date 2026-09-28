# Generate Sample WAF Data for UI Testing
Write-Host "Generating sample WAF data..." -ForegroundColor Cyan

$backendUrl = "http://localhost:8000/api/v1/waf/events"

# Sample WAF events with correct schema
$sampleEvents = @(
    @{
        event_id = "waf-001"
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        request_id = "req-001"
        source_ip = "203.0.113.42"
        http_method = "GET"
        request_uri = "/search?q=1' OR '1'='1"
        host = "example.com"
        user_agent = "Mozilla/5.0"
        rule_id = "942100"
        rule_message = "SQL Injection Attack Detected via libinjection"
        rule_source = "OWASP_CRS"
        severity = "CRITICAL"
        anomaly_score = 5
        action = "BLOCK"
        status_code = 403
        tags = @("attack-sqli", "OWASP_CRS/WEB_ATTACK/SQL_INJECTION")
    },
    @{
        event_id = "waf-002"
        timestamp = (Get-Date).AddMinutes(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        request_id = "req-002"
        source_ip = "198.51.100.23"
        http_method = "GET"
        request_uri = "/admin.php?cmd=ls"
        host = "example.com"
        user_agent = "curl/7.68.0"
        rule_id = "933150"
        rule_message = "PHP Injection Attack: Configuration Directive Found"
        rule_source = "OWASP_CRS"
        severity = "HIGH"
        anomaly_score = 4
        action = "BLOCK"
        status_code = 403
        tags = @("attack-injection-php", "OWASP_CRS/WEB_ATTACK/COMMAND_INJECTION")
    },
    @{
        event_id = "waf-003"
        timestamp = (Get-Date).AddMinutes(-10).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        request_id = "req-003"
        source_ip = "192.0.2.15"
        http_method = "POST"
        request_uri = "/login"
        host = "example.com"
        user_agent = "Python-urllib/3.9"
        rule_id = "941100"
        rule_message = "XSS Attack Detected via libinjection"
        rule_source = "OWASP_CRS"
        severity = "HIGH"
        anomaly_score = 4
        action = "BLOCK"
        status_code = 403
        tags = @("attack-xss", "OWASP_CRS/WEB_ATTACK/XSS")
    },
    @{
        event_id = "waf-004"
        timestamp = (Get-Date).AddMinutes(-15).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        request_id = "req-004"
        source_ip = "203.0.113.87"
        http_method = "GET"
        request_uri = "/../../etc/passwd"
        host = "example.com"
        user_agent = "Mozilla/5.0"
        rule_id = "930110"
        rule_message = "Path Traversal Attack (/../)"
        rule_source = "OWASP_CRS"
        severity = "CRITICAL"
        anomaly_score = 5
        action = "BLOCK"
        status_code = 403
        tags = @("attack-lfi", "OWASP_CRS/WEB_ATTACK/FILE_INJECTION")
    },
    @{
        event_id = "waf-005"
        timestamp = (Get-Date).AddMinutes(-20).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        request_id = "req-005"
        source_ip = "198.51.100.91"
        http_method = "GET"
        request_uri = "/search?q=test' AND SLEEP(5)--"
        host = "example.com"
        user_agent = "sqlmap/1.5"
        rule_id = "9500001"
        rule_message = "[FANOS] Time-based SQL Injection Detected"
        rule_source = "FANOS_CUSTOM"
        severity = "CRITICAL"
        anomaly_score = 5
        action = "BLOCK"
        status_code = 403
        tags = @("attack-sqli", "FANOS/CUSTOM/SQL_INJECTION")
    },
    @{
        event_id = "waf-006"
        timestamp = (Get-Date).AddMinutes(-25).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        request_id = "req-006"
        source_ip = "192.0.2.44"
        http_method = "GET"
        request_uri = "/search?q=<script>alert('xss')</script>"
        host = "example.com"
        user_agent = "Mozilla/5.0"
        rule_id = "941110"
        rule_message = "XSS Filter - Category 1: Script Tag Vector"
        rule_source = "OWASP_CRS"
        severity = "HIGH"
        anomaly_score = 4
        action = "BLOCK"
        status_code = 403
        tags = @("attack-xss", "OWASP_CRS/WEB_ATTACK/XSS")
    },
    @{
        event_id = "waf-007"
        timestamp = (Get-Date).AddMinutes(-30).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        request_id = "req-007"
        source_ip = "203.0.113.100"
        http_method = "GET"
        request_uri = "/api/users"
        host = "example.com"
        user_agent = "Mozilla/5.0"
        rule_id = "920100"
        rule_message = "Invalid HTTP Request Line"
        rule_source = "OWASP_CRS"
        severity = "MEDIUM"
        anomaly_score = 3
        action = "LOG"
        status_code = 200
        tags = @("attack-protocol", "OWASP_CRS/PROTOCOL_VIOLATION")
    },
    @{
        event_id = "waf-008"
        timestamp = (Get-Date).AddMinutes(-35).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        request_id = "req-008"
        source_ip = "198.51.100.200"
        http_method = "POST"
        request_uri = "/upload"
        host = "example.com"
        user_agent = "PostmanRuntime/7.29.0"
        rule_id = "933140"
        rule_message = "Remote Command Execution: Unix Shell Code Found"
        rule_source = "OWASP_CRS"
        severity = "CRITICAL"
        anomaly_score = 5
        action = "BLOCK"
        status_code = 403
        tags = @("attack-rce", "OWASP_CRS/WEB_ATTACK/COMMAND_INJECTION")
    }
)

$successCount = 0
$failCount = 0

foreach ($event in $sampleEvents) {
    try {
        $json = $event | ConvertTo-Json -Depth 5
        $response = Invoke-RestMethod -Uri $backendUrl -Method Post -Body $json -ContentType "application/json" -ErrorAction Stop
        Write-Host "Created: $($event.rule_message)" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "Failed: $($event.rule_message)" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Results: $successCount created, $failCount failed" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WAF UI: http://localhost:3000/secops/web/waf" -ForegroundColor Yellow
Write-Host "Refresh the page to see the data" -ForegroundColor Yellow
