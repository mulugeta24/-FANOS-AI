#Requires -RunAsAdministrator
# FANOS Sensor Authentication Fix
# Run this script as Administrator

Write-Host "FANOS Sensor Authentication Fix" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$configPath = "C:\ProgramData\FANOS\config\sensor-service.env"
$backupPath = "C:\ProgramData\FANOS\config\sensor-service.env.backup"
$token = "Rw3Jt6wsYwait6A-VR8hOpws3DDEKH2bO3iwVFN2s9s"

try {
    # Backup existing config
    if (Test-Path $configPath) {
        Write-Host "[1/4] Backing up existing config..." -ForegroundColor Yellow
        Copy-Item $configPath $backupPath -Force
        Write-Host "      Backup created at: $backupPath" -ForegroundColor Gray
    }

    # Read current content
    Write-Host "[2/4] Reading current configuration..." -ForegroundColor Yellow
    if (Test-Path $configPath) {
        $content = Get-Content $configPath -Raw
    } else {
        $content = ""
        Write-Host "      Config file not found, will create new one" -ForegroundColor Gray
    }

    # Update or add token
    Write-Host "[3/4] Updating sensor token..." -ForegroundColor Yellow
    
    $lines = $content -split "`n" | ForEach-Object { $_.TrimEnd("`r") }
    $tokenFound = $false
    $newLines = @()
    
    foreach ($line in $lines) {
        if ($line -match "^FANOS_SENSOR_TOKEN=") {
            $newLines += "FANOS_SENSOR_TOKEN=$token"
            $tokenFound = $true
            Write-Host "      Updated existing token" -ForegroundColor Gray
        } elseif ($line.Trim() -ne "") {
            $newLines += $line
        }
    }
    
    if (-not $tokenFound) {
        $newLines += "FANOS_SENSOR_TOKEN=$token"
        Write-Host "      Added new token" -ForegroundColor Gray
    }
    
    # Ensure other required settings exist
    if ($content -notmatch "FANOS_BACKEND_URL=") {
        $newLines += "FANOS_BACKEND_URL=http://127.0.0.1:8000"
        Write-Host "      Added backend URL" -ForegroundColor Gray
    }
    
    if ($content -notmatch "FANOS_SENSOR_ID=") {
        $newLines += "FANOS_SENSOR_ID=demo-sensor-01"
        Write-Host "      Added sensor ID" -ForegroundColor Gray
    }
    
    # Write back
    $newContent = ($newLines -join "`n") + "`n"
    Set-Content -Path $configPath -Value $newContent -Force -NoNewline
    
    Write-Host "      Configuration updated successfully" -ForegroundColor Gray

    # Restart service
    Write-Host "[4/4] Restarting sensor service..." -ForegroundColor Yellow
    Restart-Service -Name "FANOSSensorService" -Force
    Start-Sleep -Seconds 2
    
    $service = Get-Service -Name "FANOSSensorService"
    
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "SUCCESS! Sensor authentication fixed" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Status:" -ForegroundColor Cyan
    Write-Host "  Name:   $($service.Name)" -ForegroundColor White
    Write-Host "  Status: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') { 'Green' } else { 'Red' })
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Refresh the Sensor Control page in FANOS UI" -ForegroundColor White
    Write-Host "  2. Status should change from UNKNOWN to STOPPED" -ForegroundColor White
    Write-Host "  3. Service should show ONLINE (green)" -ForegroundColor White
    Write-Host "  4. Click START button to activate Suricata" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Red
    Write-Host "ERROR: Fix failed!" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you're running PowerShell as Administrator" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
