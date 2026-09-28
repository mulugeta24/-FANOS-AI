$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pidPath = Join-Path $root "collector.pid"
if (-not (Test-Path $pidPath)) { Write-Output "Collector PID file not found."; exit 0 }
$collectorPid = [int](Get-Content $pidPath)
$process = Get-Process -Id $collectorPid -ErrorAction SilentlyContinue
if ($process) { Stop-Process -Id $collectorPid }
Remove-Item $pidPath -Force
Write-Output "Collector stopped."