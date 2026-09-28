# ──────────────────────────────────────────────────────────────
# FANOS WAF Startup Script
# ──────────────────────────────────────────────────────────────
#
# This script starts the WAF services and ensures they're properly
# configured.
#
# Usage: .\start-waf.ps1
# From:  security-engines\waf\
# ──────────────────────────────────────────────────────────────

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       FANOS WAF — Startup Script                 ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$ProjectRoot = (Get-Item "$PSScriptRoot\..\..\").FullName
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray

# ── Step 1: Start WAF services ──────────────────────────────
Write-Host ""
Write-Host "Starting WAF services..." -ForegroundColor Yellow

Set-Location $ProjectRoot
docker compose up -d waf-test-app waf

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start WAF services" -ForegroundColor Red
    exit 1
}

Write-Host "✓ WAF containers started" -ForegroundColor Green

# ── Step 2: Fix nginx in test-app (Windows issue workaround) ─
Write-Host ""
Write-Host "Ensuring nginx is running in test-app container..." -ForegroundColor Yellow

Start-Sleep -Seconds 3

# Kill any stuck nginx processes and start fresh
docker exec fanos-waf-test-app sh -c "killall nginx 2>/dev/null || true; nginx"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start nginx in test-app" -ForegroundColor Red
    exit 1
}

Write-Host "✓ nginx started in test-app" -ForegroundColor Green

# ── Step 3: Copy test HTML file into container ───────────────
Write-Host ""
Write-Host "Copying test application files..." -ForegroundColor Yellow

$TestAppPath = Join-Path $ProjectRoot "security-engines\waf\tests\test-app"

docker cp "$TestAppPath\index.html" fanos-waf-test-app:/usr/share/nginx/html/index.html

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Warning: Could not copy test HTML file" -ForegroundColor Yellow
} else {
    Write-Host "✓ Test application files copied" -ForegroundColor Green
}

# ── Step 4: Fix WAF nginx config (remove root directive) ─────
Write-Host ""
Write-Host "Fixing WAF nginx configuration..." -ForegroundColor Yellow

docker exec fanos-waf sh -c 'cat > /etc/nginx/conf.d/default.conf << "EOF"
# Nginx configuration for both HTTP and SSL
server_tokens off;
more_set_headers "Server: nginx";

map $http_upgrade $connection_upgrade {
    default upgrade;
    "" close;
}

server {
    listen 8080 default_server;
    server_name localhost;
    set $always_redirect off;
    
    location / {
        client_max_body_size 0;
        if ($always_redirect = on) {
            return 301 https://$host$request_uri;
        }
        include includes/cors.conf;
        include includes/proxy_backend.conf;
    }
    
    include includes/location_common.conf;
}

server {
    listen 8443 ssl;
    server_name localhost;
    ssl_certificate /etc/nginx/conf/server.crt;
    ssl_certificate_key /etc/nginx/conf/server.key;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozSSL:10m;
    ssl_session_tickets off;
    ssl_dhparam /etc/ssl/certs/dhparam-2048.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_verify_client off;
    ssl_verify_depth 1;
    
    location / {
        client_max_body_size 0;
        include includes/cors.conf;
        include includes/proxy_backend.conf;
    }
    
    include includes/location_common.conf;
}
EOF'

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to update nginx config" -ForegroundColor Red
    exit 1
}

# Reload nginx
docker exec fanos-waf nginx -s reload

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to reload nginx" -ForegroundColor Red
    exit 1
}

Write-Host "✓ WAF nginx configuration fixed and reloaded" -ForegroundColor Green

# ── Step 4: Wait for WAF to be healthy ──────────────────────
Write-Host ""
Write-Host "Waiting for WAF to become healthy..." -ForegroundColor Yellow

$maxWait = 30
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
}

if (-not $healthy) {
    Write-Host "⚠ WAF did not respond within $maxWait seconds" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Container status:" -ForegroundColor Yellow
    docker compose ps waf-test-app waf
    Write-Host ""
    Write-Host "Try running: docker logs fanos-waf" -ForegroundColor Gray
} else {
    Write-Host "✓ WAF is healthy and responding" -ForegroundColor Green
}

# ── Step 5: Show status ──────────────────────────────────────
Write-Host ""
Write-Host "Container status:" -ForegroundColor Yellow
docker compose ps waf-test-app waf

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ FANOS WAF is running                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "WAF URL:        http://localhost:8080/" -ForegroundColor Cyan
Write-Host "Test app:       Served by fanos-waf-test-app container" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick tests:" -ForegroundColor White
Write-Host "  Normal request:  curl.exe http://localhost:8080/" -ForegroundColor Gray
Write-Host "  SQL injection:   curl.exe `"http://localhost:8080/?q=1' OR '1'='1`"" -ForegroundColor Gray
Write-Host "  XSS attack:      curl.exe `"http://localhost:8080/?q=<script>alert(1)</script>`"" -ForegroundColor Gray
Write-Host ""
Write-Host "View logs:" -ForegroundColor White
Write-Host "  docker logs fanos-waf" -ForegroundColor Gray
Write-Host "  docker logs fanos-waf-test-app" -ForegroundColor Gray
Write-Host ""
Write-Host "Run tests:" -ForegroundColor White
Write-Host "  .\security-engines\waf\tests\run_tests.ps1" -ForegroundColor Gray
Write-Host ""

