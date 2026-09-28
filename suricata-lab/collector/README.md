# FANOS Suricata collector

This collector is intentionally separate from the Suricata sensor. It tails the bind-mounted `logs/eve.json`, parses real `alert` records, and forwards normalized events to the FANOS backend.

It does not create synthetic alerts and does not require access to the Docker socket.

The collector uses a byte offset and resets safely when Suricata rotates or truncates the file. Events are retried while the backend is unavailable.
