import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Settings2, ShieldCheck, Globe, Key, ToggleLeft, ToggleRight,
  Save, Loader2, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API = 'http://localhost:8000/api/v1/sms'

interface SmsSettingsData {
  provider: 'demo' | 'africastalking' | 'twilio'
  sender_id: string
  demo_mode: boolean
  api_key_configured: boolean
}

const PROVIDER_OPTIONS = [
  {
    id: 'demo',
    label: 'Demo / Mock',
    desc: 'No real SMS sent. Simulates delivery for UI testing.',
    icon: '🧪',
    color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/8',
  },
  {
    id: 'africastalking',
    label: "Africa's Talking",
    desc: 'Recommended for Ethiopian (+251) numbers. Easy API key setup.',
    icon: '🌍',
    color: 'text-fanos-green border-fanos-green/30 bg-fanos-green/8',
  },
  {
    id: 'twilio',
    label: 'Twilio',
    desc: 'Global SMS coverage. Requires Account SID + Auth Token.',
    icon: '🌐',
    color: 'text-blue-400 border-blue-400/30 bg-blue-400/8',
  },
]

export default function SmsSettings() {
  const [settings, setSettings] = useState<SmsSettingsData | null>(null)
  const [form, setForm] = useState({
    provider: 'demo' as 'demo' | 'africastalking' | 'twilio',
    sender_id: 'FANOS AI',
    demo_mode: true,
    api_key: '',
    api_secret: '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [dirty, setDirty] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    axios.get(`${API}/settings`)
      .then(res => {
        setSettings(res.data)
        setForm(prev => ({
          ...prev,
          provider: res.data.provider,
          sender_id: res.data.sender_id,
          demo_mode: res.data.demo_mode,
        }))
      })
      .catch(() => {})
  }, [])

  const update = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {
        provider: form.provider,
        sender_id: form.sender_id.trim(),
        demo_mode: form.demo_mode,
      }
      if (form.api_key.trim()) payload.api_key = form.api_key.trim()
      if (form.api_secret.trim()) payload.api_secret = form.api_secret.trim()

      const res = await axios.put(`${API}/settings`, payload)
      setSettings(res.data)
      setDirty(false)
      setForm(prev => ({ ...prev, api_key: '', api_secret: '' }))
      showToast('✓ Settings saved successfully.', 'success')
    } catch (e: any) {
      showToast(`✗ ${e?.response?.data?.detail || 'Failed to save settings.'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg text-[12px] font-semibold',
          'shadow-xl border backdrop-blur-md',
          toast.type === 'success'
            ? 'bg-fanos-green/20 border-fanos-green/40 text-fanos-green'
            : 'bg-fanos-red/20  border-fanos-red/40  text-fanos-red'
        )}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(0,200,255,0.15),rgba(0,200,255,0.05))', border: '1px solid rgba(0,200,255,0.25)' }}>
            <Settings2 size={17} className="text-fanos-accent" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-fanos-text">SMS Settings</h1>
            <p className="text-[10px] text-fanos-muted">Provider configuration · Admin only</p>
          </div>
        </div>
        <button
          id="sms-settings-save"
          onClick={handleSave}
          disabled={saving || !dirty}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all',
            saving || !dirty
              ? 'bg-white/5 text-fanos-dim border border-white/[0.06] cursor-not-allowed'
              : 'cursor-pointer hover:opacity-90 text-fanos-bg'
          )}
          style={!saving && dirty ? { background: 'linear-gradient(135deg,#00c8ff,#00e5a0)', boxShadow: '0 4px 16px rgba(0,200,255,0.25)' } : {}}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save Changes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">

        {/* Security notice */}
        <div className="rounded-lg p-4 flex gap-3"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.18)' }}>
          <ShieldCheck size={16} className="text-fanos-green flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-semibold text-fanos-green mb-1">Sender ID Security</div>
            <div className="text-[10px] text-fanos-muted leading-relaxed">
              The configured Sender ID is validated by your SMS provider and the mobile network before any message is dispatched.
              Arbitrary spoofing of sender identities is <strong className="text-fanos-text">blocked at the API level</strong> — only the ID registered here will be accepted.
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {['Configured Sender ID', 'Provider validates it', 'Network accepts/rejects'].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-fanos-muted">
                  <span className="w-4 h-4 rounded-full bg-fanos-green/15 text-fanos-green text-[8px] flex items-center justify-center font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  {step}
                  {i < 2 && <span className="text-fanos-dim ml-auto">↓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Provider selection */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <span className="fanos-panel-title"><Globe size={11} /> SMS Provider</span>
          </div>
          <div className="p-4 grid gap-3">
            {PROVIDER_OPTIONS.map(p => (
              <label
                key={p.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  form.provider === p.id
                    ? 'border-fanos-accent/40 bg-fanos-accent/5'
                    : 'border-white/[0.08] hover:border-white/15'
                )}
              >
                <input
                  type="radio"
                  name="provider"
                  value={p.id}
                  checked={form.provider === p.id}
                  onChange={() => {
                    update('provider', p.id)
                    if (p.id === 'demo') update('demo_mode', true)
                  }}
                  className="mt-0.5 accent-fanos-accent"
                />
                <span className="text-base leading-none mt-0.5">{p.icon}</span>
                <div className="flex-1">
                  <div className={cn('text-[12px] font-semibold', form.provider === p.id ? 'text-fanos-text' : 'text-fanos-muted')}>
                    {p.label}
                  </div>
                  <div className="text-[10px] text-fanos-dim mt-0.5">{p.desc}</div>
                </div>
                {form.provider === p.id && <CheckCircle2 size={13} className="text-fanos-accent flex-shrink-0 mt-0.5" />}
              </label>
            ))}
          </div>
        </div>

        {/* Sender ID */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <span className="fanos-panel-title"><ShieldCheck size={11} /> Sender ID</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-fanos-muted uppercase tracking-wide">Sender ID</label>
              <input
                id="sender-id-input"
                value={form.sender_id}
                onChange={e => update('sender_id', e.target.value)}
                maxLength={11}
                placeholder="FANOS AI"
                className="w-full px-3 py-2.5 rounded-lg text-[12px] bg-fanos-bg border border-white/[0.08] text-fanos-text placeholder:text-fanos-dim focus:outline-none focus:border-fanos-accent/50 transition-colors"
              />
              <div className="flex items-start gap-1.5 text-[9px] text-fanos-dim">
                <Info size={9} className="flex-shrink-0 mt-0.5" />
                Max 11 characters. Must be registered with your SMS provider before it can be used on the network.
                FANOS AI is a pre-authorized ID for demo mode.
              </div>
            </div>
          </div>
        </div>

        {/* API Credentials (shown only for real providers) */}
        {form.provider !== 'demo' && (
          <div className="fanos-card">
            <div className="fanos-panel-header">
              <span className="fanos-panel-title"><Key size={11} /> API Configuration</span>
              {settings?.api_key_configured && (
                <span className="text-[9px] text-fanos-green flex items-center gap-1">
                  <CheckCircle2 size={9} /> Key configured
                </span>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-fanos-muted uppercase tracking-wide">
                  {form.provider === 'africastalking' ? 'API Key' : 'Account SID'}
                </label>
                <input
                  id="sms-api-key"
                  type="password"
                  value={form.api_key}
                  onChange={e => update('api_key', e.target.value)}
                  placeholder={settings?.api_key_configured ? '••••••••••••••••••••' : 'Enter API key...'}
                  className="w-full px-3 py-2.5 rounded-lg text-[12px] bg-fanos-bg border border-white/[0.08] text-fanos-text placeholder:text-fanos-dim focus:outline-none focus:border-fanos-accent/50 font-mono"
                />
              </div>
              {form.provider === 'twilio' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-fanos-muted uppercase tracking-wide">Auth Token</label>
                  <input
                    id="sms-api-secret"
                    type="password"
                    value={form.api_secret}
                    onChange={e => update('api_secret', e.target.value)}
                    placeholder="Enter Auth Token..."
                    className="w-full px-3 py-2.5 rounded-lg text-[12px] bg-fanos-bg border border-white/[0.08] text-fanos-text placeholder:text-fanos-dim focus:outline-none focus:border-fanos-accent/50 font-mono"
                  />
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[9px] text-fanos-dim">
                <AlertTriangle size={9} className="text-yellow-400" />
                API credentials are stored server-side and never exposed in the UI.
              </div>
            </div>
          </div>
        )}

        {/* Demo Mode toggle */}
        <div className="fanos-card">
          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold text-fanos-text mb-0.5">Demo Mode</div>
              <div className="text-[10px] text-fanos-dim">
                When enabled, no real SMS is sent. Responses are simulated.
              </div>
            </div>
            <button
              id="demo-mode-toggle"
              onClick={() => update('demo_mode', !form.demo_mode)}
              className="flex-shrink-0"
            >
              {form.demo_mode
                ? <ToggleRight size={28} className="text-fanos-accent" />
                : <ToggleLeft size={28} className="text-fanos-muted" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
