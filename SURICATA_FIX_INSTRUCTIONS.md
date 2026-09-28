# FANOS Suricata Sensor Fix Instructions

## Current Status

✅ **Suricata installed**: C:\Program Files\Suricata\suricata.exe  
✅ **Sensor service running**: FANOSSensorService is RUNNING  
✅ **Backend running**: Port 8000 active  
❌ **Authentication failing**: Sensor getting 401 Unauthorized  

## Root Cause

The sensor service is sending requests to the backend but getting **401 Unauthorized** errors because:
1. Sensor token is configured in the backend (`FANOS_SENSOR_TOKEN`)
2. Sensor service needs matching token in its config file
3. Config file at: `C:\ProgramData\FANOS\config\sensor-service.env`

## Fix Steps

### Option 1: Update Sensor Config File (Recommended)

Run these commands in **PowerShell as Administrator**:

```powershell
# Navigate to config directory
cd "C:\ProgramData\FANOS\config"

# Backup existing config
Copy-Item "sensor-service.env" "sensor-service.env.backup"

# Check current content
Get-Content "sensor-service.env"

# Add or update the token line
# Open in notepad as admin:
notepad sensor-service.env
```

Add or update these lines in the file:
```
FANOS_SENSOR_TOKEN=Rw3Jt6wsYwait6A-VR8hOpws3DDEKH2bO3iwVFN2s9s
FANOS_BACKEND_URL=http://127.0.0.1:8000
FANOS_SENSOR_ID=demo-sensor-01
```

Save and close, then restart the sensor service:
```powershell
Restart-Service -Name "FANOSSensorService"
Get-Service -Name "FANOSSensorService"
```

### Option 2: Quick PowerShell Fix

Run as Administrator:

```powershell
$configPath = "C:\ProgramData\FANOS\config\sensor-service.env"
$token = "FANOS_SENSOR_TOKEN=Rw3Jt6wsYwait6A-VR8hOpws3DDEKH2bO3iwVFN2s9s"

# Read current config
$content = Get-Content $configPath -Raw

# Check if token exists
if ($content -match "FANOS_SENSOR_TOKEN=") {
    # Replace existing token
    $content = $content -replace "FANOS_SENSOR_TOKEN=.*", $token
} else {
    # Add token
    $content += "`n$token"
}

# Write back
Set-Content -Path $configPath -Value $content -Force

# Restart service
Restart-Service -Name "FANOSSensorService"

Write-Host "Sensor service restarted with new token!" -ForegroundColor Green
```

## Verification

After applying the fix, check the backend logs for successful heartbeats:

```powershell
# Should see 200 OK instead of 401 Unauthorized
# Check in: c:\Fanos Aii\backend process output
```

Expected log entries:
```
INFO:     127.0.0.1:xxxxx - "POST /api/v1/sensors/demo-sensor-01/heartbeat HTTP/1.1" 200 OK
INFO:     127.0.0.1:xxxxx - "GET /api/v1/sensors/demo-sensor-01/commands/next HTTP/1.1" 200 OK
```

Then refresh the Sensor Control page in the FANOS UI - it should show:
- Current Status: **STOPPED** (but connected)
- Service: **ONLINE** (green)
- Click **START** button to activate Suricata

## Why Suricata Page Shows "API UNAVAILABLE"

The Suricata events page won't show data until:
1. Sensor authentication is fixed (above steps)
2. Sensor is started via the UI
3. Suricata begins capturing traffic
4. Events are sent to the backend

Once the sensor is running and capturing traffic, the Suricata page will populate with real-time IDS/IPS alerts.

## Manual Start Suricata (Alternative)

If the sensor service has issues, you can start Suricata manually:

```powershell
cd "c:\Fanos Aii\suricata-lab\sensor"
python sensor_manager.py
```

This will run in the foreground and show all activity.

## Need More Help?

Check the sensor service logs:
```powershell
Get-Content "C:\ProgramData\FANOS\logs\sensor-service.log" -Tail 50
```

Check Suricata logs:
```powershell
Get-Content "C:\Program Files\Suricata\log\eve.json" -Tail 20
```
