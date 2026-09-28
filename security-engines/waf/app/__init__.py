"""
FANOS WAF Application Layer
============================

Provides the WAF event model, audit log parser, and event forwarding
for the FANOS AI Security Platform.

Modules:
    event_model      — Normalized FanosWafEvent dataclass
    log_parser       — ModSecurity JSON audit log → FanosWafEvent
    event_forwarder  — Forward events to FANOS backend (stub)
"""

__version__ = "1.0.0"
