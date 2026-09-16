import { useState } from 'react'
import {
  Globe, Search, ExternalLink, Shield, AlertTriangle,
  CheckCircle, XCircle, Clock, Database, TrendingUp,
} from 'lucide-react'

/* ── types ────────────────────────────────────────────── */
interface TIEntry {
  indicator: string
  type: 'IP' | 'DOMAIN' | 'URL' | 'HASH' | 'FILE'
  reputation: 'MALICIOUS' | 'SUSPICIOUS' | 'CLEAN' | 'UNKNOWN'
  confidence: number
  category: string
  country?: string
  firstSeen: string
  sources: string[]
  associated?: string
}

/* ── mock threat intelligence entries ─────────────────── */
const TI_DATA: TIEntry[] = [
  {
    indicator:  '185.220.101.47',
    type:       'IP',
    reputation: 'MALICIOUS',
    confidence: 99,
    category:   'Ransomware C2 / Tor Exit Node',
    country:    'DE',
    firstSeen:  '2026-01-14',
    sources:    ['AbuseIPDB', 'FANOS TI', 'Shodan', 'OTX'],
    associated: 'INC-2026-004821',
  },
  {
    indicator:  'c2.darknet-pay.ru',
    type:       'DOMAIN',
    reputation: 'MALICIOUS',
    confidence: 95,
    category:   'Command & Control',
    firstSeen:  '2026-03-02',
    sources:    ['OTX', 'URLhaus', 'VirusTotal'],
    associated: 'INC-2026-004821',
  },
  {
    indicator:  '102.213.85.44',
    type:       'IP',
    reputation: 'MALICIOUS',
    confidence: 88,
    category:   'SQL Injection Attack Source',
    country:    'NG',
    firstSeen:  '2026-07-11',
    sources:    ['AbuseIPDB', 'FANOS TI'],
  },
  {
    indicator:  '41.190.3.211',
    type:       'IP',
    reputation: 'SUSPICIOUS',
    confidence: 72,
    category:   'Brute Force / Credential Stuffing',
    country:    'ZA',
    firstSeen:  '2026-08-29',
    sources:    ['FANOS TI', 'Spamhaus'],
  },
  {
    indicator:  'a3f1b2c9d7e4fa01b2c3d4e5f6789abc',
    type:       'HASH',
    reputation: 'MALICIOUS',
    confidence: 97,
    category:   'LockBit 3.0 Ransomware Payload',
    firstSeen:  '2026-09-01',
    sources:    ['VirusTotal (62/72)', 'MalwareBazaar', 'FANOS TI'],
    associated: 'INC-2026-004821',
  },
]

const REP_STYLE: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  MALICIOUS:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: XCircle },
  SUSPICIOUS: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', icon: AlertTriangle },
  CLEAN:      { color: '#00e5a0', bg: 'rgba(0,229,160,0.1)',   border: 'rgba(0,229,160,0.25)', icon: CheckCircle },
  UNKNOWN:    { color: '#8fa3bf', bg: 'rgba(143,163,191,0.1)', border: 'rgba(143,163,191,0.2)', icon: Shield },
}

const TYPE_COLOR: Record<string, string> = {
  IP:     '#00c8ff',
  DOMAIN: '#8b5cf6',
  URL:    '#f97316',
  HASH:   '#f59e0b',
  FILE:   '#3b82f6',
}

/* ═══════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════ */
interface Props {
  filterIp?: string | null
}

export default function ThreatIntelPanel({ filterIp }: Props) {
  const [search, setSearch] = useState(filterIp ?? '')
  const [activeType, setActiveType] = useState<string>('ALL')

  const types = ['ALL', 'IP', 'DOMAIN', 'URL', 'HASH']
  const filtered = TI_DATA.filter(e => {
    const matchType = activeType === 'ALL' || e.type === activeType
    const matchSearch = search === '' ||
      e.indicator.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="fanos-card">
      {/* Header */}
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Globe size={13} className="text-fanos-accent" />
          Threat Intelligence
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-fanos-dim">
            <Database size={10} />
            <span>5 sources · Updated 2m ago</span>
          </div>
          <button className="fanos-btn text-[9px] py-0.5 px-2 gap-1">
            <TrendingUp size={9} />
            Full Intel DB
          </button>
        </div>
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.05] bg-black/10">
        <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-md"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Search size={11} className="text-fanos-dim flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search IP, domain, hash, URL…"
            className="bg-transparent border-none outline-none text-[12px] text-fanos-muted placeholder:text-fanos-dim w-full"
          />
        </div>
        <div className="flex items-center gap-1">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className="px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
              style={activeType === t
                ? { background: 'rgba(0,200,255,0.15)', color: '#00c8ff', border: '1px solid rgba(0,200,255,0.35)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#4a6080', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[60px_1fr_90px_70px_110px_70px] gap-2 px-4 py-2 bg-black/10 border-b border-white/[0.04]">
        {['TYPE', 'INDICATOR', 'REPUTATION', 'CONF.', 'CATEGORY', 'SOURCES'].map(h => (
          <span key={h} className="text-[10px] font-bold tracking-[0.7px] uppercase text-fanos-dim">{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.03]">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[12px] text-fanos-dim">No indicators match your query</div>
        )}
        {filtered.map((entry, i) => {
          const rep = REP_STYLE[entry.reputation]
          const RepIcon = rep.icon
          return (
            <div key={i}
              className="grid grid-cols-[60px_1fr_90px_70px_110px_70px] gap-2 px-4 py-3 items-center hover:bg-white/[0.015] transition-colors group">

              {/* Type badge */}
              <span className="text-[9px] font-bold px-2 py-0.5 rounded text-center"
                style={{
                  background: `${TYPE_COLOR[entry.type]}15`,
                  color: TYPE_COLOR[entry.type],
                  border: `1px solid ${TYPE_COLOR[entry.type]}35`,
                }}>
                {entry.type}
              </span>

              {/* Indicator */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-fanos-text truncate flex items-center gap-1.5">
                    {entry.indicator}
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-fanos-dim hover:text-fanos-accent">
                      <ExternalLink size={9} />
                    </button>
                  </div>
                  <div className="text-[10px] text-fanos-dim mt-0.5">
                    {entry.country && <span className="mr-2">🌍 {entry.country}</span>}
                    <Clock size={8} className="inline mr-1 opacity-60" />
                    <span>First seen {entry.firstSeen}</span>
                    {entry.associated && (
                      <span className="ml-2 text-fanos-accent font-semibold">{entry.associated}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reputation */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded"
                style={{ background: rep.bg, border: `1px solid ${rep.border}` }}>
                <RepIcon size={9} style={{ color: rep.color, flexShrink: 0 }} />
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: rep.color }}>
                  {entry.reputation}
                </span>
              </div>

              {/* Confidence */}
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold" style={{ color: entry.confidence >= 90 ? '#ef4444' : entry.confidence >= 70 ? '#f97316' : '#f59e0b' }}>
                  {entry.confidence}%
                </span>
                <div className="w-8 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${entry.confidence}%`, background: entry.confidence >= 90 ? '#ef4444' : '#f97316' }} />
                </div>
              </div>

              {/* Category */}
              <span className="text-[11px] text-fanos-muted truncate">{entry.category}</span>

              {/* Sources */}
              <span className="text-[10px] text-fanos-dim">{entry.sources.length} source{entry.sources.length !== 1 ? 's' : ''}</span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-fanos-dim">{filtered.length} indicator{filtered.length !== 1 ? 's' : ''} · DEMO MODE — Connect FANOS TI backend for live feeds</span>
        <button className="fanos-btn text-[10px] py-1 px-2.5">Submit IOC</button>
      </div>
    </div>
  )
}
