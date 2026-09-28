#!/usr/bin/env bash
set -eu

echo "This helper is deprecated for the native Windows 11 lab."
echo "Use the native Suricata installation instead:"
echo "  pwsh -File .\scripts\validate-windows-suricata.ps1 -ConfigPath 'C:\Program Files\Suricata\suricata.yaml'"
exit 1