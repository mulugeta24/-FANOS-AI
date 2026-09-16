import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  MessageSquare, Users, Send, History, BarChart3,
  CheckCircle2, XCircle, Clock, AlertCircle, Plus,
  Trash2, Search, RefreshCw, Phone, User, ChevronRight,
  Loader2, TrendingUp, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API = 'http://localhost:8000/api/v1/sms'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  total_customers: number
  messages_sent: number
  messages_delivered: number
  messages_failed: number
  today_messages: number
}

interface Customer {
  id: string
  name: string
  phone: string
  status: string
  created_at: string
}

interface SmsMessage {
  id: string
  recipient_phone: string
  sender_id: string
  body: string
  status: string
  provider_ref: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function smsPartCount(text: string) {
  const len = text.length
  if (len === 0) return { chars: 0, parts: 1, remaining: 160 }
  if (len <= 160) return { chars: len, parts: 1, remaining: 160 - len }
  const parts = Math.ceil(len / 153)
  return { chars: len, parts, remaining: parts * 153 - len }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Status chips ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    sent:      { cls: 'text-fanos-accent  bg-fanos-accent/10  border-fanos-accent/25',  icon: <Clock size={9} />,        label: 'Sent' },
    delivered: { cls: 'text-fanos-green   bg-fanos-green/10   border-fanos-green/25',   icon: <CheckCircle2 size={9} />, label: 'Delivered' },
    failed:    { cls: 'text-fanos-red     bg-fanos-red/10     border-fanos-red/25',     icon: <XCircle size={9} />,     label: 'Failed' },
    pending:   { cls: 'text-yellow-400   bg-yellow-400/10   border-yellow-400/25',   icon: <Loader2 size={9} className="animate-spin" />, label: 'Pending' },
    active:    { cls: 'text-fanos-green   bg-fanos-green/10   border-fanos-green/25',   icon: <CheckCircle2 size={9} />, label: 'Active' },
    inactive:  { cls: 'text-fanos-muted   bg-white/5          border-white/10',          icon: <AlertCircle size={9} />, label: 'Inactive' },
  }
  const cfg = map[status] ?? map.pending
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border',
      cfg.cls
    )}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps { label: string; value: number; icon: React.ReactNode; color: string; sub?: string }

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let frame: number
    let start: number | null = null
    const duration = 800
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <div className="fanos-card p-4 gap-0 hover:border-white/10 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          {icon}
        </div>
        <TrendingUp size={11} className="text-fanos-dim opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-[22px] font-bold text-fanos-text tabular-nums leading-none mb-1">
        {display.toLocaleString()}
      </div>
      <div className="text-[10px] text-fanos-muted uppercase tracking-wide">{label}</div>
      {sub && <div className="text-[9px] text-fanos-dim mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Tab Button ────────────────────────────────────────────────────────────────

function Tab({ label, icon, active, onClick, badge }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void; badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 whitespace-nowrap',
        active
          ? 'border-fanos-accent text-fanos-accent'
          : 'border-transparent text-fanos-muted hover:text-fanos-text hover:border-fanos-accent/30'
      )}
    >
      {icon} {label}
      {badge !== undefined && badge > 0 && (
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-fanos-accent/20 text-fanos-accent">
          {badge}
        </span>
      )}
    </button>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function SmsDashboard() {
  const [tab, setTab] = useState<'dashboard' | 'send' | 'customers' | 'history'>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // send form
  const [recipient, setRecipient] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [sending, setSending] = useState(false)
  const SENDER_ID = 'FANOS AI'

  // customer form
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')

  // history filter
  const [historyStatus, setHistoryStatus] = useState('')

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, c, m] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/messages`),
      ])
      setStats(s.data)
      setCustomers(c.data.customers)
      setMessages(m.data.messages)
    } catch {
      // backend may not be up — use demo fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Refetch stats after sending
  const refreshStats = async () => {
    try {
      const [s, m] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/messages`),
      ])
      setStats(s.data)
      setMessages(m.data.messages)
    } catch {}
  }

  // ── Send SMS ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!recipient.trim() || !msgBody.trim()) {
      showToast('Recipient and message are required.', 'error')
      return
    }
    setSending(true)
    try {
      const res = await axios.post(`${API}/send`, {
        recipient_phone: recipient.trim(),
        sender_id: SENDER_ID,
        body: msgBody.trim(),
      })
      const s = res.data.status
      showToast(
        s === 'delivered' ? '✓ Message delivered!'
        : s === 'sent'    ? '✓ Message sent!'
        :                   '✗ Message failed (demo simulation)',
        s === 'failed' ? 'error' : 'success'
      )
      setRecipient('')
      setMsgBody('')
      await refreshStats()
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Failed to send message.'
      showToast(`✗ ${detail}`, 'error')
    } finally {
      setSending(false)
    }
  }

  // ── Add Customer ──────────────────────────────────────────────────────────
  const handleAddCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      showToast('Name and phone are required.', 'error')
      return
    }
    setAddingCustomer(true)
    try {
      const res = await axios.post(`${API}/customers`, {
        name: newName.trim(),
        phone: newPhone.trim(),
      })
      setCustomers(prev => [...prev, res.data])
      setNewName('')
      setNewPhone('')
      setShowAddForm(false)
      showToast('✓ Customer added.', 'success')
      await refreshStats()
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Failed to add customer.'
      showToast(`✗ ${detail}`, 'error')
    } finally {
      setAddingCustomer(false)
    }
  }

  // ── Delete Customer ───────────────────────────────────────────────────────
  const handleDeleteCustomer = async (id: string) => {
    try {
      await axios.delete(`${API}/customers/${id}`)
      setCustomers(prev => prev.filter(c => c.id !== id))
      showToast('Customer removed.', 'success')
      await refreshStats()
    } catch {
      showToast('Failed to remove customer.', 'error')
    }
  }

  const { chars, parts, remaining } = smsPartCount(msgBody)
  const filteredCustomers = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )
  const filteredMessages = messages.filter(m => !historyStatus || m.status === historyStatus)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Toast ── */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg text-[12px] font-semibold',
          'shadow-xl border backdrop-blur-md transition-all duration-300',
          toast.type === 'success'
            ? 'bg-fanos-green/20 border-fanos-green/40 text-fanos-green'
            : 'bg-fanos-red/20  border-fanos-red/40  text-fanos-red'
        )}>
          {toast.msg}
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(0,200,255,0.15),rgba(0,200,255,0.05))', border: '1px solid rgba(0,200,255,0.25)' }}>
            <MessageSquare size={17} className="text-fanos-accent" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-fanos-text">SMS Center</h1>
            <p className="text-[10px] text-fanos-muted">Admin-only · {SENDER_ID}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded"
            style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)' }}>
            <ShieldCheck size={10} className="text-fanos-green" />
            <span className="text-[9px] font-semibold text-fanos-green tracking-wide">DEMO MODE</span>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="fanos-btn"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-white/[0.06] px-4 flex-shrink-0 overflow-x-auto">
        <Tab label="Dashboard" icon={<BarChart3 size={11} />} active={tab === 'dashboard'} onClick={() => setTab('dashboard')} />
        <Tab label="Send Message" icon={<Send size={11} />} active={tab === 'send'} onClick={() => setTab('send')} />
        <Tab label="Customers" icon={<Users size={11} />} active={tab === 'customers'} onClick={() => setTab('customers')} badge={customers.length} />
        <Tab label="History" icon={<History size={11} />} active={tab === 'history'} onClick={() => setTab('history')} badge={messages.length} />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ════════════════════════════ DASHBOARD ════════════════════════════ */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard
                label="Total Customers"
                value={stats?.total_customers ?? 0}
                icon={<Users size={16} className="text-fanos-accent" />}
                color="bg-fanos-accent/10"
                sub="Registered recipients"
              />
              <StatCard
                label="Messages Sent"
                value={stats?.messages_sent ?? 0}
                icon={<Send size={16} className="text-blue-400" />}
                color="bg-blue-400/10"
                sub="Sent or delivered"
              />
              <StatCard
                label="Delivered"
                value={stats?.messages_delivered ?? 0}
                icon={<CheckCircle2 size={16} className="text-fanos-green" />}
                color="bg-fanos-green/10"
                sub="Confirmed delivery"
              />
              <StatCard
                label="Failed"
                value={stats?.messages_failed ?? 0}
                icon={<XCircle size={16} className="text-fanos-red" />}
                color="bg-fanos-red/10"
                sub="Delivery failures"
              />
              <StatCard
                label="Today"
                value={stats?.today_messages ?? 0}
                icon={<Clock size={16} className="text-yellow-400" />}
                color="bg-yellow-400/10"
                sub="Messages today"
              />
            </div>

            {/* Recent activity preview */}
            <div className="fanos-card">
              <div className="fanos-panel-header">
                <span className="fanos-panel-title"><History size={11} /> Recent Messages</span>
                <button onClick={() => setTab('history')} className="text-[9px] text-fanos-accent flex items-center gap-0.5 hover:opacity-80">
                  View all <ChevronRight size={9} />
                </button>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {messages.slice(0, 6).map(m => (
                  <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-fanos-accent/10 flex-shrink-0">
                      <Phone size={13} className="text-fanos-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-fanos-text">{m.recipient_phone}</div>
                      <div className="text-[10px] text-fanos-muted truncate">{m.body}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusChip status={m.status} />
                      <span className="text-[9px] text-fanos-dim">{timeAgo(m.created_at)}</span>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="px-4 py-8 text-center text-[11px] text-fanos-dim">No messages yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════ SEND MESSAGE ════════════════════════════ */}
        {tab === 'send' && (
          <div className="max-w-lg mx-auto">
            <div className="fanos-card overflow-visible">
              <div className="fanos-panel-header">
                <span className="fanos-panel-title"><Send size={11} /> Compose Message</span>
              </div>
              <div className="p-5 space-y-5">
                {/* Recipient */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-fanos-muted uppercase tracking-wide flex items-center gap-1.5">
                    <Phone size={10} /> Recipient
                  </label>
                  <input
                    id="sms-recipient"
                    type="tel"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    placeholder="+2519XXXXXXXX"
                    className={cn(
                      'w-full px-3 py-2.5 rounded-lg text-[12px] font-mono',
                      'bg-fanos-bg border border-white/[0.08] text-fanos-text',
                      'placeholder:text-fanos-dim focus:outline-none focus:border-fanos-accent/50 transition-colors'
                    )}
                  />
                  <p className="text-[9px] text-fanos-dim">E.164 format required (e.g. +251911234567)</p>
                </div>

                {/* Sender (read-only) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-fanos-muted uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck size={10} /> Sender ID
                  </label>
                  <div className={cn(
                    'w-full px-3 py-2.5 rounded-lg text-[12px] font-mono',
                    'bg-fanos-bg/50 border border-fanos-green/20 text-fanos-green',
                    'flex items-center justify-between'
                  )}>
                    <span>{SENDER_ID}</span>
                    <span className="text-[9px] text-fanos-dim bg-fanos-green/10 px-2 py-0.5 rounded border border-fanos-green/15">Authorized</span>
                  </div>
                  <p className="text-[9px] text-fanos-dim flex items-center gap-1">
                    <ShieldCheck size={8} className="text-fanos-green" />
                    Sender ID is fixed to the authorized value. Change it in SMS Settings.
                  </p>
                </div>

                {/* Message body */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-fanos-muted uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare size={10} /> Message
                  </label>
                  <textarea
                    id="sms-body"
                    value={msgBody}
                    onChange={e => setMsgBody(e.target.value)}
                    rows={5}
                    placeholder="Type your message here..."
                    className={cn(
                      'w-full px-3 py-2.5 rounded-lg text-[12px] resize-none',
                      'bg-fanos-bg border border-white/[0.08] text-fanos-text',
                      'placeholder:text-fanos-dim focus:outline-none focus:border-fanos-accent/50 transition-colors'
                    )}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-fanos-dim">
                      {chars} characters · {parts} SMS part{parts !== 1 ? 's' : ''}
                    </span>
                    <span className={cn(
                      'text-[9px] font-semibold',
                      remaining < 20 ? 'text-fanos-red' : remaining < 50 ? 'text-yellow-400' : 'text-fanos-dim'
                    )}>
                      {remaining} remaining
                    </span>
                  </div>
                  {/* Character bar */}
                  <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-200',
                        remaining < 20 ? 'bg-fanos-red' : remaining < 50 ? 'bg-yellow-400' : 'bg-fanos-accent'
                      )}
                      style={{ width: `${Math.min((chars / (parts * 153)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Send button */}
                <button
                  id="sms-send-btn"
                  onClick={handleSend}
                  disabled={sending || !recipient.trim() || !msgBody.trim()}
                  className={cn(
                    'w-full py-3 rounded-lg text-[12px] font-bold uppercase tracking-wider',
                    'flex items-center justify-center gap-2 transition-all duration-200',
                    sending || !recipient.trim() || !msgBody.trim()
                      ? 'bg-white/5 text-fanos-dim cursor-not-allowed border border-white/[0.06]'
                      : 'text-fanos-bg cursor-pointer hover:opacity-90 active:scale-[0.98]'
                  )}
                  style={
                    !sending && recipient.trim() && msgBody.trim()
                      ? { background: 'linear-gradient(135deg,#00c8ff,#00e5a0)', boxShadow: '0 4px 20px rgba(0,200,255,0.3)' }
                      : {}
                  }
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>

            {/* Quick-fill from customers */}
            {customers.filter(c => c.status === 'active').length > 0 && (
              <div className="fanos-card mt-4">
                <div className="fanos-panel-header">
                  <span className="fanos-panel-title"><Users size={11} /> Quick Fill — Active Customers</span>
                </div>
                <div className="divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
                  {customers.filter(c => c.status === 'active').map(c => (
                    <button
                      key={c.id}
                      onClick={() => setRecipient(c.phone)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-fanos-accent/5 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-fanos-accent/10 flex items-center justify-center flex-shrink-0">
                        <User size={10} className="text-fanos-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-fanos-text">{c.name}</div>
                        <div className="text-[9px] font-mono text-fanos-muted">{c.phone}</div>
                      </div>
                      <ChevronRight size={10} className="text-fanos-dim" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════ CUSTOMERS ════════════════════════════ */}
        {tab === 'customers' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-fanos-dim" />
                <input
                  id="customer-search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or phone..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-[11px] bg-fanos-card border border-white/[0.08] text-fanos-text placeholder:text-fanos-dim focus:outline-none focus:border-fanos-accent/40"
                />
              </div>
              <button
                id="add-customer-btn"
                onClick={() => setShowAddForm(v => !v)}
                className="fanos-btn"
              >
                <Plus size={10} /> Add Customer
              </button>
            </div>

            {/* Add form */}
            {showAddForm && (
              <div className="fanos-card p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-fanos-muted uppercase tracking-wide">Name</label>
                    <input
                      id="customer-name"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Abebe Girma"
                      className="w-full px-3 py-2 rounded-lg text-[11px] bg-fanos-bg border border-white/[0.08] text-fanos-text placeholder:text-fanos-dim focus:outline-none focus:border-fanos-accent/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-fanos-muted uppercase tracking-wide">Phone (E.164)</label>
                    <input
                      id="customer-phone"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      placeholder="+251911234567"
                      className="w-full px-3 py-2 rounded-lg text-[11px] font-mono bg-fanos-bg border border-white/[0.08] text-fanos-text placeholder:text-fanos-dim focus:outline-none focus:border-fanos-accent/40"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustomer}
                    disabled={addingCustomer}
                    className="fanos-btn flex items-center gap-1"
                  >
                    {addingCustomer ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />}
                    Save
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="text-[10px] text-fanos-muted hover:text-fanos-text px-3 py-1.5">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Customer list */}
            <div className="fanos-card">
              <div className="fanos-panel-header">
                <span className="fanos-panel-title"><Users size={11} /> Customers ({filteredCustomers.length})</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {filteredCustomers.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3 group hover:bg-white/[0.02] transition-colors">
                    <div className="w-9 h-9 rounded-full bg-fanos-accent/10 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-fanos-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-fanos-text">{c.name}</div>
                      <div className="text-[10px] font-mono text-fanos-muted">{c.phone}</div>
                    </div>
                    <StatusChip status={c.status} />
                    <button
                      onClick={() => handleDeleteCustomer(c.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-fanos-red/10 text-fanos-dim hover:text-fanos-red"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="px-4 py-10 text-center text-[11px] text-fanos-dim">
                    {search ? 'No customers match your search.' : 'No customers yet. Add one above.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════ HISTORY ════════════════════════════ */}
        {tab === 'history' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex items-center gap-2">
              {(['', 'sent', 'delivered', 'failed', 'pending'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setHistoryStatus(s)}
                  className={cn(
                    'px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-wide border transition-all',
                    historyStatus === s
                      ? 'bg-fanos-accent/15 text-fanos-accent border-fanos-accent/30'
                      : 'text-fanos-muted border-white/[0.08] hover:border-fanos-accent/20 hover:text-fanos-text'
                  )}
                >
                  {s || 'All'}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-fanos-dim">{filteredMessages.length} messages</span>
            </div>

            {/* Table */}
            <div className="fanos-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest text-fanos-dim">Recipient</th>
                    <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest text-fanos-dim">Message</th>
                    <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest text-fanos-dim">Status</th>
                    <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest text-fanos-dim">Provider Ref</th>
                    <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest text-fanos-dim">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredMessages.map(m => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone size={11} className="text-fanos-dim flex-shrink-0" />
                          <span className="font-mono text-[11px] text-fanos-text">{m.recipient_phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="text-[11px] text-fanos-muted truncate block">{m.body}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={m.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[9px] text-fanos-dim">{m.provider_ref ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-fanos-dim">{timeAgo(m.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                  {filteredMessages.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[11px] text-fanos-dim">
                        No messages found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
