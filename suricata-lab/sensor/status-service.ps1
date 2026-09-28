$ErrorActionPreference = "Stop"
Get-Service -Name "FANOSSensorService" -ErrorAction Stop | Select-Object Name, DisplayName, Status, StartType
$logPath = "C:\ProgramData\FANOS\logs\sensor-service.log"
if (Test-Path $logPath) {
    Write-Host "`nRecent log entries:"
    Get-Content $logPath -Tail 20
}
