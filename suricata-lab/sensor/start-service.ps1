#requires -RunAsAdministrator
$ErrorActionPreference = "Stop"
Start-Service -Name "FANOSSensorService"
Get-Service -Name "FANOSSensorService" | Select-Object Name, DisplayName, Status, StartType
