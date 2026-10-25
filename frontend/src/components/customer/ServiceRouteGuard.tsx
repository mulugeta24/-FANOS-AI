import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShieldAlert, ShieldCheck, Radio, Bug, Brain, Bell,
  Clock, XCircle, ArrowLeft, ArrowRight, RefreshCw, Lock
} from 'lucide-react'
import { getServiceAuthorizations, type ServiceAuthorizationItem } from '@/lib/api'
import { useWorkspace } from '@/context/WorkspaceContext'

interface ServiceRouteGuardProps {
  serviceId: 'waf' | 'ids' | 'vulnerability-scanner' | 'url-detection' | 'incident-response'
  children: React.ReactNode
}

const SERVICE_META: Record<string, {
  name: string
  shortName: string
  icon: any
  accentColor: string
  requestRoute: string
  description: string
}> = {
  waf: {
    name: 'Web Application Firewall (WAF)',
    shortName: 'WAF',
    icon: ShieldCheck,
    accentColor: '#00e5a0',
    requestRoute: '/customer/services/waf/request',
    description: 'Reverse proxy inspection defending against SQL Injection, XSS, and OWASP Top 10 vulnerabilities.',
  },
  ids: {
    name: 'Network Intrusion Detection System (IDS)',
    shortName: 'IDS',
    icon: Radio,
    accentColor: '#38bdf8',
    requestRoute: '/customer/services/ids/request',
    description: 'Deep packet inspection with Suricata and Zeek monitoring unauthorized access and anomaly flows.',
  },
  'vulnerability-scanner': {
    name: 'Web Vulnerability Scanner',
    shortName: 'Scanner',
    icon: Bug,
    accentColor: '#00c8ff',
    requestRoute: '/customer/services/vulnerability-scanner/request',
    description: 'Automated DAST vulnerability assessment and crawler for OWASP Top 10 security findings.',
  },
  'url-detection': {
    name: 'Malicious URL Detection',
    shortName: 'URL Detection',
    icon: Brain,
    accentColor: '#a855f7',
    requestRoute: '/customer/services/url-detection/request',
    description: 'AI-powered 99.8% XGBoost machine learning classifier detecting phishing and malware URLs.',
  },
  'incident-response': {
    name: 'Security Incident Response',
    shortName: 'Incident Response',
    icon: Bell,
    accentColor: '#f59e0b',
    requestRoute: '/customer/services/incident-response/request',
    description: 'Automated containment, rapid mitigation playbooks, and 24/7 SOC analyst triage.',
  },
}

export default function ServiceRouteGuard({ serviceId, children }: ServiceRouteGuardProps) {
  const navigate = useNavigate()
  const { hasService, activeCustomer } = useWorkspace()
  const [loading, setLoading] = useState(true)
  const [authItem, setAuthItem] = useState<ServiceAuthorizationItem | null>(null)
  const meta = SERVICE_META[serviceId]
  const Icon = meta?.icon || ShieldAlert

  const checkAuth = async () => {
    try {
      setLoading(true)
      // Check if approved in workspace context
      if (hasService(serviceId)) {
        setAuthItem({
          service_id: serviceId,
          service_name: meta?.name || serviceId,
          status: 'APPROVED',
        })
        setLoading(false)
        return
      }

      const res = await getServiceAuthorizations()
      const item = res.authorizations[serviceId]
      if (item) {
        setAuthItem(item)
      } else {
        setAuthItem({
          service_id: serviceId,
          service_name: meta?.name || serviceId,
          status: 'NOT_REQUESTED',
        })
      }
    } catch {
      // Fallback
      if (hasService(serviceId)) {
        setAuthItem({
          service_id: serviceId,
          service_name: meta?.name || serviceId,
          status: 'APPROVED',
        })
      } else {
        setAuthItem({
          service_id: serviceId,
          service_name: meta?.name || serviceId,
          status: 'NOT_REQUESTED',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [serviceId, activeCustomer.id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/[0.1] flex items-center justify-center">
          <RefreshCw size={22} className="animate-spin text-cyan-400" />
        </div>
        <div className="text-xs font-mono">Verifying customer service authorization...</div>
      </div>
    )
  }

  // If approved, render the dedicated portal
  if (authItem?.status === 'APPROVED' || hasService(serviceId)) {
    return <>{children}</>
  }

  const isPending = authItem?.status === 'PENDING'
  const isRejected = authItem?.status === 'REJECTED'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-100 animate-fade-in my-8">
      {/* Top back navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <Link
          to="/customer/dashboard"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Central Dashboard</span>
        </Link>
        <span className="text-[11px] font-mono text-slate-500 uppercase">
          FANOS AI Authorization Gate
        </span>
      </div>

      {/* Access Restricted Card */}
      <div className="bg-[#0b1526]/90 border border-white/[0.08] rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 opacity-15 rounded-full blur-3xl pointer-events-none"
          style={{ background: meta?.accentColor || '#00e5a0' }}
        />

        <div className="max-w-lg mx-auto space-y-6 relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl"
            style={{
              background: `${meta?.accentColor || '#00e5a0'}18`,
              color: meta?.accentColor || '#00e5a0',
              border: `1px solid ${meta?.accentColor || '#00e5a0'}40`,
            }}
          >
            <Icon size={30} />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 border"
              style={{
                background: isPending
                  ? 'rgba(245, 158, 11, 0.15)'
                  : isRejected
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(100, 116, 139, 0.15)',
                color: isPending ? '#fbbf24' : isRejected ? '#f87171' : '#94a3b8',
                borderColor: isPending
                  ? 'rgba(245, 158, 11, 0.3)'
                  : isRejected
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(100, 116, 139, 0.3)',
              }}
            >
              {isPending ? (
                <>
                  <Clock size={12} />
                  <span>Pending Administrator Review</span>
                </>
              ) : isRejected ? (
                <>
                  <XCircle size={12} />
                  <span>Service Request Rejected</span>
                </>
              ) : (
                <>
                  <Lock size={12} />
                  <span>Authorization Required</span>
                </>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {meta?.name || serviceId}
            </h1>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {isPending
                ? `Your request for ${meta?.shortName} deployment is currently under review by our SOC team. Once approved, your live telemetry and control panel will be activated automatically.`
                : isRejected
                ? `Your previous request for ${meta?.shortName} was reviewed and rejected. Please review administrator notes and submit an updated asset specification.`
                : `You do not currently have an active authorization for the ${meta?.name} service. Register your enterprise target asset and submit a service request to activate this dedicated portal.`}
            </p>
          </div>

          {/* Details Box */}
          <div className="bg-slate-950/80 border border-white/[0.08] rounded-2xl p-4 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between py-1 border-b border-white/[0.05]">
              <span className="text-slate-400 font-sans">Service:</span>
              <span className="text-white font-bold">{meta?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.05]">
              <span className="text-slate-400 font-sans">Current Status:</span>
              <span className="font-bold" style={{ color: isPending ? '#fbbf24' : isRejected ? '#f87171' : '#94a3b8' }}>
                {authItem?.status || 'NOT_REQUESTED'}
              </span>
            </div>
            {authItem?.request_number && (
              <div className="flex justify-between py-1 border-b border-white/[0.05]">
                <span className="text-slate-400 font-sans">Request ID:</span>
                <span className="text-cyan-400">{authItem.request_number}</span>
              </div>
            )}
            {authItem?.admin_notes && (
              <div className="py-1">
                <span className="text-slate-400 font-sans block mb-1">Admin Notes:</span>
                <span className="text-rose-300 italic">{authItem.admin_notes}</span>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <button
              onClick={() => navigate(meta?.requestRoute || '/customer/dashboard')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-slate-950 transition shadow-lg cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${meta?.accentColor || '#00e5a0'}, #00c8ff)`,
              }}
            >
              <span>{isPending ? 'View Request Status' : isRejected ? 'Submit Updated Request' : `Request ${meta?.shortName}`}</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => navigate('/customer/dashboard')}
              className="px-5 py-3 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
            >
              Return to Customer Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
