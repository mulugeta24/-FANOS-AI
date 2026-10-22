# FANOS AI - End-to-End ML + Suricata Alert Pipeline Verification Script
# Checks 8 stages: Backend Health, ML Prediction, EVE Log, Collector Delivery,
# Event API, Database Persistence, ML Flow Analysis, and Dashboard Alert Retrieval.

$ErrorActionPreference = "Continue"
$PythonExe = "c:\Fanos Aii\backend\.venv\Scripts\python.exe"
$BaseUrl = "http://127.0.0.1:8000"
$EvePath = "C:\Program Files\Suricata\log\eve.json"
$HelperPy = Join-Path $PSScriptRoot "verify_pipeline_helpers.py"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   FANOS AI - End-to-End ML & Suricata Pipeline Verification    " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Resolve Ingest Token
$IngestToken = (& $PythonExe $HelperPy ingest-token 2>$null)
if (-not $IngestToken) {
    $IngestToken = $env:SURICATA_INGEST_TOKEN
}
if (-not $IngestToken) {
    $IngestToken = $env:FANOS_SURICATA_TOKEN
}
if (-not $IngestToken) {
    Write-Warning "Could not resolve SURICATA_INGEST_TOKEN from helper or environment."
    $IngestToken = ""
}
$IngestToken = $IngestToken.Trim()

# -------------------------------------------------------------
# 1. Backend Health
# -------------------------------------------------------------
Write-Host "`n[Check 1/8] Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -TimeoutSec 5
    Write-Host "  [+] Status: $($health.status)" -ForegroundColor Green
    Write-Host "  [+] ML Engine: $($health.components.ml_engine)" -ForegroundColor Green
    Write-Host "  [+] Suricata Collector: $($health.components.suricata_collector)" -ForegroundColor Green
    Write-Host "  [+] Database: $($health.components.database)" -ForegroundColor Green
    $check1 = ($health.status -eq "healthy" -and $health.components.suricata_collector -eq "active" -and $health.components.ml_engine -eq "loaded")
} catch {
    Write-Host "  [-] Failed to reach health endpoint: $_" -ForegroundColor Red
    $check1 = $false
}

# -------------------------------------------------------------
# 2. ML Model Prediction Independently
# -------------------------------------------------------------
Write-Host "`n[Check 2/8] ML Model Independent Inference..." -ForegroundColor Yellow
$mlJsonRaw = & $PythonExe $HelperPy ml 2>&1
$jsonLine = $mlJsonRaw | Where-Object { $_ -match "^\{.*\}$" } | Select-Object -Last 1
if ($jsonLine) {
    $mlData = $jsonLine | ConvertFrom-Json
    Write-Host "  [+] URL Classifier Benign : $($mlData.url_benign) (conf: $($mlData.url_benign_conf))" -ForegroundColor Green
    Write-Host "  [+] URL Classifier Phish  : $($mlData.url_phish) (conf: $($mlData.url_phish_conf))" -ForegroundColor Green
    Write-Host "  [+] Flow Predictor Native : $($mlData.flow_prediction) (conf: $($mlData.flow_confidence), schema: $($mlData.flow_schema))" -ForegroundColor Green
    $check2 = ($mlData.url_benign -eq "benign" -and $mlData.url_phish -eq "phishing" -and $mlData.flow_prediction -ne $null)
} else {
    Write-Host "  [-] Model Inference Failed: $mlJsonRaw" -ForegroundColor Red
    $check2 = $false
}

# -------------------------------------------------------------
# 3. Suricata EVE Log Activity
# -------------------------------------------------------------
Write-Host "`n[Check 3/8] Suricata EVE Log Activity..." -ForegroundColor Yellow
if (Test-Path $EvePath) {
    $item = Get-Item $EvePath
    $sizeMb = [math]::Round($item.Length / 1MB, 2)
    Write-Host "  [+] EVE JSON file present at: $EvePath" -ForegroundColor Green
    Write-Host "  [+] File size: $sizeMb MB, Last Modified: $($item.LastWriteTime)" -ForegroundColor Green
    $check3 = $true
} else {
    Write-Host "  [-] EVE JSON file missing at $EvePath" -ForegroundColor Red
    $check3 = $false
}

# -------------------------------------------------------------
# 4. Collector Status & Delivery (Ingest API)
# -------------------------------------------------------------
Write-Host "`n[Check 4/8] Collector Delivery to Ingest API..." -ForegroundColor Yellow
$testGuid = [guid]::NewGuid().ToString()
$alertPayload = @{
    event_id = $testGuid
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.ffffff+00:00")
    event_type = "alert"
    src_ip = "192.168.56.101"
    src_port = 49152
    dest_ip = "192.168.56.1"
    dest_port = 80
    proto = "TCP"
    signature_id = 1000002
    signature = "FANOS LAB - Inbound SQL Injection Probe (OR 1=1)"
    category = "Web Application Attack"
    severity = 2
    action = "allowed"
    raw_event = @{
        payload = "GET /index.php?id=1' OR '1'='1 HTTP/1.1"
    }
} | ConvertTo-Json -Depth 5

$headers = @{
    "Content-Type" = "application/json"
    "x-fanos-suricata-token" = $IngestToken
}

try {
    $ingestRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/suricata/events" -Method Post -Headers $headers -Body $alertPayload
    Write-Host "  [+] Ingest Response: success=$($ingestRes.success), event_id=$($ingestRes.event_id), duplicate=$($ingestRes.duplicate)" -ForegroundColor Green
    $check4 = ($ingestRes.success -eq $true)
} catch {
    Write-Host "  [-] Collector delivery failed: $_" -ForegroundColor Red
    $check4 = $false
}

# -------------------------------------------------------------
# 5. Event API Response
# -------------------------------------------------------------
Write-Host "`n[Check 5/8] Event API Live Feed Response..." -ForegroundColor Yellow
try {
    $liveRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/events/live?limit=10" -Method Get
    Write-Host "  [+] Live events count: $($liveRes.Count)" -ForegroundColor Green
    $suricataEvents = $liveRes | Where-Object { $_.sensor_source -like "*suricata*" }
    if ($suricataEvents) {
        $firstEvt = $suricataEvents | Select-Object -First 1
        Write-Host "  [+] Live Suricata event found: ID=$($firstEvt.id), Severity=$($firstEvt.severity), Attack=$($firstEvt.attack_type), SensorSource=$($firstEvt.sensor_source)" -ForegroundColor Green
        $check5 = $true
    } else {
        Write-Host "  [*] No Suricata events in recent live feed" -ForegroundColor Yellow
        $check5 = ($liveRes.Count -gt 0)
    }
} catch {
    Write-Host "  [-] Event API call failed: $_" -ForegroundColor Red
    $check5 = $false
}

# -------------------------------------------------------------
# 6. Database Persistence Check
# -------------------------------------------------------------
Write-Host "`n[Check 6/8] Database Persistence Check..." -ForegroundColor Yellow
$dbOutRaw = & $PythonExe $HelperPy db 2>&1
$dbJsonLine = $dbOutRaw | Where-Object { $_ -match '^\{"status":\s*"found".*\}$' } | Select-Object -Last 1
if ($dbJsonLine) {
    $dbData = $dbJsonLine | ConvertFrom-Json
    Write-Host "  [+] Database Record Confirmed: ID=$($dbData.id) | Sev=$($dbData.severity) | Target=$($dbData.target) | Sensor=$($dbData.sensor_source)" -ForegroundColor Green
    $check6 = $true
} else {
    Write-Host "  [-] Database check failed: $dbOutRaw" -ForegroundColor Red
    $check6 = $false
}

# -------------------------------------------------------------
# 7. ML Analysis of Compatible Flow Input
# -------------------------------------------------------------
Write-Host "`n[Check 7/8] ML Analysis of Network Flow Event..." -ForegroundColor Yellow
$flowGuid = [guid]::NewGuid().ToString()
$flowPayload = @{
    event_id = $flowGuid
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.ffffff+00:00")
    event_type = "flow"
    src_ip = "192.168.56.101"
    src_port = 52341
    dest_ip = "192.168.56.1"
    dest_port = 443
    proto = "TCP"
    flow = @{
        pkts_toserver = 18
        pkts_toclient = 24
        bytes_toserver = 1420
        bytes_toclient = 18500
        age = 10
        state = "established"
    }
} | ConvertTo-Json -Depth 5

try {
    $flowRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/suricata/flows" -Method Post -Headers $headers -Body $flowPayload
    Write-Host "  [+] Flow Ingest Success: $($flowRes.success), Event ID: $($flowRes.event_id)" -ForegroundColor Green
    $analysis = $flowRes.ml_prediction
    Write-Host "  [+] ML Inference Result: Display=$($analysis.display), Confidence=$($analysis.confidence)%, Malicious=$($analysis.is_malicious), Schema=$($analysis.feature_schema)" -ForegroundColor Green
    $check7 = ($flowRes.success -eq $true -and $analysis.display -ne $null)
} catch {
    Write-Host "  [-] Flow ML analysis failed: $_" -ForegroundColor Red
    $check7 = $false
}

# -------------------------------------------------------------
# 8. Dashboard Alert Retrieval
# -------------------------------------------------------------
Write-Host "`n[Check 8/8] Dashboard Alert Retrieval & Stats..." -ForegroundColor Yellow
$jwtToken = (& $PythonExe $HelperPy token 2>$null)
if ($jwtToken) {
    $jwtToken = $jwtToken.Trim()
    $dashHeaders = @{
        "Authorization" = "Bearer $jwtToken"
    }
    try {
        $statsRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/suricata/stats" -Method Get -Headers $dashHeaders
        $eventsRes = Invoke-RestMethod -Uri "$BaseUrl/api/v1/suricata/events?limit=5" -Method Get -Headers $dashHeaders
        Write-Host "  [+] Dashboard Stats: Total=$($statsRes.total_events), Alerts=$($statsRes.alerts), High=$($statsRes.high), Medium=$($statsRes.medium)" -ForegroundColor Green
        Write-Host "  [+] Dashboard Alert Feed Count: $($eventsRes.Count) alerts retrieved" -ForegroundColor Green
        if ($eventsRes.Count -gt 0) {
            $latestAlert = $eventsRes[0]
            Write-Host "  [+] Latest Alert: ID=$($latestAlert.id), Severity=$($latestAlert.severity), Attack=$($latestAlert.attack_type), Target=$($latestAlert.target)" -ForegroundColor Green
        }
        $check8 = ($eventsRes.Count -ge 1)
    } catch {
        Write-Host "  [-] Dashboard API call failed: $_" -ForegroundColor Red
        $check8 = $false
    }
} else {
    Write-Host "  [-] Failed to generate test JWT token" -ForegroundColor Red
    $check8 = $false
}

# -------------------------------------------------------------
# Summary
# -------------------------------------------------------------
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "                    VERIFICATION SUMMARY                        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ("Check 1: Backend Health          : " + $(if($check1){"PASS"}else{"FAIL"})) -ForegroundColor $(if($check1){"Green"}else{"Red"})
Write-Host ("Check 2: ML Model Prediction     : " + $(if($check2){"PASS"}else{"FAIL"})) -ForegroundColor $(if($check2){"Green"}else{"Red"})
Write-Host ("Check 3: Suricata EVE Activity   : " + $(if($check3){"PASS"}else{"FAIL"})) -ForegroundColor $(if($check3){"Green"}else{"Red"})
Write-Host ("Check 4: Collector Delivery      : " + $(if($check4){"PASS"}else{"FAIL"})) -ForegroundColor $(if($check4){"Green"}else{"Red"})
Write-Host ("Check 5: Live Event API          : " + $(if($check5){"PASS"}else{"FAIL"})) -ForegroundColor $(if($check5){"Green"}else{"Red"})
Write-Host ("Check 6: Database Persistence    : " + $(if($check6){"PASS"}else{"FAIL"})) -ForegroundColor $(if($check6){"Green"}else{"Red"})
Write-Host ("Check 7: ML Flow Analysis        : " + $(if($check7){"PASS"}else{"FAIL"})) -ForegroundColor $(if($check7){"Green"}else{"Red"})
Write-Host ("Check 8: Dashboard Alert Feed    : " + $(if($check8){"PASS"}else{"FAIL"})) -ForegroundColor $(if($check8){"Green"}else{"Red"})
Write-Host "================================================================`n" -ForegroundColor Cyan
