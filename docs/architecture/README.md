# Architecture Overview

This section documents the FANOS AI platform architecture, including system design, security flow, detection pipeline, and deployment models.

## Core Components

- Platform Core: backend/ and frontend/
- Security Engines: security-engines/
- Integrations: integrations/
- ML Lifecycle: ml/
- Database Layer: database/
- Infrastructure: infrastructure/
- Testing: tests/
- Automation: scripts/
- Configs: configs/

## Architectural Principles

- Preserve the working platform implementation.
- Keep backend and frontend operational.
- Add enterprise architecture boundaries without breaking runtime code.
- Support future multi-tenant, SOC, and security-engine expansion.

## System View

```text
Internet
  ↓
FANOS WAF / Edge Security
  ↓
Platform Core
  ↓
Normalization → Detection → AI → Risk → Correlation → Incident → Response
  ↓
Customer SOC / Administrator Portal
```
