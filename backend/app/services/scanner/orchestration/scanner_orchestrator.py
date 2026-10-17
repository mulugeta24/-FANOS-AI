"""
Scan Orchestration Engine
Coordinates target validation, asset discovery, crawling, technology detection,
security assessments, evidence collection, and finding aggregation in background workers.
"""
import threading
import time
import logging
import traceback
from datetime import datetime, timezone
import httpx

from scanner.models import (
    update_scan_job, get_scan_job, add_scan_finding, add_scan_evidence,
    get_scan_assets, get_scan_urls, get_scan_endpoints, get_scan_technologies
)
from scanner.target_validation.validator import validate_target, extract_domain
from scanner.asset_discovery.discoverer import run_asset_discovery
from scanner.technology.detector import detect_technologies
from scanner.crawler.crawler import ScopeControlledCrawler
from scanner.security_checks.headers import check_security_headers
from scanner.security_checks.cookies import check_cookie_security
from scanner.security_checks.tls import check_tls_security
from scanner.security_checks.information import check_information_exposure
from scanner.security_checks.cors import check_cors_security
from scanner.security_checks.forms_csrf import check_forms_and_csrf
from scanner.security_checks.mixed_content import check_mixed_content
from scanner.security_checks.injection import check_injection_and_xss


log = logging.getLogger(__name__)

# Registry to track active job cancellation tokens
_CANCEL_TOKENS = set()
_ACTIVE_THREADS = {}

def cancel_job_execution(job_id: str) -> bool:
    """Signals an active scan job to terminate early."""
    _CANCEL_TOKENS.add(job_id)
    update_scan_job(job_id, status='cancelled', current_phase='Cancelled by user')
    return True

def is_job_cancelled(job_id: str) -> bool:
    """Checks if a job has been cancelled."""
    if job_id in _CANCEL_TOKENS:
        return True
    job = get_scan_job(job_id)
    return job and job.get('status') == 'cancelled'

def execute_scan_pipeline(job_id: str, target_url: str, scope_config: dict = None, allow_private: bool = False):
    """
    Main background pipeline execution sequence.
    Updates PostgreSQL job record at each milestone.
    """
    start_dt = datetime.now(timezone.utc)
    target_domain = extract_domain(target_url)
    scope_config = scope_config or {}

    stats = {
        'assets': 0,
        'urls': 0,
        'apis': 0,
        'technologies': 0,
        'critical': 0,
        'high': 0,
        'medium': 0,
        'low': 0,
        'informational': 0
    }

    try:
        log.info(f"[Scanner] Starting scan job {job_id} for {target_url}")
        update_scan_job(
            job_id,
            status='running',
            progress=5,
            current_phase='Validating Target & Scope',
            start_time=start_dt,
            stats=stats
        )

        # ---------------------------------------------------------
        # PHASE 1: Target Validation & SSRF Enforcement
        # ---------------------------------------------------------
        if is_job_cancelled(job_id):
            return

        validation = validate_target(target_url, allow_private=allow_private)
        if not validation['valid']:
            err_msg = validation.get('error', 'Target validation failed')
            log.warning(f"[Scanner] Job {job_id} failed validation: {err_msg}")
            end_dt = datetime.now(timezone.utc)
            update_scan_job(
                job_id,
                status='failed',
                progress=100,
                current_phase='Validation Failed',
                error_message=err_msg,
                end_time=end_dt,
                duration_seconds=int((end_dt - start_dt).total_seconds())
            )
            return

        norm_url = validation['normalized_url']
        target_domain = validation['domain']

        # ---------------------------------------------------------
        # PHASE 2: Asset & Infrastructure Discovery
        # ---------------------------------------------------------
        if is_job_cancelled(job_id):
            return

        update_scan_job(job_id, progress=20, current_phase='Asset & Infrastructure Discovery')
        log.info(f"[Scanner] Job {job_id} discovering assets for {target_domain}")
        discovered_assets = run_asset_discovery(job_id, target_domain, allow_private=allow_private, scope_config=scope_config)
        
        # Calculate discovered assets
        assets_in_db = get_scan_assets(job_id)
        stats['assets'] = len(assets_in_db)
        update_scan_job(job_id, stats=stats)

        # ---------------------------------------------------------
        # PHASE 3: Technology Fingerprinting (Initial Probe)
        # ---------------------------------------------------------
        if is_job_cancelled(job_id):
            return

        update_scan_job(job_id, progress=35, current_phase='Technology Fingerprinting')
        log.info(f"[Scanner] Job {job_id} probing root URL {norm_url}")
        
        root_headers = {}
        root_cookies = {}
        root_text = ""
        root_status = 200

        try:
            with httpx.Client(timeout=10.0, follow_redirects=True, verify=False) as client:
                res = client.get(norm_url, headers={'User-Agent': 'FanosCyberSec-SecurityScanner/2.0'})
                root_headers = dict(res.headers)
                root_cookies = dict(res.cookies)
                root_text = res.text
                root_status = res.status_code
        except Exception as e:
            log.warning(f"[Scanner] Initial probe failed on {norm_url}: {e}")

        detected_tech = detect_technologies(job_id, root_headers, root_cookies, root_text)
        stats['technologies'] = len(detected_tech)
        update_scan_job(job_id, stats=stats)

        # ---------------------------------------------------------
        # PHASE 4: Web Crawling & API Discovery
        # ---------------------------------------------------------
        if is_job_cancelled(job_id):
            return

        update_scan_job(job_id, progress=55, current_phase='Web Crawling & API Discovery')
        log.info(f"[Scanner] Job {job_id} initiating scope-controlled crawler")
        
        crawler = ScopeControlledCrawler(
            job_id=job_id,
            target_url=norm_url,
            scope_config=scope_config,
            max_urls=scope_config.get('max_urls', 30),
            max_depth=scope_config.get('max_depth', 2)
        )
        crawl_results = crawler.crawl()

        # Update URLs and API counts
        urls_in_db = get_scan_urls(job_id)
        apis_in_db = get_scan_endpoints(job_id)
        stats['urls'] = len(urls_in_db)
        stats['apis'] = len(apis_in_db)
        update_scan_job(job_id, stats=stats)

        # If crawler got better initial response, update root data
        if crawl_results.get('initial_response'):
            init_resp = crawl_results['initial_response']
            root_headers = init_resp.get('headers', root_headers)
            root_cookies = init_resp.get('cookies', root_cookies)
            root_text = init_resp.get('text', root_text)
            root_status = init_resp.get('status_code', root_status)

        # ---------------------------------------------------------
        # PHASE 5: Security Audits & Vulnerability Checks
        # ---------------------------------------------------------
        if is_job_cancelled(job_id):
            return

        update_scan_job(job_id, progress=75, current_phase='Security Checks & Vulnerability Analysis')
        log.info(f"[Scanner] Job {job_id} executing security checks")

        all_findings = []

        # 1. HTTP Security Headers
        try:
            h_findings = check_security_headers(norm_url, root_headers)
            all_findings.extend(h_findings)
        except Exception as e:
            log.error(f"[Scanner] Header check error: {e}")

        # 2. Cookie Security
        try:
            c_findings = check_cookie_security(norm_url, root_headers)
            all_findings.extend(c_findings)
        except Exception as e:
            log.error(f"[Scanner] Cookie check error: {e}")

        # 3. TLS / SSL Security
        try:
            t_findings = check_tls_security(norm_url, target_domain)
            all_findings.extend(t_findings)
        except Exception as e:
            log.error(f"[Scanner] TLS check error: {e}")

        # 4. Information Exposure & Sensitive Files
        try:
            allow_active_probes = scope_config.get('allow_active_probes', True)
            i_findings = check_information_exposure(norm_url, root_headers, root_text, allow_probes=allow_active_probes)
            all_findings.extend(i_findings)
        except Exception as e:
            log.error(f"[Scanner] Info exposure check error: {e}")

        # 5. CORS Analysis
        try:
            cors_findings = check_cors_security(norm_url, root_headers)
            all_findings.extend(cors_findings)
        except Exception as e:
            log.error(f"[Scanner] CORS check error: {e}")

        # 6. Form Security & Anti-CSRF Analysis
        try:
            discovered_forms = getattr(crawler, 'discovered_forms', [])
            f_findings = check_forms_and_csrf(norm_url, discovered_forms)
            all_findings.extend(f_findings)
        except Exception as e:
            log.error(f"[Scanner] Form/CSRF check error: {e}")

        # 7. Mixed Content Analysis (HTTPS)
        try:
            m_findings = check_mixed_content(norm_url, root_text)
            all_findings.extend(m_findings)
        except Exception as e:
            log.error(f"[Scanner] Mixed content check error: {e}")

        # 8. DAST Injection & Client-Side Attacks (SQLi, XSS, Open Redirects)
        try:
            allow_active_probes = scope_config.get('allow_active_probes', True)
            crawled_urls = crawl_results.get('urls', [])
            inj_findings = check_injection_and_xss(crawled_urls, allow_probes=allow_active_probes)
            all_findings.extend(inj_findings)
        except Exception as e:
            log.error(f"[Scanner] DAST injection check error: {e}")

        # ---------------------------------------------------------
        # PHASE 6: Findings Persistence & Evidence Linkage
        # ---------------------------------------------------------
        for f in all_findings:
            f_id = f['id']
            add_scan_finding(
                finding_id=f_id,
                job_id=job_id,
                title=f['title'],
                severity=f['severity'],
                confidence=f.get('confidence', 'High confidence'),
                category=f.get('category', 'General Security'),
                affected_asset=f.get('affected_asset', norm_url),
                affected_url=f.get('affected_url', norm_url),
                http_method=f.get('http_method', 'GET'),
                parameter=f.get('parameter'),
                description=f.get('description', ''),
                impact=f.get('impact', ''),
                remediation=f.get('remediation', ''),
                references_data=f.get('references', []),
                evidence_data=f.get('evidence', {}),
                scanner_module=f.get('scanner_module', 'CoreScanner'),
                status='Open'
            )

            # Store evidence item in evidence table
            if f.get('evidence'):
                add_scan_evidence(
                    finding_id=f_id,
                    job_id=job_id,
                    evidence_type='http_analysis',
                    title=f"Technical Evidence: {f['title']}",
                    data=f['evidence']
                )

            # Update stats tally
            sev_key = f['severity'].lower()
            if sev_key in stats:
                stats[sev_key] += 1
            else:
                stats['informational'] += 1

        # ---------------------------------------------------------
        # PHASE 7: Completion & Finalization
        # ---------------------------------------------------------
        end_dt = datetime.now(timezone.utc)
        duration = int((end_dt - start_dt).total_seconds())

        update_scan_job(
            job_id,
            status='completed',
            progress=100,
            current_phase='Completed',
            stats=stats,
            end_time=end_dt,
            duration_seconds=duration
        )
        log.info(f"[Scanner] Job {job_id} successfully completed in {duration}s. Found {len(all_findings)} security findings.")

    except Exception as e:
        log.error(f"[Scanner] Unhandled error during scan {job_id}: {traceback.format_exc()}")
        end_dt = datetime.now(timezone.utc)
        update_scan_job(
            job_id,
            status='failed',
            progress=100,
            current_phase='Failed with unexpected error',
            error_message=str(e),
            end_time=end_dt,
            duration_seconds=int((end_dt - start_dt).total_seconds())
        )
    finally:
        _CANCEL_TOKENS.discard(job_id)
        _ACTIVE_THREADS.pop(job_id, None)

def launch_scan_job_async(job_id: str, target_url: str, scope_config: dict = None, allow_private: bool = False):
    """Spawns background daemon thread to run the scan pipeline."""
    thread = threading.Thread(
        target=execute_scan_pipeline,
        args=(job_id, target_url, scope_config, allow_private),
        daemon=True,
        name=f"WebScanWorker-{job_id}"
    )
    _ACTIVE_THREADS[job_id] = thread
    thread.start()
    return thread
