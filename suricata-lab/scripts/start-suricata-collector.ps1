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
$root = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($BackendUrl)) {
    $BackendUrl = "http://localhost:8000"
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    $backendEnv = Join-Path (Split-Path -Parent $root) "backend\.env"
    if (Test-Path $backendEnv) {
        $tokenMatch = Select-String -Path $backendEnv -Pattern "^SURICATA_INGEST_TOKEN=(.+)"
        if ($tokenMatch) {
            $Token = $tokenMatch.Matches[0].Groups[1].Value.Trim()
        }
    }
}
$logDir = Join-Path $root "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$statePath = Join-Path $root "collector-state.json"
$logPath = Join-Path $logDir "collector.log"
$errorLogPath = Join-Path $logDir "collector-error.log"
$env:SURICATA_EVE_PATH = $EvePath
$env:SURICATA_COLLECTOR_STATE = $statePath
$env:SURICATA_SENSOR_ID = $SensorId
$env:FANOS_SURICATA_URL = $BackendUrl
$env:FANOS_SURICATA_TOKEN = $Token
$env:SURICATA_INGEST_TOKEN = $Token
$env:PYTHONPATH = Join-Path $root "collector"

$pyExe = if (Test-Path "c:\Fanos Aii\backend\.venv\Scripts\python.exe") { "c:\Fanos Aii\backend\.venv\Scripts\python.exe" } else { "python" }

$process = Start-Process -FilePath $pyExe -ArgumentList "-m", "app.main" -WorkingDirectory (Join-Path $root "collector") -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath -PassThru
$process.Id | Set-Content -Path (Join-Path $root "collector.pid")
Write-Output "Started FANOS Suricata collector PID $($process.Id)."