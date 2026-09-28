#requires -RunAsAdministrator
[CmdletBinding()]
param([string]$PythonPath = "")

$ErrorActionPreference = "Stop"
$SensorRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServiceHost = Join-Path $SensorRoot "sensor_windows_service.py"
if (-not $PythonPath) {
    $PythonPath = Join-Path $SensorRoot ".venv\Scripts\python.exe"
    if (-not (Test-Path $PythonPath)) { $PythonPath = (Get-Command python.exe -ErrorAction Stop).Source }
}

if (Get-Service -Name "FANOSSensorService" -ErrorAction SilentlyContinue) {
    Stop-Service -Name "FANOSSensorService" -ErrorAction SilentlyContinue
}
& $PythonPath $ServiceHost remove
if ($LASTEXITCODE -ne 0) { throw "Windows Service removal failed" }
Write-Host "Removed: FANOS Sensor Service"
Write-Host "Configuration and logs were retained under C:\ProgramData\FANOS"
