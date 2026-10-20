import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Plus,
  X,
  Server,
  ShieldCheck,
  CheckCircle2,
  FlaskConical,
  Lock,
  Sparkles,
  Zap,
  Settings,
  ChevronDown,
  Trash2,
  Check,
} from 'lucide-react';
import { Domain, LabCatalogItem } from '@/types/waf';
import {
  createWafDomain,
  verifyWafDomain,
  getLabCatalog,
  updateWafDomain,
  deleteWafDomain,
} from '@/services/wafApi';

interface WAFDomainSelectorProps {
  selectedDomainId: string; // 'all' or specific domain id
  onSelectDomain: (domainId: string, domain?: Domain) => void;
  domains: Domain[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDomainAdded?: (newDomain: Domain) => void;
  isExternalModalOpen?: boolean;
  setIsExternalModalOpen?: (open: boolean) => void;
  externalManageDomain?: Domain | null;
  setExternalManageDomain?: (domain: Domain | null) => void;
}

export const WAFDomainSelector: React.FC<WAFDomainSelectorProps> = ({
  selectedDomainId,
  onSelectDomain,
  domains,
  loading,
  error,
  onRefresh,
  onDomainAdded,
  isExternalModalOpen,
  setIsExternalModalOpen,
  externalManageDomain,
  setExternalManageDomain,
}) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<'production' | 'demo_lab'>('production');
  const [domainName, setDomainName] = useState('');
  const [originUrl, setOriginUrl] = useState('https://app.customer.com');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [enforcementMode, setEnforcementMode] = useState<'monitor' | 'block' | 'hybrid'>('block');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [createdDomain, setCreatedDomain] = useState<Domain | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [labCatalog, setLabCatalog] = useState<LabCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Quick mode switch dropdown state for the selected target
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Manage Modal State (for updating the active domain)
  const [manageOrigin, setManageOrigin] = useState('');
  const [manageEnv, setManageEnv] = useState<'production' | 'staging' | 'development'>('production');
  const [manageMode, setManageMode] = useState<'monitor' | 'block' | 'hybrid'>('block');
  const [manageSaving, setManageSaving] = useState(false);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedDomain = domains.find((d) => d.id === selectedDomainId);

  // Sync external open triggers from Overview or other tabs
  useEffect(() => {
    if (isExternalModalOpen) {
      setIsModalOpen(true);
      if (setIsExternalModalOpen) setIsExternalModalOpen(false);
    }
  }, [isExternalModalOpen, setIsExternalModalOpen]);

  useEffect(() => {
    if (externalManageDomain) {
      onSelectDomain(externalManageDomain.id, externalManageDomain);
      setIsManageModalOpen(true);
      if (setExternalManageDomain) setExternalManageDomain(null);
    }
  }, [externalManageDomain, onSelectDomain, setExternalManageDomain]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    if (isModeDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isModeDropdownOpen]);

  // Load catalog on modal open
  useEffect(() => {
    if (isModalOpen && labCatalog.length === 0) {
      setLoadingCatalog(true);
      getLabCatalog()
        .then((items) => setLabCatalog(items))
        .catch((err) => console.warn('Could not load lab catalog:', err))
        .finally(() => setLoadingCatalog(false));
    }
  }, [isModalOpen]);

  // Populate manage modal when opened
  useEffect(() => {
    if (selectedDomain && isManageModalOpen) {
      setManageOrigin(selectedDomain.origin_url || '');
      setManageEnv(selectedDomain.environment as any || 'production');
      setManageMode(
        selectedDomain.enforcement_mode === 'hybrid' || selectedDomain.enforcement_mode === 'both'
          ? 'hybrid'
          : selectedDomain.enforcement_mode === 'block'
          ? 'block'
          : 'monitor'
      );
      setManageMessage(null);
      setConfirmDelete(false);
    }
  }, [isManageModalOpen, selectedDomain]);

  // Show temporary toast message
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getProtectionStatusBadge = (dom: Domain) => {
    const status = dom.protection_status || (dom.verification_status === 'verified' ? 'OWNERSHIP_VERIFIED' : 'DOMAIN_REGISTERED');
    switch (status) {
      case 'PROTECTION_ACTIVE':
        return {
          label: 'PROTECTION ACTIVE',
          bg: 'bg-emerald-500/20',
          text: 'text-emerald-400',
          border: 'border-emerald-500/40',
        };
      case 'END_TO_END_TRAFFIC_VERIFIED':
        return {
          label: 'TRAFFIC VERIFIED',
          bg: 'bg-cyan-500/20',
          text: 'text-cyan-400',
          border: 'border-cyan-500/40',
        };
      case 'PROXY_ROUTE_CONFIGURED':
        return {
          label: 'PROXY READY',
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/40',
        };
      case 'TLS_READY':
        return {
          label: 'TLS READY',
          bg: 'bg-indigo-500/20',
          text: 'text-indigo-400',
          border: 'border-indigo-500/40',
        };
      case 'OWNERSHIP_VERIFIED':
        return {
          label: 'AWAITING TRAFFIC TEST',
          bg: 'bg-amber-500/20',
          text: 'text-amber-400',
          border: 'border-amber-500/40',
        };
      default:
        return {
          label: 'PENDING VERIFY',
          bg: 'bg-slate-800 text-slate-400',
          text: 'text-slate-400',
          border: 'border-slate-700',
        };
    }
  };

  const handleSelectLabPreset = (item: LabCatalogItem) => {
    setTargetType('demo_lab');
    setDomainName(item.recommended_domain);
    setOriginUrl(item.recommended_origin);
    setEnvironment('development');
    setEnforcementMode('block');
  };

  // Check if current input in create modal already exists in domain fleet
  const cleanInputDomain = domainName.trim().toLowerCase();
  const existingDomainMatch = domains.find(
    (d) => d.domain_name.toLowerCase() === cleanInputDomain
  );

  // Quick switch mode for active domain
  const handleQuickShiftMode = async (targetMode: 'monitor' | 'block' | 'hybrid') => {
    if (!selectedDomain) return;
    setIsSwitchingMode(true);
    setIsModeDropdownOpen(false);
    try {
      const updated = await updateWafDomain(selectedDomain.id, {
        enforcement_mode: targetMode,
      });
      onRefresh();
      onSelectDomain(updated.id, updated);
      triggerToast(`Domain "${selectedDomain.domain_name}" switched to ${targetMode.toUpperCase()}${targetMode === 'hybrid' ? ' (BOTH)' : ''} mode!`);
    } catch (err: any) {
      triggerToast(`Failed to switch mode: ${err?.response?.data?.detail || err?.message}`);
    } finally {
      setIsSwitchingMode(false);
    }
  };

  // Register domain or update if duplicate exists
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setVerifyMessage(null);

    const cleanDomain = domainName.trim().toLowerCase();
    if (!cleanDomain) {
      setFormError('Please enter a valid domain name.');
      return;
    }

    setIsSubmitting(true);
    try {
      // If already registered locally, perform direct configuration and mode shift
      if (existingDomainMatch) {
        const updated = await updateWafDomain(existingDomainMatch.id, {
          origin_url: originUrl.trim(),
          environment,
          enforcement_mode: enforcementMode,
          target_type: targetType,
        });
        setCreatedDomain(updated);
        onRefresh();
        onSelectDomain(updated.id, updated);
        setFormSuccess(`Domain "${cleanDomain}" configuration & mode updated to ${enforcementMode.toUpperCase()}${enforcementMode === 'hybrid' ? ' (BOTH)' : ''}!`);
        return;
      }

      // Create new domain via backend
      const newDomain = await createWafDomain({
        domain_name: cleanDomain,
        origin_url: originUrl.trim(),
        environment,
        enforcement_mode: enforcementMode,
        target_type: targetType,
      });

      setCreatedDomain(newDomain);
      onRefresh();
      if (onDomainAdded) onDomainAdded(newDomain);
      onSelectDomain(newDomain.id, newDomain);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || '';
      // If backend reports duplicate domain, automatically attempt update fallback
      if (errorMsg.toLowerCase().includes('already registered') || errorMsg.toLowerCase().includes('exists')) {
        const match = domains.find((d) => d.domain_name.toLowerCase() === cleanDomain);
        if (match) {
          try {
            const updated = await updateWafDomain(match.id, {
              origin_url: originUrl.trim(),
              environment,
              enforcement_mode: enforcementMode,
              target_type: targetType,
            });
            setCreatedDomain(updated);
            onRefresh();
            onSelectDomain(updated.id, updated);
            setFormSuccess(`Domain "${cleanDomain}" was already registered. Enforcement mode successfully shifted to ${enforcementMode.toUpperCase()}!`);
            return;
          } catch (updateErr: any) {
            setFormError(`Domain is registered, but update failed: ${updateErr?.message}`);
            return;
          }
        }
      }
      setFormError(errorMsg || 'Failed to register domain with WAF.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct 1-click update for existing domain detected in modal
  const handleUpdateExistingFromModal = async () => {
    if (!existingDomainMatch) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const updated = await updateWafDomain(existingDomainMatch.id, {
        origin_url: originUrl.trim(),
        environment,
        enforcement_mode: enforcementMode,
        target_type: targetType,
      });
      setCreatedDomain(updated);
      onRefresh();
      onSelectDomain(updated.id, updated);
      setFormSuccess(`Domain "${existingDomainMatch.domain_name}" updated to ${enforcementMode.toUpperCase()}${enforcementMode === 'hybrid' ? ' (BOTH)' : ''} mode!`);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err?.message || 'Failed to update existing domain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save changes in Manage Modal
  const handleSaveManageModal = async () => {
    if (!selectedDomain) return;
    setManageSaving(true);
    setManageMessage(null);
    try {
      const updated = await updateWafDomain(selectedDomain.id, {
        origin_url: manageOrigin.trim(),
        environment: manageEnv,
        enforcement_mode: manageMode,
      });
      onRefresh();
      onSelectDomain(updated.id, updated);
      setManageMessage(`Domain settings saved! Mode active: ${manageMode.toUpperCase()}${manageMode === 'hybrid' ? ' (BOTH)' : ''}`);
      setTimeout(() => {
        setIsManageModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setManageMessage(`Error saving settings: ${err?.response?.data?.detail || err?.message}`);
    } finally {
      setManageSaving(false);
    }
  };

  // Delete Domain
  const handleDeleteDomain = async () => {
    if (!selectedDomain) return;
    setIsDeleting(true);
    try {
      await deleteWafDomain(selectedDomain.id);
      onRefresh();
      onSelectDomain('all');
      setIsManageModalOpen(false);
      triggerToast(`Domain "${selectedDomain.domain_name}" successfully removed.`);
    } catch (err: any) {
      setManageMessage(`Failed to delete domain: ${err?.response?.data?.detail || err?.message}`);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleVerify = async () => {
    if (!createdDomain) return;
    setIsVerifying(true);
    setVerifyMessage(null);
    try {
      const isLab = createdDomain.target_type === 'demo_lab';
      const res = await verifyWafDomain(createdDomain.id, isLab);
      if (res.verified) {
        setVerifyMessage('Domain ownership verified! Next: execute an end-to-end traffic test in Policies tab to activate protection.');
        onRefresh();
        onSelectDomain(createdDomain.id, {
          ...createdDomain,
          verification_status: 'verified',
          protection_status: 'OWNERSHIP_VERIFIED',
        });
      } else {
        setVerifyMessage(res.message || 'Verification could not be verified automatically.');
      }
    } catch (err: any) {
      setVerifyMessage(err?.response?.data?.detail || 'Verification request failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCreatedDomain(null);
    setFormError(null);
    setFormSuccess(null);
    setVerifyMessage(null);
    setDomainName('');
    setOriginUrl(targetType === 'production' ? 'https://app.customer.com' : 'http://127.0.0.1:3000');
  };

  const currentSelectedMode = (selectedDomain?.enforcement_mode || 'monitor').toLowerCase();

  return (
    <div className="flex items-center gap-2 relative">
      {/* Dynamic Toast Feedback Pill */}
      {toastMessage && (
        <div className="absolute -bottom-9 left-0 z-50 px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 shadow-xl shadow-cyan-950/40 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading state pill */}
      {loading && domains.length === 0 ? (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-mono text-cyan-300"
          style={{ background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.2)' }}
        >
          <RefreshCw size={12} className="animate-spin text-cyan-400" />
          <span>Syncing fleet...</span>
        </div>
      ) : error && domains.length === 0 ? (
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] text-amber-300"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <AlertTriangle size={12} className="shrink-0 text-amber-400" />
          <span className="truncate max-w-[150px]" title={error}>
            Connecting fleet...
          </span>
          <button
            onClick={onRefresh}
            className="text-[10px] underline hover:text-amber-200 ml-1 cursor-pointer font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-md transition-all"
          style={{
            background: 'rgba(8,14,26,0.85)',
            border: '1px solid rgba(0,200,255,0.25)',
          }}
        >
          <Globe size={13} className="text-cyan-400 shrink-0" />

          {/* Domain Dropdown Select */}
          <select
            value={selectedDomainId}
            onChange={(e) => {
              const nextId = e.target.value;
              const nextDomain = domains.find((d) => d.id === nextId);
              onSelectDomain(nextId, nextDomain);
            }}
            className="bg-transparent text-[11px] font-mono font-medium text-slate-200 outline-none cursor-pointer pr-1"
            style={{ border: 'none' }}
          >
            <option value="all" className="bg-slate-950 text-slate-200">
              All Protected Targets ({domains.length})
            </option>
            {domains.map((dom) => {
              const rawMode = (dom.enforcement_mode || 'monitor').toLowerCase();
              const modeTag = rawMode === 'hybrid' || rawMode === 'both' ? 'BOTH' : rawMode.toUpperCase();
              const targetTag = dom.target_type === 'demo_lab' ? 'LAB' : 'PROD';
              return (
                <option key={dom.id} value={dom.id} className="bg-slate-950 text-slate-200">
                  {dom.domain_name} [{targetTag}] [{modeTag}]
                </option>
              );
            })}
          </select>

          {/* Active Domain Controls: Target Tag, Interactive Mode Shift, Status Badge, Manage */}
          {selectedDomain && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-700/60 shrink-0">
              {/* Target Type Tag */}
              {selectedDomain.target_type === 'demo_lab' ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <FlaskConical size={10} />
                  LAB
                </span>
              ) : (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <Lock size={10} />
                  PROD
                </span>
              )}

              {/* ── Interactive Enforcement Mode Shift Dropdown ── */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  disabled={isSwitchingMode}
                  title="Click to shift enforcement mode (MONITOR / HYBRID / BLOCK)"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-tight border transition-all cursor-pointer select-none ${
                    currentSelectedMode === 'block'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 shadow-sm shadow-rose-500/10'
                      : currentSelectedMode === 'hybrid' || currentSelectedMode === 'both'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 shadow-sm shadow-amber-500/10'
                  }`}
                >
                  {isSwitchingMode ? (
                    <RefreshCw size={10} className="animate-spin text-cyan-400" />
                  ) : currentSelectedMode === 'block' ? (
                    <ShieldAlert size={10} className="text-rose-400" />
                  ) : currentSelectedMode === 'hybrid' || currentSelectedMode === 'both' ? (
                    <Zap size={10} className="text-cyan-400" />
                  ) : (
                    <Radio size={10} className="text-amber-400" />
                  )}
                  <span>
                    {currentSelectedMode === 'hybrid' || currentSelectedMode === 'both'
                      ? 'HYBRID (BOTH)'
                      : currentSelectedMode.toUpperCase()}
                  </span>
                  <ChevronDown size={9} className="opacity-70 ml-0.5" />
                </button>

                {/* Mode Selector Popover */}
                {isModeDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 w-60 rounded-xl bg-[#090f1e] border border-cyan-500/40 shadow-2xl p-1.5 z-50 text-xs space-y-1 animate-in fade-in slide-in-from-top-2"
                    style={{ backdropFilter: 'blur(16px)' }}
                  >
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      Shift Enforcement Mode
                    </div>

                    {/* Mode 1: BLOCK */}
                    <button
                      type="button"
                      onClick={() => handleQuickShiftMode('block')}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2 transition-colors cursor-pointer ${
                        currentSelectedMode === 'block'
                          ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
                          : 'hover:bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      <ShieldAlert size={14} className="text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-[11px] text-white flex items-center justify-between">
                          <span>BLOCK (Active Defense)</span>
                          {currentSelectedMode === 'block' && <Check size={12} className="text-rose-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          Immediately drops malicious threats with HTTP 403.
                        </div>
                      </div>
                    </button>

                    {/* Mode 2: HYBRID (BOTH) */}
                    <button
                      type="button"
                      onClick={() => handleQuickShiftMode('hybrid')}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2 transition-colors cursor-pointer ${
                        currentSelectedMode === 'hybrid' || currentSelectedMode === 'both'
                          ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200'
                          : 'hover:bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      <Zap size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-[11px] text-white flex items-center justify-between">
                          <span>BOTH / HYBRID (Dual Mode)</span>
                          {(currentSelectedMode === 'hybrid' || currentSelectedMode === 'both') && (
                            <Check size={12} className="text-cyan-400" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          Drops critical threats & audits/monitors low/med risk.
                        </div>
                      </div>
                    </button>

                    {/* Mode 3: MONITOR */}
                    <button
                      type="button"
                      onClick={() => handleQuickShiftMode('monitor')}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2 transition-colors cursor-pointer ${
                        currentSelectedMode === 'monitor'
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                          : 'hover:bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      <Radio size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-[11px] text-white flex items-center justify-between">
                          <span>MONITOR (Audit Only)</span>
                          {currentSelectedMode === 'monitor' && <Check size={12} className="text-amber-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          Logs and flags threats without dropping traffic.
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Honest Protection Badge */}
              {(() => {
                const badge = getProtectionStatusBadge(selectedDomain);
                return (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border tracking-tight ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {badge.label}
                  </span>
                );
              })()}

              {/* Settings / Manage Target Button */}
              <button
                type="button"
                onClick={() => setIsManageModalOpen(true)}
                title="Manage Target: edit origin, DNS verification, or delete domain"
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Settings size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Add Website Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer shadow-sm hover:shadow-cyan-500/10"
        title="Register and protect a Production or Demo/Lab website"
      >
        <Plus size={12} className="text-cyan-400" />
        <span>Protect Website</span>
      </button>

      {/* Refresh domains button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        title="Refresh target list"
        className="p-1.5 rounded-md hover:bg-slate-800/60 text-slate-400 hover:text-cyan-400 transition-colors"
      >
        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
      </button>

      {/* ── Modal: Manage / Reconfigure Existing Target ──────────── */}
      {isManageModalOpen && selectedDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-xl border border-cyan-500/30 p-6 shadow-2xl space-y-4 text-slate-200"
            style={{ background: '#0a0f1d' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Manage Target: <span className="text-cyan-300 font-mono">{selectedDomain.domain_name}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update upstream origin, shift enforcement mode, or remove domain.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/60"
              >
                <X size={18} />
              </button>
            </div>

            {manageMessage && (
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-cyan-400" />
                <span>{manageMessage}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Enforcement Mode Selector (3 options: Monitor, Hybrid/Both, Block) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Enforcement Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setManageMode('block')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      manageMode === 'block'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-md shadow-rose-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <ShieldAlert size={12} className="text-rose-400" />
                      <span>BLOCK</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Drops threats (403)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageMode('hybrid')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      manageMode === 'hybrid'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Zap size={12} className="text-cyan-400" />
                      <span>BOTH / HYBRID</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Block high + audit low</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageMode('monitor')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      manageMode === 'monitor'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Radio size={12} className="text-amber-400" />
                      <span>MONITOR</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Audit log only</div>
                  </button>
                </div>
              </div>

              {/* Upstream Origin */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Upstream Origin Address
                </label>
                <input
                  type="text"
                  value={manageOrigin}
                  onChange={(e) => setManageOrigin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none font-mono text-xs text-white"
                />
              </div>

              {/* Environment */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Environment
                </label>
                <select
                  value={manageEnv}
                  onChange={(e: any) => setManageEnv(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development / Lab</option>
                </select>
              </div>

              {/* DNS Verification Info */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Verification Status:</span>
                  <span className="font-bold text-cyan-300 uppercase">{selectedDomain.verification_status}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate select-all">
                  _fanos-waf-challenge.{selectedDomain.domain_name} &rarr; {selectedDomain.verification_token}
                </div>
              </div>

              {/* Danger Zone: Delete Domain */}
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-rose-300">Remove from FANOS WAF</div>
                  <div className="text-[10px] text-slate-400">
                    Delete this domain to unregister or re-create it from scratch.
                  </div>
                </div>
                {confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteDomain}
                      disabled={isDeleting}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-colors"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-[10px] font-semibold transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Delete Domain</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveManageModal}
                disabled={manageSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                {manageSaving && <RefreshCw size={12} className="animate-spin" />}
                <span>Save Target Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Register & Protect Website ───────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl rounded-xl border border-cyan-500/30 p-6 shadow-2xl space-y-4 text-slate-200"
            style={{ background: '#0a0f1d' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    FANOS WAF — Register Protected Website
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deploy reverse-proxy threat mitigation for real production or authorized demo/training targets.
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/60"
              >
                <X size={18} />
              </button>
            </div>

            {/* Smart Duplicate Domain Helper Banner */}
            {existingDomainMatch && !createdDomain && (
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  <span>
                    Domain <span className="font-mono text-white underline">{cleanInputDomain}</span> is already registered in FANOS WAF.
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Current Mode: <strong className="text-amber-300 uppercase">{existingDomainMatch.enforcement_mode}</strong>.
                  You can immediately reconfigure or shift it to <strong className="text-cyan-300 uppercase">{enforcementMode}</strong> without deleting!
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUpdateExistingFromModal}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    <Zap size={12} />
                    <span>Update & Shift to {enforcementMode.toUpperCase()} Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDomain(existingDomainMatch.id, existingDomainMatch);
                      closeModal();
                      setIsManageModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors flex items-center gap-1"
                  >
                    <Settings size={12} />
                    <span>Manage Existing Target</span>
                  </button>
                </div>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {!createdDomain ? (
              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                {/* Target Type Selector: Production vs Demo/Lab */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Target Environment Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetType('production');
                        if (originUrl.includes('127.0.0.1')) setOriginUrl('https://app.customer.com');
                        setEnvironment('production');
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        targetType === 'production'
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <Lock size={13} className="text-cyan-400" />
                        <span>PRODUCTION WEBSITE</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Requires real DNS ownership challenge, strict SSRF controls, and verified reverse-proxy routing.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetType('demo_lab');
                        setOriginUrl('http://127.0.0.1:3000');
                        setEnvironment('development');
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        targetType === 'demo_lab'
                          ? 'bg-purple-500/10 border-purple-500 text-purple-200 shadow-md shadow-purple-500/10'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <FlaskConical size={13} className="text-purple-400" />
                        <span>AUTHORIZED DEMO / LAB</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Controlled local targets (OWASP Juice Shop, WebGoat) with explicit admin lab permission.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Lab Preset Shortcuts if Demo / Lab is active */}
                {targetType === 'demo_lab' && (
                  <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-purple-400" />
                        <span>Quick-Load Lab Presets:</span>
                      </span>
                      {loadingCatalog && <RefreshCw size={11} className="animate-spin text-purple-400" />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {labCatalog.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectLabPreset(preset)}
                          className="px-2.5 py-1 rounded bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-[10px] font-mono transition-all flex items-center gap-1.5"
                        >
                          <span>{preset.icon}</span>
                          <span className="font-semibold">{preset.name}</span>
                          <span className="text-slate-400">({preset.recommended_origin})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domain Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Website FQDN / Hostname
                  </label>
                  <input
                    type="text"
                    placeholder={targetType === 'production' ? 'e.g. secure.customer.com' : 'e.g. juiceshop.demo.local'}
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none font-mono text-xs text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    The public host header client requests will present to the WAF proxy endpoint.
                  </span>
                </div>

                {/* Origin URL */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Upstream Origin Address
                  </label>
                  <input
                    type="text"
                    placeholder={targetType === 'production' ? 'e.g. https://backend-origin.internal or outbound connector' : 'e.g. http://127.0.0.1:3000'}
                    value={originUrl}
                    onChange={(e) => setOriginUrl(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none font-mono text-xs text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {targetType === 'production'
                      ? 'Destination origin server. For private origins, use an authenticated connector or reverse-proxy upstream.'
                      : 'Local application endpoint under test. Permitted exclusively under admin lab mode.'}
                  </span>
                </div>

                {/* Environment and Enforcement Mode Grid (Now with MONITOR, BOTH/HYBRID, BLOCK) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Environment
                    </label>
                    <select
                      value={environment}
                      onChange={(e: any) => setEnvironment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development / Lab</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Enforcement Mode
                    </label>
                    <select
                      value={enforcementMode}
                      onChange={(e: any) => setEnforcementMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="block">BLOCK (Active Defense - Drops Threats)</option>
                      <option value="hybrid">BOTH / HYBRID (Blocks Threats & Audits Low Risk)</option>
                      <option value="monitor">MONITOR (Audit Only - Real-time Log)</option>
                    </select>
                  </div>
                </div>

                {/* Mode Explanation Pill */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <Zap size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    {enforcementMode === 'block' && (
                      <span><strong>BLOCK Mode:</strong> Inline proxy drops verified attacks (SQLi, XSS, RCE, Path Traversal) with HTTP 403 Forbidden.</span>
                    )}
                    {enforcementMode === 'hybrid' && (
                      <span><strong>BOTH / HYBRID Mode:</strong> Automatically drops critical & high-severity threats while auditing and monitoring lower-risk traffic without business disruption.</span>
                    )}
                    {enforcementMode === 'monitor' && (
                      <span><strong>MONITOR Mode:</strong> All traffic is inspected and threats are recorded in the SOC log, but 0 requests are dropped.</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
                    <span>{existingDomainMatch ? 'Update Target Configuration' : 'Register Target with WAF'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Success / Registration Complete View */
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-sm text-emerald-200">Target Configured: Stage 1 / 6 Complete</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      <span className="font-mono font-semibold text-white">{createdDomain.domain_name}</span> is registered with enforcement mode <strong className="text-cyan-300 uppercase">{createdDomain.enforcement_mode}</strong>.
                      Protection will show <strong className="text-emerald-400">PROTECTION ACTIVE</strong> once DNS ownership, TLS, and end-to-end traffic verification have completed.
                    </div>
                  </div>
                </div>

                {/* DNS Ownership Challenge Section */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Stage 2: DNS Ownership Challenge</span>
                    <span className="text-[10px] font-mono text-cyan-400">TXT Record</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Add this TXT verification token to your DNS provider zone to prove domain authority:
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[10px] text-cyan-300 select-all break-all">
                    _fanos-waf-challenge.{createdDomain.domain_name} &rarr; {createdDomain.verification_token}
                  </div>
                </div>

                {/* Reverse Proxy Traffic Path */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-slate-300">
                  <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                    <Server size={13} />
                    <span>Stage 3 & 4: Reverse-Proxy Traffic Flow</span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-400">
                    Point your public domain CNAME or A-record to the FANOS WAF edge proxy. Traffic path:
                    <span className="block font-mono text-[10px] text-cyan-200 mt-1 bg-black/40 p-1.5 rounded">
                      Client &rarr; FANOS WAF (Port 8000 / 8002) &rarr; Inspection Engine &rarr; {createdDomain.origin_url}
                    </span>
                  </div>
                </div>

                {verifyMessage && (
                  <div className="p-2.5 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[11px]">
                    {verifyMessage}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {isVerifying ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={13} />}
                    <span>{createdDomain.target_type === 'demo_lab' ? 'Verify Lab Target' : 'Check DNS Verification'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Done & View Target
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
