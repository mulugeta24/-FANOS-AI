export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Decision = 'ALLOW' | 'MONITOR' | 'BLOCK';
export type RuleAction = 'BLOCK' | 'MONITOR' | 'LOG' | 'ALERT';

export interface Finding {
  rule_id: string;
  rule_name: string;
  category: string;
  severity: Severity;
  action: RuleAction;
  location: string;
  matched_value: string;
  description: string;
}

export interface InspectRequestPayload {
  method: string;
  path: string;
  query_params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  client_ip?: string;
  user_agent?: string;
}

export interface InspectResponse {
  request_id: string;
  timestamp: string;
  decision: Decision;
  risk_score: number;
  findings_count: number;
  findings: Finding[];
  processing_time_ms: number;
  client_ip: string;
  method: string;
  path: string;
  policy_mode: string;
}

export interface WAFSecurityEvent {
  id: string;
  request_id: string;
  timestamp: string;
  client_ip: string;
  method: string;
  path: string;
  decision: Decision;
  action?: string;
  risk_score: number;
  findings_count: number;
  findings: Finding[];
  processing_time_ms: number;
  policy_mode: string;
  domain_id?: string;
  hostname?: string;
  tenant_id?: string;
  http_status?: number;
  origin_status?: number;
  headers_sanitized?: Record<string, string>;
  query_sanitized?: Record<string, string>;
  body_sanitized?: string;
  is_test?: boolean;
}

export interface PaginatedEvents {
  total: number;
  page: number;
  limit: number;
  pages: number;
  events: WAFSecurityEvent[];
}

export interface WAFRule {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  action: RuleAction;
  description: string;
  enabled: boolean;
  is_custom: boolean;
  pattern?: string;
  target_locations: string[];
  tags: string[];
}

export interface StatsSummary {
  total_inspected: number;
  total_allowed: number;
  total_monitored: number;
  total_blocked: number;
  active_rules_count: number;
  custom_rules_count: number;
  current_mode: string;
  total_domains?: number;
  verified_domains?: number;
  active_domains?: number;
  severity_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  top_attack_categories: {
    category: string;
    count: number;
  }[];
  recent_activity_timeline: {
    hour: string;
    inspected: number;
    blocked: number;
    monitored: number;
  }[];
}

export interface DomainProtectionStages {
  domain_registered: boolean;
  ownership_verified: boolean;
  tls_ready: boolean;
  proxy_route_configured: boolean;
  traffic_verified: boolean;
  protection_active: boolean;
}

export interface Domain {
  id: string;
  tenant_id: string;
  domain_name: string;
  hostname?: string;
  subdomains: string[];
  origin_url: string;
  environment: 'development' | 'staging' | 'production';
  enforcement_mode: 'monitor' | 'block' | 'hybrid' | string;
  target_type: 'production' | 'demo_lab';
  verification_status: 'pending' | 'verified' | 'failed' | 'expired';
  verification_token: string;
  verified_at?: string;
  is_active: boolean;
  ssl_enabled: boolean;
  ssl_mode: string;
  tls_status: 'not_configured' | 'pending' | 'valid' | 'expired';
  proxy_status: 'not_routed' | 'configured' | 'error';
  health_status: 'unknown' | 'healthy' | 'degraded' | 'unreachable';
  last_health_check_at?: string;
  traffic_verified: boolean;
  last_traffic_test_at?: string;
  protection_status: 'DOMAIN_REGISTERED' | 'OWNERSHIP_VERIFIED' | 'TLS_READY' | 'PROXY_ROUTE_CONFIGURED' | 'END_TO_END_TRAFFIC_VERIFIED' | 'PROTECTION_ACTIVE';
  protection_stages?: DomainProtectionStages;
  dns_txt_record_name: string;
  dns_txt_record_value: string;
  created_at: string;
  updated_at?: string;
}

export interface TrafficTestResponse {
  domain_id: string;
  domain_name: string;
  target_type: 'production' | 'demo_lab';
  success: boolean;
  status_code?: number;
  latency_ms: number;
  message: string;
  tested_at: string;
  protection_status: string;
  protection_stages: DomainProtectionStages;
}

export interface AttackSimulationItem {
  test_id: string;
  name: string;
  vector: string;
  matched_rule?: string;
  risk_score: number;
  decision: string;
  blocked_before_origin: boolean;
  is_test: boolean;
  status: string;
  details: string;
  test_type?: 'detection_engine_simulation' | 'live_proxy_test';
  proxy_status_code?: number;
  origin_received?: boolean;
}

export interface AttackSimulationResponse {
  test_run_id: string;
  domain_id: string;
  domain_name: string;
  target_type: 'production' | 'demo_lab';
  enforcement_mode: string;
  timestamp: string;
  tests_passed: number;
  tests_total: number;
  test_type?: 'detection_engine_simulation' | 'live_proxy_test';
  results: AttackSimulationItem[];
}

export interface LabCatalogItem {
  id: string;
  name: string;
  description: string;
  recommended_domain: string;
  recommended_origin: string;
  target_type: 'demo_lab';
  icon: string;
  quick_start: string;
}

export interface WAFSettings {
  waf_mode: 'monitor' | 'block' | 'hybrid' | string;
  block_threshold: number;
  monitor_threshold: number;
  max_body_size_bytes: number;
  max_uri_length: number;
  allowlist_ips: string[];
  monitored_paths: string[];
}

export interface ReportItem {
  id: string;
  title: string;
  generated_at: string;
  time_range: string;
  total_inspected: number;
  total_allowed: number;
  total_monitored: number;
  total_blocked: number;
  summary: Record<string, any>;
}
