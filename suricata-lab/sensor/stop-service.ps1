#requires -RunAsAdministrator
$ErrorActionPreference = "Stop"
Stop-Service -Name "FANOSSensorService" -ErrorAction Stop
Get-Service -Name "FANOSSensorService" | Select-Object Name, DisplayName, Status, StartType
