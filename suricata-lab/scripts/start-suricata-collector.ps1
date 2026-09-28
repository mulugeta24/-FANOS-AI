param(
    [Parameter(Mandatory = $true)]
    [string]$EvePath,
    [string]$BackendUrl = $env:FANOS_SURICATA_URL,
    [string]$SensorId = "windows-suricata-01",
    [string]$Token = $env:FANOS_SURICATA_TOKEN
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $EvePath -PathType Leaf)) {
    throw "EVE JSON does not exist: $EvePath. Set this to eve-log.filename in the installed Windows Suricata YAML."
}
if ([string]::IsNullOrWhiteSpace($BackendUrl)) { throw "Set -BackendUrl or FANOS_SURICATA_URL first." }

$root = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $root "collector-state.json"
$logPath = Join-Path $root "logs\collector.log"
$errorLogPath = Join-Path $root "logs\collector-error.log"
$env:SURICATA_EVE_PATH = $EvePath
$env:SURICATA_COLLECTOR_STATE = $statePath
$env:SURICATA_SENSOR_ID = $SensorId
$env:FANOS_SURICATA_URL = $BackendUrl
$env:FANOS_SURICATA_TOKEN = $Token
$env:PYTHONPATH = Join-Path $root "collector"

$process = Start-Process -FilePath "python" -ArgumentList "-m", "app.main" -WorkingDirectory (Join-Path $root "collector") -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath -PassThru
$process.Id | Set-Content -Path (Join-Path $root "collector.pid")
Write-Output "Started FANOS Suricata collector PID $($process.Id)."