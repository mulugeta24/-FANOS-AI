# Lab rules

These rules are intentionally local and limited to controlled lab traffic.

- SID `1000001` detects ICMP echo requests.
- SID `1000002` detects TCP SYN traffic to port `8080`.
- SID `1000003` detects an HTTP URI containing `fanos-suricata-test`.
- SID `1000004` detects an authorized Nmap SYN scan against the lab host.

Do not treat these rules as a production detection set. Replace or extend them only with reviewed rules before production use.
