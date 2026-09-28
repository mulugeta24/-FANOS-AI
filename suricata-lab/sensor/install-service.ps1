#requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$PythonPath = "",
    [string]$BackendUrl = "http://127.0.0.1:8000",
    [string]$SensorId = "demo-sensor-01",
    [string]$ConfigPath = "C:\ProgramData\FANOS\config\sensor-service.env"
)

$ErrorActionPreference = "Stop"
$SensorRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServiceHost = Join-Path $SensorRoot "sensor_windows_service.py"
$ServiceName = "FANOSSensorService"
$ConfigDirectory = Split-Path -Parent $ConfigPath
$LogDirectory = "C:\ProgramData\FANOS\logs"

if (-not $PythonPath) {
    $PythonPath = Join-Path $SensorRoot ".venv\Scripts\python.exe"
    if (-not (Test-Path $PythonPath)) {
        $PythonPath = (Get-Command python.exe -ErrorAction Stop).Source
    }
}

if (-not (Test-Path $PythonPath)) { throw "Python executable not found: $PythonPath" }
if (-not (Test-Path $ServiceHost)) { throw "Service host not found: $ServiceHost" }

New-Item -ItemType Directory -Force -Path $ConfigDirectory, $LogDirectory | Out-Null
$secureToken = Read-Host "Enter FANOS_SENSOR_TOKEN" -AsSecureString
$token = [Net.NetworkCredential]::new("", $secureToken).Password
if ([string]::IsNullOrWhiteSpace($token)) { throw "FANOS_SENSOR_TOKEN cannot be empty" }

@(
    "FANOS_BACKEND_URL=$BackendUrl"
    "FANOS_SENSOR_ID=$SensorId"
    "FANOS_SENSOR_TOKEN=$token"
    "FANOS_SENSOR_LOG=$LogDirectory\sensor-service.log"
) | Set-Content -Path $ConfigPath -Encoding utf8 -Force

icacls.exe $ConfigPath /inheritance:r /grant:r "SYSTEM:(F)" "Administrators:(F)" | Out-Null

$PythonSitePackages = & $PythonPath -c "import sysconfig; print(sysconfig.get_paths()['purelib'])"
if ($LASTEXITCODE -ne 0 -or -not $PythonSitePackages) { throw "Could not determine Python site-packages path" }

& $PythonPath -m pip install --upgrade --target $PythonSitePackages pywin32
if ($LASTEXITCODE -ne 0) { throw "pywin32 installation failed" }
& $PythonPath -s -c "import win32service, win32serviceutil, win32event, servicemanager; print('machine-wide pywin32 OK')"
if ($LASTEXITCODE -ne 0) { throw "pywin32 installation or import failed" }

& $PythonPath $ServiceHost --startup auto install
if ($LASTEXITCODE -ne 0) { throw "Windows Service installation failed" }

sc.exe config $ServiceName start= auto | Out-Null
sc.exe description $ServiceName "FANOS AI background sensor service for Suricata monitoring, event collection, backend communication, and sensor lifecycle control." | Out-Null
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/30000/restart/60000 | Out-Null

Write-Host "Installed: FANOS Sensor Service"
Write-Host "Config:    $ConfigPath"
Write-Host "Log:       $LogDirectory\sensor-service.log"
Write-Host "Start with: .\start-service.ps1"
