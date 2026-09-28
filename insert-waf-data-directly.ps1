# Insert WAF data directly into database
Write-Host "Inserting sample WAF data directly to database..." -ForegroundColor Cyan

$sql = "INSERT INTO security_events (severity, attack_type, source_ip, target, ai_confidence, risk_score, status, sensor_source, raw_payload, created_at) VALUES ('CRITICAL', 'SQL Injection', '203.0.113.42', 'example.com/search', 85.5, 95, 'BLOCKED', 'waf', '{\"rule_id\": \"942100\"}', NOW() - INTERVAL '5 minutes'), ('HIGH', 'XSS', '192.0.2.15', 'example.com/login', 80.2, 85, 'BLOCKED', 'waf', '{\"rule_id\": \"941100\"}', NOW() - INTERVAL '10 minutes'), ('HIGH', 'Command Injection', '198.51.100.23', 'example.com/admin.php', 82.7, 88, 'BLOCKED', 'waf', '{\"rule_id\": \"933150\"}', NOW() - INTERVAL '15 minutes'), ('CRITICAL', 'Path Traversal', '203.0.113.87', 'example.com/etc/passwd', 90.1, 92, 'BLOCKED', 'waf', '{\"rule_id\": \"930110\"}', NOW() - INTERVAL '20 minutes'), ('CRITICAL', 'SQL Injection', '198.51.100.91', 'example.com/search', 88.3, 93, 'BLOCKED', 'waf', '{\"rule_id\": \"9500001\"}', NOW() - INTERVAL '25 minutes'), ('HIGH', 'XSS', '192.0.2.44', 'example.com/search', 81.5, 86, 'BLOCKED', 'waf', '{\"rule_id\": \"941110\"}', NOW() - INTERVAL '30 minutes'), ('MEDIUM', 'Protocol Violation', '203.0.113.100', 'example.com/api/users', 65.0, 60, 'MONITORED', 'waf', '{\"rule_id\": \"920100\"}', NOW() - INTERVAL '35 minutes'), ('CRITICAL', 'Command Injection', '198.51.100.200', 'example.com/upload', 89.8, 94, 'BLOCKED', 'waf', '{\"rule_id\": \"933140\"}', NOW() - INTERVAL '40 minutes');"

docker exec -i fanos-db psql -U fanos -d fanos_db -c $sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success! Inserted 8 WAF events" -ForegroundColor Green
    Write-Host ""
    Write-Host "WAF UI: http://localhost:3000/secops/web/waf" -ForegroundColor Yellow
    Write-Host "Refresh the page to see the data" -ForegroundColor Yellow
} else {
    Write-Host "Failed to insert data" -ForegroundColor Red
}
