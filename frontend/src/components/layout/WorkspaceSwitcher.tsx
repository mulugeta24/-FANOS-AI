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
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-left bg-slate-900/60 hover:bg-slate-900/90 border border-white/[0.08] hover:border-white/[0.16] shadow-sm cursor-pointer group"
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: `${current.color}18`, color: current.color, border: `1px solid ${current.color}35` }}
        >
          {current.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-slate-200 truncate leading-tight group-hover:text-white transition-colors">
            {current.label}
          </div>
          <div className="text-[9px] text-slate-500 truncate leading-none mt-0.5">
            Active Workspace
          </div>
        </div>
        <ChevronDown
          size={12}
          className={`text-slate-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-sky-400' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-2xl overflow-hidden z-[300] shadow-2xl bg-[#0c1424]/98 border border-white/[0.1] backdrop-blur-xl animate-fade-in p-1.5"
        >
          <div className="px-3 py-1.5 border-b border-white/[0.06] mb-1">
            <span className="text-[9px] font-bold tracking-[1.2px] uppercase text-slate-400">
              Switch Workspace
            </span>
          </div>
          <div className="space-y-0.5">
            {OPTIONS.map(opt => {
              const accessible = canAccess(opt.id)
              const active = opt.id === workspace
              return (
                <button
                  key={opt.id}
                  disabled={!accessible}
                  onClick={() => { if (accessible) { switchTo(opt.id); setOpen(false) } }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all text-left ${
                    !accessible ? 'opacity-40 cursor-not-allowed bg-black/20' : ''
                  } ${
                    active
                      ? 'bg-white/[0.06] border border-white/[0.08]'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  }`}
                  title={!accessible ? 'Restricted: System Administrator access required' : ''}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${opt.color}15`, color: opt.color, border: `1px solid ${opt.color}30` }}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white leading-tight flex items-center justify-between">
                      <span>{opt.label}</span>
                      {!accessible && (
                        <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Admin Only
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                      {opt.sublabel}
                    </div>
                  </div>
                  {active && (
                    <Check size={13} className="flex-shrink-0 mt-1" style={{ color: opt.color }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
