"""
JSON & Export Report Generator
"""
def generate_json_report(job: dict, assets: list, technologies: list, urls: list, endpoints: list, findings: list) -> dict:
    """
    Builds a clean structured JSON assessment report.
    """
    return {
        'scanner': {
            'product': 'Fanos CyberSec Enterprise Web Security Scanner',
            'version': '2.0',
            'scan_id': job.get('id'),
            'status': job.get('status'),
            'timestamp': job.get('start_time'),
            'duration_seconds': job.get('duration_seconds', 0),
            'operator': job.get('authorized_by')
        },
        'scope': {
            'target_url': job.get('target_url'),
            'target_domain': job.get('target_domain'),
            'scope_config': job.get('scope_config', {})
        },
        'summary': job.get('stats', {}),
        'assets': assets,
        'technologies': technologies,
        'crawled_urls': urls,
        'discovered_endpoints': endpoints,
        'findings': findings
    }
