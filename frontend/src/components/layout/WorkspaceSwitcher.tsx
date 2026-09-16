/**
 * WorkspaceSwitcher — dropdown in sidebar header to switch between
 * Admin Portal, Security Operations, and Customer SOC.
 */
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, LayoutDashboard, ShieldAlert, Building2, Check } from 'lucide-react'
import { useWorkspace, type Workspace } from '@/context/WorkspaceContext'

interface WsOption {
  id:       Workspace
  label:    string
  sublabel: string
  icon:     React.ReactNode
  color:    string
}

const OPTIONS: WsOption[] = [
  {
    id:       'admin-portal',
    label:    'Admin Portal',
    sublabel: 'Business & platform management',
    icon:     <Building2 size={14} />,
    color:    '#8b5cf6',
  },
  {
    id:       'secops',
    label:    'Security Operations',
    sublabel: 'Security monitoring & response',
    icon:     <ShieldAlert size={14} />,
    color:    '#00c8ff',
  },
  {
    id:       'customer-soc',
    label:    'Customer SOC',
    sublabel: 'Customer security visibility',
    icon:     <LayoutDashboard size={14} />,
    color:    '#00e5a0',
  },
]

export default function WorkspaceSwitcher() {
  const { workspace, switchTo, canAccess } = useWorkspace()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = OPTIONS.find(o => o.id === workspace) ?? OPTIONS[0]

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border:     '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ color: current.color }} className="flex-shrink-0">
          {current.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-fanos-text truncate leading-tight">
            {current.label}
          </div>
        </div>
        <ChevronDown
          size={11}
          className={`text-fanos-dim flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] rounded-xl overflow-hidden z-[300] shadow-2xl"
          style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="px-3 py-2 border-b border-white/[0.05]">
            <span className="text-[9px] font-bold tracking-[1.2px] uppercase text-fanos-dim">
              Workspace
            </span>
          </div>
          {OPTIONS.map(opt => {
            const accessible = canAccess(opt.id)
            const active = opt.id === workspace
            return (
              <button
                key={opt.id}
                disabled={!accessible}
                onClick={() => { switchTo(opt.id); setOpen(false) }}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (accessible && !active)
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                }}
                onMouseLeave={e => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <span style={{ color: opt.color }} className="flex-shrink-0 mt-0.5">
                  {opt.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-fanos-text leading-tight">
                    {opt.label}
                  </div>
                  <div className="text-[9px] text-fanos-dim mt-0.5 truncate">
                    {opt.sublabel}
                  </div>
                </div>
                {active && (
                  <Check size={11} className="flex-shrink-0 mt-0.5" style={{ color: opt.color }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
