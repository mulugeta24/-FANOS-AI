"""
WAF Request Inspection Pipeline.
Orchestrates normalization, detector evaluation, risk scoring, and policy decisions.
"""
import time
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.waf.engine.decision import decision_engine
from app.waf.engine.detectors.api_abuse import api_abuse_detector
from app.waf.engine.detectors.bruteforce import bruteforce_detector
from app.waf.engine.detectors.cmdi import cmdi_detector
from app.waf.engine.detectors.custom import custom_detector
from app.waf.engine.detectors.deserialization import deserialization_detector
from app.waf.engine.detectors.file_upload import file_upload_detector
from app.waf.engine.detectors.malformed import malformed_detector
from app.waf.engine.detectors.methods import methods_detector
from app.waf.engine.detectors.nosql_ldap import nosql_ldap_detector
from app.waf.engine.detectors.open_redirect import open_redirect_detector
from app.waf.engine.detectors.params import params_detector
from app.waf.engine.detectors.policy import policy_detector
from app.waf.engine.detectors.privilege_escalation import privilege_escalation_detector
from app.waf.engine.detectors.recon import recon_detector
from app.waf.engine.detectors.sizes import sizes_detector
from app.waf.engine.detectors.sqli import sqli_detector
from app.waf.engine.detectors.ssrf import ssrf_detector
from app.waf.engine.detectors.ssti import ssti_detector
from app.waf.engine.detectors.traversal import path_traversal_detector
from app.waf.engine.detectors.xss import xss_detector
from app.waf.engine.detectors.xxe import xxe_detector
from app.waf.engine.normalizer import normalizer
from app.waf.rules.registry import rule_registry
from app.waf.schemas.inspect import Finding, InspectRequest, InspectResponse


class WAFPipeline:
    """Core request inspection pipeline for FANOS WAF."""

    def inspect(
        self,
        request: InspectRequest,
        mode_override: Optional[str] = None,
    ) -> InspectResponse:
        start_time = time.perf_counter()
        request_id = f"req-{uuid.uuid4().hex[:12]}"

        # 1. Normalize request inputs safely
        raw_path = request.path or "/"
        embedded_query: Dict[str, str] = {}

        if "?" in raw_path or raw_path.startswith(("http://", "https://")):
            try:
                parsed = urllib.parse.urlsplit(raw_path)
                if parsed.query:
                    parsed_qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
                    embedded_query = {k: v[0] if v else "" for k, v in parsed_qs.items()}
                if parsed.path:
                    raw_path = parsed.path
            except Exception:
                pass

        merged_query = {**embedded_query, **(request.query_params or {})}

        norm_path = normalizer.normalize_path(raw_path)
        norm_query = normalizer.normalize_query_params(merged_query)
        norm_headers = normalizer.normalize_headers(request.headers)
        norm_body = normalizer.normalize_body(request.body) if request.body else ""

        # Extract or override user-agent if provided in request
        if request.user_agent and "user-agent" not in norm_headers:
            norm_headers["user-agent"] = normalizer.clean_text(request.user_agent)

        findings: List[Finding] = []

        # 2. Retrieve enabled rules
        enabled_rules = rule_registry.get_enabled_rules()

        # 3. Evaluate rules across modular detectors
        for rule in enabled_rules:
            # Custom Rules
            if rule.is_custom:
                matches = custom_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
                continue

            # Core Built-in Rules
            category = rule.category
            if category == "SQL Injection":
                matches = sqli_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "Cross-Site Scripting":
                matches = xss_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "Path Traversal":
                matches = path_traversal_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "Command Injection":
                matches = cmdi_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "HTTP Methods":
                matches = methods_detector.detect(rule, request.method)
                findings.extend(matches)
            elif category == "Request Sizes":
                matches = sizes_detector.detect(rule, request.path, request.query_params, request.body)
                findings.extend(matches)
            elif category == "Query Parameters":
                matches = params_detector.detect(rule, norm_query)
                findings.extend(matches)
            elif category == "Malformed Request":
                # Check both raw and normalized inputs for malformed evasion markers
                raw_body = request.body or ""
                matches = malformed_detector.detect(rule, request.path, request.query_params, request.headers, raw_body)
                findings.extend(matches)
            elif category == "Security Policy":
                matches = policy_detector.detect(rule, norm_path, norm_headers)
                findings.extend(matches)
            elif category == "Brute Force":
                matches = bruteforce_detector.detect(
                    rule,
                    norm_path,
                    norm_query,
                    norm_headers,
                    norm_body,
                    client_ip=request.client_ip or "127.0.0.1",
                    method=request.method,
                )
                findings.extend(matches)
            elif category == "Server-Side Request Forgery":
                matches = ssrf_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "XML External Entity":
                matches = xxe_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "Template Injection":
                matches = ssti_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "NoSQL & LDAP Injection":
                matches = nosql_ldap_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "File Upload & Web Shell":
                matches = file_upload_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "Open Redirect":
                matches = open_redirect_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "API & GraphQL Abuse":
                matches = api_abuse_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "Insecure Deserialization":
                matches = deserialization_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "Privilege Escalation & Mass Assignment":
                matches = privilege_escalation_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)
            elif category == "Information Disclosure & Recon":
                matches = recon_detector.detect(rule, norm_path, norm_query, norm_headers, norm_body)
                findings.extend(matches)

        # 4. Calculate deterministic risk score
        risk_score = decision_engine.calculate_risk_score(findings)

        # 5. Apply security policy decision
        decision, effective_mode = decision_engine.evaluate_decision(
            risk_score=risk_score,
            findings=findings,
            mode_override=mode_override,
        )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return InspectResponse(
            request_id=request_id,
            timestamp=datetime.now(timezone.utc),
            decision=decision,
            risk_score=risk_score,
            findings_count=len(findings),
            findings=findings,
            processing_time_ms=elapsed_ms,
            client_ip=request.client_ip,
            method=request.method.upper(),
            path=request.path,
            policy_mode=effective_mode,
        )


pipeline = WAFPipeline()
