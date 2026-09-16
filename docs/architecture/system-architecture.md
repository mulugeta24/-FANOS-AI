# System Architecture

## Overview

FANOS AI is a cybersecurity and SOC platform built around a hybrid model of:

- real-time detection,
- AI inference,
- rule-based security checks,
- risk scoring,
- incident correlation,
- response orchestration.

## Main Layers

### 1. Platform Core

The current working platform remains in:

- backend/
- frontend/

These modules provide the operational application features for API services, dashboard data, security workflows, and user access.

### 2. Security Engines

Future dedicated modules live under security-engines/ and represent modular security subsystems such as Web Application Firewall, IDS/IPS, EDR, vulnerability scanning, and malware analysis.

### 3. Integrations

The integrations/ folder is reserved for vendor connectivity such as Cloudflare, AWS, Azure, GCP, Fortinet, Palo Alto, Defender, Active Directory, SIEM, and threat intel feeds.

### 4. AI / ML Layer

The current trained model remains in backend/app/models/. This folder is preserved to avoid breaking the existing runtime. The ml/ folder is for future lifecycle management of datasets, training, experiments, and model governance.

## Resulting Architecture

```text
Internet / Security Sources
        ↓
    Security Engines
        ↓
    Integrations
        ↓
    FANOS Platform Core
        ↓
    Normalization → Detection → AI → Risk → Correlation → Incident → Response
        ↓
    Customer SOC / Admin Console
```
