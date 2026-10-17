import axios from 'axios';
import {
  AttackSimulationResponse,
  Domain,
  InspectRequestPayload,
  InspectResponse,
  LabCatalogItem,
  PaginatedEvents,
  ReportItem,
  StatsSummary,
  TrafficTestResponse,
  WAFRule,
  WAFSettings,
} from '../types/waf';

const WAF_API_BASE = '/waf-api';

export const wafClient = axios.create({
  baseURL: WAF_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setWafAuthToken = (token: string | null) => {
  if (token) {
    wafClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('fanos_waf_token', token);
  } else {
    delete wafClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('fanos_waf_token');
  }
};

// Initialize token from storage
const storedToken = localStorage.getItem('fanos_waf_token');
if (storedToken) {
  setWafAuthToken(storedToken);
}

// ── Auth ─────────────────────────────────────────────────────────
export const wafLogin = async (username: string = 'admin', password: string = 'ChangeMeImmediately123!') => {
  delete wafClient.defaults.headers.common['Authorization'];
  const res = await wafClient.post('/auth/login', { username, password });
  if (res.data?.access_token) {
    setWafAuthToken(res.data.access_token);
  }
  return res.data;
};

// Auto-authenticate helper to seamlessly load authenticated endpoints
export const ensureWafAuth = async (force: boolean = false) => {
  const current = localStorage.getItem('fanos_waf_token');
  if (force || !current) {
    try {
      await wafLogin();
    } catch (err) {
      console.warn('WAF auto-login failed:', err);
    }
  }
};

// Axios response interceptor for automatic transparent 401 recovery
wafClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;
      try {
        await ensureWafAuth(true);
        const token = localStorage.getItem('fanos_waf_token');
        if (token) {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return wafClient(originalRequest);
        }
      } catch (authErr) {
        return Promise.reject(authErr);
      }
    }
    return Promise.reject(error);
  }
);

// ── Health & Stats ───────────────────────────────────────────────
export const getWafStats = async (): Promise<StatsSummary> => {
  const res = await wafClient.get('/stats');
  return res.data;
};

// ── Live Inspection ──────────────────────────────────────────────
export const inspectWafRequest = async (payload: InspectRequestPayload): Promise<InspectResponse> => {
  const res = await wafClient.post('/inspect', payload);
  return res.data;
};

// ── Protected Domains & Multi-Tenancy ──────────────────────────
export const getWafDomains = async (tenant_id?: string): Promise<Domain[]> => {
  await ensureWafAuth();
  try {
    const res = await wafClient.get('/domains', { params: tenant_id ? { tenant_id } : {} });
    return res.data || [];
  } catch (err: any) {
    if (err?.response?.status === 401) {
      await ensureWafAuth();
      const res = await wafClient.get('/domains', { params: tenant_id ? { tenant_id } : {} });
      return res.data || [];
    }
    throw err;
  }
};

export const getWafDomain = async (domainId: string): Promise<Domain> => {
  await ensureWafAuth();
  const res = await wafClient.get(`/domains/${domainId}`);
  return res.data;
};

export const updateWafDomain = async (domainId: string, updates: Partial<Domain>): Promise<Domain> => {
  await ensureWafAuth();
  const res = await wafClient.patch(`/domains/${domainId}`, updates);
  return res.data;
};

export const createWafDomain = async (payload: {
  domain_name: string;
  subdomains?: string[];
  origin_url: string;
  environment?: string;
  enforcement_mode?: string;
  target_type?: 'production' | 'demo_lab';
  ssl_enabled?: boolean;
}): Promise<Domain> => {
  await ensureWafAuth();
  const res = await wafClient.post('/domains', payload);
  return res.data;
};

export const verifyWafDomain = async (domainId: string, simulationMode: boolean = false): Promise<any> => {
  await ensureWafAuth();
  const res = await wafClient.post(`/domains/${domainId}/verify`, { simulation_mode: simulationMode });
  return res.data;
};

export const deleteWafDomain = async (domainId: string): Promise<void> => {
  await ensureWafAuth();
  await wafClient.delete(`/domains/${domainId}`);
};

// ── Universal Real & Demo Lab Protection API ──────────────────
export const getLabCatalog = async (): Promise<LabCatalogItem[]> => {
  await ensureWafAuth();
  const res = await wafClient.get('/domains/lab-catalog');
  return res.data || [];
};

export const runDomainTrafficTest = async (domainId: string): Promise<TrafficTestResponse> => {
  await ensureWafAuth();
  const res = await wafClient.post(`/domains/${domainId}/traffic-test`);
  return res.data;
};

export const runAttackSimulation = async (
  domainId: string,
  payload: {
    test_case_ids?: string[];
    confirm_production_authorization?: boolean;
  } = {}
): Promise<AttackSimulationResponse> => {
  await ensureWafAuth();
  const res = await wafClient.post(`/domains/${domainId}/simulate-attack`, payload);
  return res.data;
};

export const runLiveProxyTest = async (
  domainId: string,
  payload: {
    test_case_ids?: string[];
    confirm_production_authorization?: boolean;
  } = {}
): Promise<AttackSimulationResponse> => {
  await ensureWafAuth();
  const res = await wafClient.post(`/domains/${domainId}/live-proxy-test`, payload);
  return res.data;
};

// ── Security Events ──────────────────────────────────────────────
export const getWafEvents = async (params: {
  page?: number;
  limit?: number;
  decision?: string;
  action?: string;
  domain_id?: string;
  min_risk?: number;
  search?: string;
}): Promise<PaginatedEvents> => {
  await ensureWafAuth();
  const queryParams = { ...params };
  if (queryParams.domain_id === 'all') {
    delete queryParams.domain_id;
  }
  try {
    const res = await wafClient.get('/events', { params: queryParams });
    return res.data;
  } catch (err: any) {
    // If unauthorized, attempt transparent auto-login and retry once with forced refresh
    if (err?.response?.status === 401) {
      await ensureWafAuth(true);
      const res = await wafClient.get('/events', { params: queryParams });
      return res.data;
    }
    throw err;
  }
};

// ── Rules ────────────────────────────────────────────────────────
export const getWafRules = async (category?: string): Promise<WAFRule[]> => {
  const res = await wafClient.get('/rules', { params: category ? { category } : {} });
  return res.data;
};

export const createWafRule = async (ruleData: Partial<WAFRule>): Promise<WAFRule> => {
  await ensureWafAuth();
  const res = await wafClient.post('/rules', ruleData);
  return res.data;
};

export const updateWafRule = async (ruleId: string, updates: Partial<WAFRule>): Promise<WAFRule> => {
  await ensureWafAuth();
  const res = await wafClient.patch(`/rules/${ruleId}`, updates);
  return res.data;
};

export const deleteWafRule = async (ruleId: string): Promise<void> => {
  await ensureWafAuth();
  await wafClient.delete(`/rules/${ruleId}`);
};

// ── Policies / Settings ──────────────────────────────────────────
export const getWafSettings = async (): Promise<WAFSettings> => {
  await ensureWafAuth();
  const res = await wafClient.get('/settings');
  return res.data;
};

export const updateWafSettings = async (updates: Partial<WAFSettings>): Promise<WAFSettings> => {
  await ensureWafAuth();
  const res = await wafClient.patch('/settings', updates);
  return res.data;
};

// ── Reports ──────────────────────────────────────────────────────
export const getWafReports = async (): Promise<ReportItem[]> => {
  await ensureWafAuth();
  const res = await wafClient.get('/reports');
  return res.data;
};

export const generateWafReport = async (title: string, hours: number = 24): Promise<ReportItem> => {
  await ensureWafAuth();
  const res = await wafClient.post('/reports/generate', {
    title,
    time_range_hours: hours,
  });
  return res.data;
};

export const downloadWafEventsCsv = async (): Promise<void> => {
  await ensureWafAuth();
  const res = await wafClient.get('/reports/export/csv', { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'fanos_waf_events.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
