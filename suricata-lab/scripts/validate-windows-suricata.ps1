param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath,
    [string]$SuricataExe = "C:\Program Files\Suricata\suricata.exe"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $SuricataExe -PathType Leaf)) { throw "Suricata executable not found: $SuricataExe" }
if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) { throw "Suricata config not found: $ConfigPath" }
& $SuricataExe -T -c $ConfigPath
if ($LASTEXITCODE -ne 0) { throw "Suricata configuration validation failed with exit code $LASTEXITCODE." }