"""
Scope-Controlled Asynchronous/Threaded Web Crawler
Extracts links, forms, scripts, and API routes within strict authorized boundaries.
"""
import re
import time
import logging
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import httpx

from scanner.target_validation import normalize_url, is_url_in_scope, extract_domain
from scanner.models import add_scan_url, add_scan_asset, add_scan_endpoint

log = logging.getLogger(__name__)

# Extensions to skip crawling (media/documents)
SKIP_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
    '.pdf', '.zip', '.tar', '.gz', '.mp4', '.mp3', '.avi',
    '.woff', '.woff2', '.ttf', '.eot', '.css'
}

class ScopeControlledCrawler:
    def __init__(self, job_id: str, target_url: str, scope_config: dict = None, max_urls: int = 50, max_depth: int = 2):
        self.job_id = job_id
        self.target_url = normalize_url(target_url)
        self.target_domain = extract_domain(self.target_url)
        self.scope_config = scope_config or {}
        self.max_urls = self.scope_config.get('max_urls', max_urls)
        self.max_depth = self.scope_config.get('max_depth', max_depth)
        self.visited = set()
        self.discovered_urls = []
        self.discovered_forms = []
        self.discovered_apis = []
        self.discovered_scripts = []
        self.initial_response_data = None

    def should_crawl(self, url: str) -> bool:
        """Determines if a URL should be crawled based on scope, file type, and history."""
        norm = normalize_url(url)
        if norm in self.visited:
            return False
            
        parsed = urlparse(norm)
        # Avoid media files
        for ext in SKIP_EXTENSIONS:
            if parsed.path.lower().endswith(ext):
                return False
                
        # Check scope
        return is_url_in_scope(norm, self.target_domain, self.scope_config)

    def extract_page_elements(self, current_url: str, html: str, client: httpx.Client) -> list[str]:
        """Extracts links, forms, scripts, and potential API endpoints from HTML."""
        links_to_follow = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 1. Links (<a href>)
            for a in soup.find_all('a', href=True):
                href = a['href'].strip()
                if not href or href.startswith(('javascript:', 'mailto:', 'tel:', '#')):
                    continue
                full_url = urljoin(current_url, href)
                norm_full = normalize_url(full_url)
                if self.should_crawl(norm_full) and len(self.visited) + len(links_to_follow) < self.max_urls:
                    links_to_follow.append(norm_full)

            # 2. Forms (<form>)
            for form in soup.find_all('form'):
                action = form.get('action') or ''
                method = (form.get('method') or 'GET').upper()
                full_action = urljoin(current_url, action)
                inputs = []
                for inp in form.find_all(['input', 'textarea', 'select']):
                    inp_name = inp.get('name')
                    inp_type = inp.get('type', 'text')
                    if inp_name:
                        inputs.append({'name': inp_name, 'type': inp_type})
                
                form_data = {
                    'action': full_action,
                    'method': method,
                    'inputs': inputs,
                    'source_page': current_url
                }
                self.discovered_forms.append(form_data)
                add_scan_asset(self.job_id, 'form', f"{method} {full_action}", form_data)

            # 3. Scripts (<script src>)
            for s in soup.find_all('script', src=True):
                src = s['src'].strip()
                if src:
                    full_src = urljoin(current_url, src)
                    script_data = {'src': full_src, 'page': current_url}
                    self.discovered_scripts.append(script_data)
                    add_scan_asset(self.job_id, 'javascript', full_src, script_data)

            # 4. API Endpoints from inline text or scripts (e.g. /api/..., /v1/..., fetch('/...'))
            api_patterns = [
                r'["\'](/api/[a-zA-Z0-9_\-\/]+)["\']',
                r'["\'](/v[0-9]+/[a-zA-Z0-9_\-\/]+)["\']',
                r'fetch\(["\']([^"\']+)["\']',
                r'axios\.(?:get|post|put|delete)\(["\']([^"\']+)["\']',
            ]
            for pat in api_patterns:
                for match in re.findall(pat, html):
                    endpoint_path = match if match.startswith('/') else '/' + match
                    full_api = urljoin(current_url, endpoint_path)
                    if full_api not in [a['endpoint_url'] for a in self.discovered_apis]:
                        api_entry = {
                            'endpoint_url': full_api,
                            'http_method': 'GET',
                            'source_page': current_url
                        }
                        self.discovered_apis.append(api_entry)
                        add_scan_endpoint(self.job_id, full_api, http_method='GET', metadata={'discovered_from': current_url})
                        add_scan_asset(self.job_id, 'api_endpoint', full_api, api_entry)

        except Exception as e:
            log.warning(f"Error parsing HTML on {current_url}: {e}")

        return links_to_follow

    def crawl(self) -> dict:
        """
        Executes bounded crawl within authorized scope.
        """
        queue = [(self.target_url, 0)]
        self.visited.add(self.target_url)
        
        headers = {
            'User-Agent': 'Fanos-SecurityScanner/2.4 (Authorized-Security-Assessment; +https://fanos-cybersec.local/audit)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        timeout = httpx.Timeout(8.0, connect=5.0)
        limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)

        with httpx.Client(headers=headers, timeout=timeout, limits=limits, follow_redirects=True, verify=False) as client:
            while queue and len(self.visited) <= self.max_urls:
                current_url, depth = queue.pop(0)
                
                t_start = time.time()
                try:
                    resp = client.get(current_url)
                    dur_ms = int((time.time() - t_start) * 1000)
                    
                    status = resp.status_code
                    content_type = resp.headers.get('content-type', '').split(';')[0].strip()
                    
                    # Record URL in database
                    add_scan_url(
                        job_id=self.job_id,
                        url=current_url,
                        status_code=status,
                        content_type=content_type,
                        response_time_ms=dur_ms,
                        in_scope=True
                    )
                    add_scan_asset(self.job_id, 'url', current_url, {'status': status, 'content_type': content_type})
                    
                    self.discovered_urls.append({
                        'url': current_url,
                        'status_code': status,
                        'content_type': content_type,
                        'headers': dict(resp.headers),
                        'cookies': dict(resp.cookies),
                    })

                    # If this is the root / initial target URL, keep full headers & text for security checks
                    if self.initial_response_data is None:
                        self.initial_response_data = {
                            'url': current_url,
                            'status_code': status,
                            'headers': dict(resp.headers),
                            'cookies': dict(resp.cookies),
                            'text': resp.text,
                            'history': [r.status_code for r in resp.history]
                        }

                    # If HTML, extract links and components if within depth limit
                    if 'text/html' in content_type and depth < self.max_depth:
                        links = self.extract_page_elements(current_url, resp.text, client)
                        for link in links:
                            if link not in self.visited:
                                self.visited.add(link)
                                queue.append((link, depth + 1))
                                
                    # Polite rate limiting between crawl requests
                    time.sleep(0.05)

                except Exception as e:
                    dur_ms = int((time.time() - t_start) * 1000)
                    log.warning(f"Crawl request failed for {current_url}: {e}")
                    add_scan_url(
                        job_id=self.job_id,
                        url=current_url,
                        status_code=0,
                        content_type='error',
                        response_time_ms=dur_ms,
                        in_scope=True
                    )

        return {
            'urls_crawled': len(self.discovered_urls),
            'forms_discovered': len(self.discovered_forms),
            'scripts_discovered': len(self.discovered_scripts),
            'apis_discovered': len(self.discovered_apis),
            'initial_response': self.initial_response_data,
            'urls': self.discovered_urls
        }
