import PageShell from '@/components/ui/PageShell'
import {
  Globe, Monitor, Filter, Zap, Shield, WifiOff, ShieldCheck, List, History,
  GitBranch, Network, Link2, Search, BarChart2, BrainCircuit, Activity,
  FlaskConical, Server, Database, LineChart, TrendingUp, AreaChart, FileText,
  UserCog, Key, Settings, Construction,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  Globe: <Globe size={28} />, Monitor: <Monitor size={28} />, Filter: <Filter size={28} />,
  Zap: <Zap size={28} />, Shield: <Shield size={28} />, WifiOff: <WifiOff size={28} />,
  ShieldCheck: <ShieldCheck size={28} />, List: <List size={28} />, History: <History size={28} />,
  GitBranch: <GitBranch size={28} />, Network: <Network size={28} />, Link2: <Link2 size={28} />,
  Search: <Search size={28} />, BarChart2: <BarChart2 size={28} />, BrainCircuit: <BrainCircuit size={28} />,
  Activity: <Activity size={28} />, FlaskConical: <FlaskConical size={28} />, Server: <Server size={28} />,
  Database: <Database size={28} />, LineChart: <LineChart size={28} />, TrendingUp: <TrendingUp size={28} />,
  AreaChart: <AreaChart size={28} />, FileText: <FileText size={28} />, UserCog: <UserCog size={28} />,
  Key: <Key size={28} />, Settings: <Settings size={28} />,
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  green:  { bg: 'rgba(0,229,160,0.07)',    border: 'rgba(0,229,160,0.2)',    text: '#00e5a0' },
  blue:   { bg: 'rgba(0,200,255,0.07)',    border: 'rgba(0,200,255,0.2)',    text: '#00c8ff' },
  orange: { bg: 'rgba(249,115,22,0.07)',   border: 'rgba(249,115,22,0.2)',   text: '#f97316' },
  red:    { bg: 'rgba(239,68,68,0.07)',    border: 'rgba(239,68,68,0.2)',    text: '#ef4444' },
  purple: { bg: 'rgba(139,92,246,0.07)',   border: 'rgba(139,92,246,0.2)',   text: '#8b5cf6' },
}

interface PlaceholderProps {
  title: string
  icon?:  string
  color?: string
  desc?:  string
}

export default function Placeholder({ title, icon = 'Construction', color = 'blue', desc }: PlaceholderProps) {
  const c  = COLOR_MAP[color] ?? COLOR_MAP.blue
  const ic = ICON_MAP[icon] ?? <Construction size={28} />

  return (
    <PageShell title={title} subtitle={desc}>
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-8">

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
          {ic}
        </div>

        {/* Text */}
        <div className="max-w-md">
          <h2 className="text-[18px] font-bold text-white mb-2">{title}</h2>
          <p className="text-[12px] text-fanos-muted leading-relaxed">
            {desc ?? `The ${title} module is part of the FANOS AI platform and will be fully operational once the backend data pipeline is configured.`}
          </p>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {['Backend API Ready', 'UI Scaffolded', 'Data Model Defined'].map(s => (
            <span key={s} className="text-[10px] font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,229,160,0.08)', color: '#00e5a0', border: '1px solid rgba(0,229,160,0.2)' }}>
              ✓ {s}
            </span>
          ))}
          <span className="text-[10px] font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(249,115,22,0.08)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
            ⏳ Live Data Integration Pending
          </span>
        </div>

        {/* Platform badge */}
        <span className="text-[10px] text-fanos-dim px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(0,200,255,0.04)', border: '1px solid rgba(0,200,255,0.1)' }}>
          FANOS AI Platform — v1.0 · Author: Mulugeta Ababi
        </span>
      </div>
    </PageShell>
  )
}
