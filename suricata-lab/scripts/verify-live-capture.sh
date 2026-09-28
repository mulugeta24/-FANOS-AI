#!/usr/bin/env bash
set -eu

echo "This helper is not used by the native Windows Suricata lab."
echo "Run the capture on the Windows 11 host with Npcap and the selected capture adapter, for example:"
echo "  tcpdump -i '<windows-capture-adapter>' 'host <kali-ip> and host <windows-ip>'"
exit 1