#!/usr/bin/env bash
set -eu

echo "This lab does not run the live Suricata sensor in Ubuntu or Docker."
echo "Use the native Windows 11 Suricata installation, Npcap, and the selected Windows capture interface."
echo "Example on the Windows host:"
echo "  tcpdump -i '<windows-capture-adapter>' -c 20 'host <kali-ip> and host <windows-ip>'"
echo "  .\scripts\validate-windows-suricata.ps1 -ConfigPath 'C:\Program Files\Suricata\suricata.yaml'"
exit 1