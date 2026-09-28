#Requires -RunAsAdministrator
# FANOS Sensor Token Fix - Minimal Safe Update
# This script updates ONLY the sensor token to match the backend configuration

$ErrorActionPreference = "Stop"

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "FANOS Sensor Authentication Fix" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# Step 1: Safely retrieve backend token
Write-Host "[1/6] Retrieving backend token from configuration..." -ForegroundColor Yellow
$backendEnvPath = "c:\Fanos Aii\backend\.env"
$backendToken = $null

if (Test-Path $backendEnvPath) {
    $content = Get-Content $backendEnvPath -Raw
    if ($content -match 'FANOS_SENSOR_TOKEN=([^\r\n]+)') {
        $backendToken = $matches[1].Trim()
        Write-Host "      Backend token retrieved (value not displayed)" -ForegroundColor Gray
    }
}

if (-not $backendToken -or $backendToken -eq "") {
    Write-Host ""
    Write-Host "ERROR: Could not retrieve backend token" -ForegroundColor Red
    Write-Host "Expected location: $backendEnvPath" -ForegroundColor Red
    exit 1
}

# Step 2: Backup existing configuration
Write-Host "[2/6] Backing up existing sensor configuration..." -ForegroundColor Yellow
$sensorConfigPath = "C:\ProgramData\FANOS\config\sensor-service.env"
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = "C:\ProgramData\FANOS\config\sensor-service.env.backup-$timestamp"

try {
    if (Test-Path $sensorConfigPath) {
        Copy-Item $sensorConfigPath $backupPath -Force
        Write-Host "      Backup created: sensor-service.env.backup-$timestamp" -ForegroundColor Gray
    } else {
        Write-Host "      No existing config found, will create new file" -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Update configuration
Write-Host "[3/6] Updating sensor configuration..." -ForegroundColor Yellow

try {
    $configLines = @()
    $tokenFound = $false
    
    if (Test-Path $sensorConfigPath) {
        $existingContent = [System.IO.File]::ReadAllLines($sensorConfigPath)
        foreach ($line in $existingContent) {
            if ($line -match '^FANOS_SENSOR_TOKEN=') {
                $configLines += "FANOS_SENSOR_TOKEN=$backendToken"
                $tokenFound = $true
            } elseif ($line.Trim() -ne "") {
                $configLines += $line
            }
        }
    }
    
    if (-not $tokenFound) {
        $configLines += "FANOS_SENSOR_TOKEN=$backendToken"
    }
    
    # Ensure other required settings
    if ($configLines -notmatch 'FANOS_BACKEND_URL=') {
        $configLines += "FANOS_BACKEND_URL=http://127.0.0.1:8000"
    }
    
    if ($configLines -notmatch 'FANOS_SENSOR_ID=') {
        $configLines += "FANOS_SENSOR_ID=demo-sensor-01"
    }
    
    # Write configuration
    $newContent = ($configLines -join "`n") + "`n"
    [System.IO.File]::WriteAllText($sensorConfigPath, $newContent)
    Write-Host "      Configuration key updated: FANOS_SENSOR_TOKEN" -ForegroundColor Gray
    
    # Clear token from memory
    $backendToken = $null
    $newContent = $null
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to update configuration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Restart Windows service
Write-Host "[4/6] Restarting FANOSSensorService..." -ForegroundColor Yellow

try {
    Restart-Service -Name "FANOSSensorService" -Force
    Start-Sleep -Seconds 3
    
    $service = Get-Service -Name "FANOSSensorService"
    if ($service.Status -eq 'Running') {
        Write-Host "      Service restarted successfully: Running" -ForegroundColor Gray
    } else {
        Write-Host "      WARNING: Service status: $($service.Status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to restart service: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Wait for service to initialize
Write-Host "[5/6] Waiting for service initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 6: Verify authentication
Write-Host "[6/6] Verifying authentication..." -ForegroundColor Yellow

# Check sensor logs for auth success
$logPath = "C:\ProgramData\FANOS\logs\sensor-service.log"
if (Test-Path $logPath) {
    $recentLogs = Get-Content $logPath -Tail 10
    $has401 = $recentLogs | Where-Object { $_ -match '"Backend returned HTTP 401"' }
    $hasSuccess = $recentLogs | Where-Object { $_ -match '"Sensor command received"' -or $_ -match 'heartbeat' -and $_ -notmatch '401' }
    
    if ($has401 -and -not $hasSuccess) {
        Write-Host "      WARNING: Still seeing 401 errors in recent logs" -ForegroundColor Yellow
        Write-Host "      Service may need more time to authenticate" -ForegroundColor Gray
    } elseif ($hasSuccess) {
        Write-Host "      Authentication successful!" -ForegroundColor Green
    } else {
        Write-Host "      Waiting for authentication confirmation..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Green
Write-Host "Configuration Update Complete" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""
Write-Host "Changes made:" -ForegroundColor Cyan
Write-Host "  - File: C:\ProgramData\FANOS\config\sensor-service.env" -ForegroundColor White
Write-Host "  - Key:  FANOS_SENSOR_TOKEN (value not displayed)" -ForegroundColor White
Write-Host "  - Backup: sensor-service.env.backup-$timestamp" -ForegroundColor White
Write-Host ""
Write-Host "Service status:" -ForegroundColor Cyan
Get-Service -Name "FANOSSensorService" | Format-Table Name, Status, StartType -AutoSize
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 10-15 seconds for authentication to stabilize" -ForegroundColor White
Write-Host "  2. Refresh the Admin Portal > Sensor Control page" -ForegroundColor White
Write-Host "  3. Status should show ONLINE (green)" -ForegroundColor White
Write-Host "  4. Click START if Suricata is not yet running" -ForegroundColor White
Write-Host ""
