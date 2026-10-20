import React, { useState } from 'react';
import {
  Play,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileCode,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';
import { inspectWafRequest } from '@/services/wafApi';
import { InspectRequestPayload, InspectResponse } from '@/types/waf';

interface Preset {
  name: string;
  category: string;
  expected: string;
  payload: InspectRequestPayload;
}

const PRESETS: Preset[] = [
  {
    name: 'Benign API Search Request',
    category: 'Clean Traffic',
    expected: 'ALLOW (Score 0)',
    payload: {
      method: 'GET',
      path: '/api/v1/products',
      query_params: { search: 'wireless security gateway', limit: '20' },
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      body: '',
    },
  },
  {
    name: 'SQL Injection: UNION Extraction',
    category: 'SQL Injection',
    expected: 'BLOCK (Score >= 70)',
    payload: {
      method: 'GET',
      path: '/api/v1/users',
      query_params: { id: "1 UNION SELECT username, password FROM users--" },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      body: '',
    },
  },
  {
    name: 'SQL Injection: Auth Bypass Tautology',
    category: 'SQL Injection',
    expected: 'BLOCK (Score >= 50)',
    payload: {
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: "username=admin' OR 1=1--&password=foo",
    },
  },
  {
    name: 'XSS: Script Tag Injection',
    category: 'Cross-Site Scripting',
    expected: 'BLOCK (Score >= 50)',
    payload: {
      method: 'POST',
      path: '/api/v1/comments',
      headers: { 'Content-Type': 'application/json' },
      body: '{"author": "Guest", "comment": "<script>alert(document.cookie)</script>"}',
    },
  },
  {
    name: 'Path Traversal: /etc/passwd LFI',
    category: 'Path Traversal',
    expected: 'BLOCK (Score >= 75)',
    payload: {
      method: 'GET',
      path: '/api/v1/download',
      query_params: { file: '../../../../etc/passwd' },
      headers: { 'User-Agent': 'curl/7.68.0' },
      body: '',
    },
  },
  {
    name: 'Command Injection: Shell Pipe',
    category: 'Command Injection',
    expected: 'BLOCK (Score >= 80)',
    payload: {
      method: 'POST',
      path: '/api/v1/system/ping',
      headers: { 'Content-Type': 'application/json' },
      body: '{"target": "127.0.0.1; cat /etc/passwd"}',
    },
  },
  {
    name: 'Brute Force: Credential Spraying',
    category: 'Brute Force',
    expected: 'BLOCK (Score >= 75)',
    payload: {
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=admin',
    },
  },
  {
    name: 'SSRF: AWS Cloud Metadata',
    category: 'Server-Side Request Forgery',
    expected: 'BLOCK (Score >= 80)',
    payload: {
      method: 'GET',
      path: '/api/v1/fetch',
      query_params: { url: 'http://169.254.169.254/latest/meta-data/' },
      headers: { 'User-Agent': 'curl/7.68.0' },
      body: '',
    },
  },
  {
    name: 'XXE: XML External Entity File Read',
    category: 'XML External Entity',
    expected: 'BLOCK (Score >= 80)',
    payload: {
      method: 'POST',
      path: '/api/v1/xml-endpoint',
      headers: { 'Content-Type': 'application/xml' },
      body: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    },
  },
  {
    name: 'SSTI: Template Sandbox Escape',
    category: 'Template Injection',
    expected: 'BLOCK (Score >= 75)',
    payload: {
      method: 'GET',
      path: '/profile',
      query_params: { template: "{{''.__class__.__mro__[1].__subclasses__()}}" },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      body: '',
    },
  },
  {
    name: 'NoSQL: MongoDB Operator Injection',
    category: 'NoSQL & LDAP Injection',
    expected: 'BLOCK (Score >= 60)',
    payload: {
      method: 'POST',
      path: '/api/v1/login',
      headers: { 'Content-Type': 'application/json' },
      body: '{"username": {"$gt": ""}, "password": {"$ne": null}}',
    },
  },
  {
    name: 'Web Shell: Malicious Script Upload',
    category: 'File Upload & Web Shell',
    expected: 'BLOCK (Score >= 80)',
    payload: {
      method: 'POST',
      path: '/api/v1/upload',
      headers: { 'Content-Type': 'multipart/form-data; boundary=----WebKitBoundary' },
      body: '------WebKitBoundary\r\nContent-Disposition: form-data; name="file"; filename="shell.php"\r\n\r\n<?php eval($_POST["cmd"]); ?>\r\n------WebKitBoundary--',
    },
  },
  {
    name: 'Open Redirect: Untrusted Phishing URL',
    category: 'Open Redirect',
    expected: 'BLOCK (Score >= 50)',
    payload: {
      method: 'GET',
      path: '/auth/callback',
      query_params: { redirect_url: 'https://malicious-attacker.com/phish' },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      body: '',
    },
  },
  {
    name: 'CRLF: Header Injection / Splitting',
    category: 'Malformed Request',
    expected: 'BLOCK (Score >= 50)',
    payload: {
      method: 'GET',
      path: '/search',
      query_params: { query: 'test%0d%0aSet-Cookie:%20malicious=true' },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      body: '',
    },
  },
];

export const WAFLiveInspectTab: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/v1/users');
  const [queryParamsText, setQueryParamsText] = useState('id=1 UNION SELECT username, password FROM users--');
  const [headersText, setHeadersText] = useState('User-Agent: Mozilla/5.0');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: Preset) => {
    setMethod(preset.payload.method);
    setPath(preset.payload.path);
    if (preset.payload.query_params) {
      const q = Object.entries(preset.payload.query_params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      setQueryParamsText(q);
    } else {
      setQueryParamsText('');
    }
    if (preset.payload.headers) {
      const h = Object.entries(preset.payload.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      setHeadersText(h);
    } else {
      setHeadersText('');
    }
    setBody(preset.payload.body || '');
    setResult(null);
    setError(null);
  };

  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    // Parse Query Params
    const queryParams: Record<string, string> = {};
    if (queryParamsText.trim()) {
      queryParamsText
        .split('&')
        .map((part) => part.split('='))
        .forEach(([k, ...rest]) => {
          if (k) queryParams[k.trim()] = rest.join('=').trim();
        });
    }

    // Parse Headers
    const headers: Record<string, string> = {};
    if (headersText.trim()) {
      headersText.split('\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const k = line.slice(0, idx).trim();
          const v = line.slice(idx + 1).trim();
          if (k) headers[k] = v;
        }
      });
    }

    try {
      const res = await inspectWafRequest({
        method,
        path: path.trim() || '/',
        query_params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: body || undefined,
        client_ip: '127.0.0.1',
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to communicate with WAF engine');
    } finally {
      setLoading(false);
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision.toUpperCase()) {
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            BLOCK
          </span>
        );
      case 'MONITOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            MONITOR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            ALLOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Presets Header */}
      <div className="fanos-card p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-fanos-muted mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-fanos-accent" />
            Synthetic Attack Payload Presets
          </span>
          <span className="text-[10px] text-fanos-dim">Click a preset to test detectors</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/40 hover:bg-cyan-500/[0.04] text-left transition-all group"
            >
              <div className="text-[11px] font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                {preset.name}
              </div>
              <div className="flex items-center justify-between mt-1 text-[9px]">
                <span className="text-fanos-dim font-mono">{preset.category}</span>
                <span className="text-fanos-accent font-semibold">{preset.expected}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleInspect} className="fanos-card p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                HTTP Request Payload Simulator
              </span>
              <button
                type="submit"
                disabled={loading}
                className="fanos-btn px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5"
              >
                {loading ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {loading ? 'Inspecting...' : 'Inspect Request'}
              </button>
            </div>

            {/* Method & Path */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-semibold text-fanos-dim uppercase mb-1">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-semibold text-fanos-dim uppercase mb-1">Target URI Path</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/v1/..."
                  className="w-full px-2.5 py-1.5 rounded-md bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Query Params */}
            <div>
              <label className="block text-[10px] font-semibold text-fanos-dim uppercase mb-1">
                Query Parameters (key=value&key2=value2)
              </label>
              <input
                type="text"
                value={queryParamsText}
                onChange={(e) => setQueryParamsText(e.target.value)}
                placeholder="param=value..."
                className="w-full px-2.5 py-1.5 rounded-md bg-black/40 border border-white/10 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Headers */}
            <div>
              <label className="block text-[10px] font-semibold text-fanos-dim uppercase mb-1">
                Request Headers (One per line)
              </label>
              <textarea
                rows={2}
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                placeholder="Header-Name: Value"
                className="w-full px-2.5 py-1.5 rounded-md bg-black/40 border border-white/10 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[10px] font-semibold text-fanos-dim uppercase mb-1">
                Request Body (JSON / Form / Raw Text)
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"author": "Guest", ...}'
                className="w-full px-2.5 py-1.5 rounded-md bg-black/40 border border-white/10 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          </form>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Inspection Results (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="fanos-card p-4 min-h-[360px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  WAF Inspection Engine Verdict
                </span>
                {result && (
                  <span className="text-[10px] font-mono text-fanos-dim">
                    {result.processing_time_ms} ms
                  </span>
                )}
              </div>

              {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-fanos-dim">
                  <Layers className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">Ready for inspection</p>
                  <p className="text-[10px] text-fanos-dim mt-1 max-w-xs">
                    Select an attack preset or type custom payload and click Inspect Request.
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-fanos-dim gap-2">
                  <Clock className="w-8 h-8 animate-spin text-cyan-400" />
                  <p className="text-xs font-semibold text-slate-300">Evaluating multi-vector detectors...</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-4">
                  {/* Verdict Banner */}
                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase font-bold text-fanos-dim">Engine Verdict</div>
                      <div className="mt-1">{getDecisionBadge(result.decision)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase font-bold text-fanos-dim">Risk Score</div>
                      <div className="text-2xl font-mono font-bold text-white mt-0.5">
                        <span
                          style={{
                            color:
                              result.risk_score >= 70
                                ? '#ef4444'
                                : result.risk_score >= 30
                                ? '#f59e0b'
                                : '#00e5a0',
                          }}
                        >
                          {result.risk_score}
                        </span>
                        <span className="text-xs text-fanos-dim font-normal"> / 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Findings List */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fanos-muted mb-2 flex items-center justify-between">
                      <span>Detected Findings ({result.findings_count})</span>
                      <span className="font-mono text-fanos-dim text-[9px]">{result.request_id}</span>
                    </div>

                    {result.findings.length === 0 ? (
                      <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>No threat patterns matched. Request is clean and authorized.</span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {result.findings.map((f, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-rose-500/[0.06] border border-rose-500/20 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono font-bold text-rose-300">{f.rule_id}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                                {f.severity}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-white">{f.rule_name}</div>
                            <div className="text-[10px] text-fanos-dim">{f.description}</div>
                            {f.matched_value && (
                              <div className="mt-1 pt-1 border-t border-rose-500/10 font-mono text-[9px] text-rose-400 break-all">
                                Matched: <span className="bg-rose-950/60 px-1 py-0.5 rounded">{f.matched_value}</span> ({f.location})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {result && (
              <div className="pt-3 border-t border-white/[0.06] text-[9px] font-mono text-fanos-dim flex items-center justify-between">
                <span>Policy Mode: {result.policy_mode.toUpperCase()}</span>
                <span>Latency: {result.processing_time_ms}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
