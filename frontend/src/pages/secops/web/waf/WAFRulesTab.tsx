import React, { useState, useEffect } from 'react';
import {
  ListFilter,
  Plus,
  CheckCircle2,
  XCircle,
  Search,
  Clock,
} from 'lucide-react';
import { getWafRules, updateWafRule, createWafRule } from '@/services/wafApi';
import { WAFRule } from '@/types/waf';
import { WAFDetailModal } from './WAFDetailModal';

export const WAFRulesTab: React.FC = () => {
  const [rules, setRules] = useState<WAFRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);

  // Add rule modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('Custom');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [newRuleAction, setNewRuleAction] = useState<'BLOCK' | 'MONITOR'>('BLOCK');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [savingRule, setSavingRule] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getWafRules(selectedCategory || undefined);
      setRules(data || []);
    } catch (err) {
      console.error('Failed to fetch WAF rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [selectedCategory]);

  const handleToggleRule = async (rule: WAFRule) => {
    setTogglingRuleId(rule.id);
    try {
      await updateWafRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !rule.enabled } : r))
      );
    } catch (err) {
      console.error('Failed to toggle rule', err);
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    setRuleError(null);
    try {
      await createWafRule({
        name: newRuleName,
        category: newRuleCategory,
        severity: newRuleSeverity,
        action: newRuleAction,
        pattern: newRulePattern,
        description: newRuleDescription,
        enabled: true,
        is_custom: true,
        target_locations: ['query', 'body', 'headers'],
        tags: ['custom', newRuleCategory.toLowerCase()],
      });
      setIsAddModalOpen(false);
      setNewRuleName('');
      setNewRulePattern('');
      setNewRuleDescription('');
      fetchRules();
    } catch (err: any) {
      setRuleError(err?.response?.data?.detail || err?.message || 'Failed to save rule');
    } finally {
      setSavingRule(false);
    }
  };

  const categories = [
    { label: 'All Categories', value: '' },
    { label: 'SQL Injection', value: 'SQL Injection' },
    { label: 'Cross-Site Scripting', value: 'Cross-Site Scripting' },
    { label: 'Path Traversal', value: 'Path Traversal' },
    { label: 'Command Injection', value: 'Command Injection' },
    { label: 'Brute Force', value: 'Brute Force' },
    { label: 'SSRF', value: 'Server-Side Request Forgery' },
    { label: 'XXE', value: 'XML External Entity' },
    { label: 'SSTI', value: 'Template Injection' },
    { label: 'NoSQL & LDAP', value: 'NoSQL & LDAP Injection' },
    { label: 'File Upload & Web Shell', value: 'File Upload & Web Shell' },
    { label: 'Open Redirect', value: 'Open Redirect' },
    { label: 'Security Policy', value: 'Security Policy' },
    { label: 'Custom', value: 'Custom' },
  ];

  const filteredRules = rules.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="badge-critical">{sev}</span>;
      case 'HIGH':
        return <span className="badge-high">{sev}</span>;
      case 'MEDIUM':
        return <span className="badge-medium">{sev}</span>;
      default:
        return <span className="badge-low">{sev}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-fanos-dim absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rules by name, ID, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Add Rule Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fanos-btn px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Custom Rule
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setSelectedCategory(c.value)}
            className="px-3 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all"
            style={{
              background: selectedCategory === c.value ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.03)',
              color: selectedCategory === c.value ? '#00c8ff' : '#94A3B8',
              border: selectedCategory === c.value ? '1px solid rgba(0,200,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Rules Table */}
      <div className="fanos-card overflow-hidden">
        <div className="fanos-panel-header">
          <div className="fanos-panel-title">
            <ListFilter size={13} className="text-cyan-400" />
            Deterministic Inspection Rules Catalog
          </div>
          <span className="text-[10px] text-fanos-dim font-mono">
            {filteredRules.length} rules active ({rules.filter((r) => r.enabled).length} enabled)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.06]">
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Rule ID</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Name & Scope</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Category</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Severity</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Action</th>
                <th className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">Target Scope</th>
                <th className="px-3 py-2.5 text-right text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-fanos-dim font-mono">
                    <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading detection rules...
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-fanos-dim font-mono">
                    No rules found for selected category.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[10px] font-bold text-cyan-400 whitespace-nowrap">
                      {rule.id}
                      {rule.is_custom && (
                        <span className="ml-1.5 px-1 py-0.2 rounded text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          CUSTOM
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 max-w-sm">
                      <div className="text-xs font-semibold text-white">{rule.name}</div>
                      <div className="text-[10px] text-fanos-dim truncate mt-0.5">{rule.description}</div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-300 font-mono whitespace-nowrap">
                      {rule.category}
                    </td>
                    <td className="px-3 py-2.5">{getSeverityBadge(rule.severity)}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                        {rule.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[9px] text-fanos-dim whitespace-nowrap">
                      {rule.target_locations?.join(', ') || 'all'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        disabled={togglingRuleId === rule.id}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                          rule.enabled
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {rule.enabled ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Rule Modal */}
      <WAFDetailModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Custom Deterministic WAF Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">Rule Name</label>
            <input
              type="text"
              required
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              placeholder="e.g. Block Suspicious Admin Access Token"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">Category</label>
              <select
                value={newRuleCategory}
                onChange={(e) => setNewRuleCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Custom">Custom Policy</option>
                <option value="SQL Injection">SQL Injection</option>
                <option value="Cross-Site Scripting">Cross-Site Scripting</option>
                <option value="Path Traversal">Path Traversal</option>
                <option value="Command Injection">Command Injection</option>
                <option value="Brute Force">Brute Force</option>
                <option value="Server-Side Request Forgery">Server-Side Request Forgery</option>
                <option value="XML External Entity">XML External Entity</option>
                <option value="Template Injection">Template Injection</option>
                <option value="NoSQL & LDAP Injection">NoSQL & LDAP Injection</option>
                <option value="File Upload & Web Shell">File Upload & Web Shell</option>
                <option value="Open Redirect">Open Redirect</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">Severity</label>
              <select
                value={newRuleSeverity}
                onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">Action</label>
              <select
                value={newRuleAction}
                onChange={(e) => setNewRuleAction(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="BLOCK">BLOCK</option>
                <option value="MONITOR">MONITOR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">Regex Pattern</label>
            <input
              type="text"
              required
              value={newRulePattern}
              onChange={(e) => setNewRulePattern(e.target.value)}
              placeholder="e.g. (?i)(wp-login\.php|xmlrpc\.php)"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-fanos-dim uppercase mb-1">Description</label>
            <textarea
              rows={2}
              value={newRuleDescription}
              onChange={(e) => setNewRuleDescription(e.target.value)}
              placeholder="Explain the threat scenario this rule mitigates..."
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          {ruleError && (
            <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {ruleError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 rounded text-fanos-dim hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingRule}
              className="fanos-btn px-4 py-1.5 text-xs font-bold"
            >
              {savingRule ? 'Saving Rule...' : 'Save & Arm Rule'}
            </button>
          </div>
        </form>
      </WAFDetailModal>
    </div>
  );
};
