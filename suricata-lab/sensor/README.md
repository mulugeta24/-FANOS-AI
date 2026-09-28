# FANOS Sensor Service (Development)

The development Sensor Service polls FANOS Backend over HTTP using a dedicated
`FANOS_SENSOR_TOKEN`. It accepts only backend-issued `START`, `STOP`, and
`RESTART` records, then forwards those fixed operations to Sensor Manager over
its private stdin pipe. It does not accept shell text or executable paths from
the backend.

```text
Admin Portal -> Backend command row -> Sensor Service -> Sensor Manager
                                                |             |-> Suricata
                                                |             `-> Collector
                                                `-> authenticated heartbeat
```

## Configure

Set `FANOS_SENSOR_TOKEN` in the backend process environment before starting the
backend. Set the same high-entropy value in the Windows Sensor Service process
environment. Do not commit the value, put it in source, or print it in logs.
The service fails closed if the token is missing. Use HTTPS or a trusted
private network when the backend is not on the same machine.

The backend must already contain the lifecycle record for the sensor ID. The
development default is `demo-sensor-01`. The API and Sensor Service must use the
same ID.

## Install And Run As A Windows Service

Open an elevated PowerShell window once for installation:

```powershell
cd "C:\Fanos Aii\suricata-lab\sensor"
.\install-service.ps1 -BackendUrl "http://127.0.0.1:8000" -SensorId "demo-sensor-01"
.\start-service.ps1
```

The installer prompts for `FANOS_SENSOR_TOKEN` without displaying it, writes
the service configuration to `C:\ProgramData\FANOS\config\sensor-service.env`,
restricts that file to `SYSTEM` and local `Administrators`, installs
`FANOSSensorService` with automatic startup, and configures Windows restart
actions. The service reads this configuration at boot, so interactive PowerShell
environment variables are not required.

Lifecycle commands:

```powershell
.\status-service.ps1
.\stop-service.ps1
.\uninstall-service.ps1
```

The persistent service log is
`C:\ProgramData\FANOS\logs\sensor-service.log`; the controlled manager writes
`sensor-manager.log` beside its status file. The service runs under the default
Windows Service account and does not require a user login or open terminal.

The service starts Sensor Manager in controlled mode. Sensor Manager uses the
existing Suricata executable, YAML, capture interface, EVE path, and Collector
entry point. These remain configurable through the existing manager environment
overrides; defaults preserve the current lab paths and interface. The Collector
continues to receive its existing `FANOS_SURICATA_URL`,
`SURICATA_EVE_PATH`, `SURICATA_SENSOR_ID`, and `FANOS_SURICATA_TOKEN` settings.

Ctrl+C sends STOP to Sensor Manager and waits for it to stop Suricata and the
Collector. The Sensor Service token is removed from the child-process
environment and is never included in structured logs.

## Operation

- Commands are claimed from `/api/v1/sensors/{sensor_id}/commands/next` and
  acknowledged only after Sensor Manager reports the requested process state.
- Heartbeats report desired state, manager status, Suricata status, Collector
  status, process IDs, restart count, and timestamp.
- Backend status becomes ONLINE only after both Suricata and Collector report
  ONLINE. START acceptance alone leaves the lifecycle STARTING.
- Crash recovery is enabled only while desired state is RUNNING. STOP disables
  recovery before stopping either child.
- Backend authentication uses `X-FANOS-Sensor-Token`, separate from
  administrator JWTs and Suricata event-ingest authentication.
- No database migration or schema change is required.

The Python host uses `pywin32` and Windows Service Control Manager callbacks.
Token rotation currently requires updating the protected config file and
restarting the service. Production certificate-based transport and a dedicated
credential provisioning system remain future hardening work.