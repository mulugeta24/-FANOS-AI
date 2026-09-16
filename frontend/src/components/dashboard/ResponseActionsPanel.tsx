import { History, Ban, WifiOff, ShieldCheck, Flame } from 'lucide-react'
import { useResponseActions } from '@/hooks/useDashboard'
import { mockResponseActions } from '@/lib/mockData'
import { timeAgo } from '@/lib/utils'

function actionMeta(action: string) {
  if (action.includes('IP'))      return { icon: <Ban size={11} />,        bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' }
  if (action.includes('Session')) return { icon: <WifiOff size={11} />,    bg: 'rgba(249,115,22,0.12)', color: '#f97316' }
  if (action.includes('WAF'))     return { icon: <ShieldCheck size={11} />,bg: 'rgba(0,200,255,0.1)',   color: '#00c8ff' }
  return                                 { icon: <Flame size={11} />,       bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' }
}

export default function ResponseActionsPanel() {
  const { data: actions = mockResponseActions } = useResponseActions(10)

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <History size={13} className="text-fanos-accent" />
          Recent Response Actions
        </div>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        {actions.map(a => {
          const { icon, bg, color } = actionMeta(a.action)
          const ts = typeof a.timestamp === 'string' ? a.timestamp : (a as any).created_at
          return (
            <div key={a.id as string}
              className="flex items-start gap-2.5 px-2.5 py-2 rounded-md transition-colors"
              style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: bg, color }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-fanos-text">{a.action}</div>
                <div className="text-[10px] font-mono text-fanos-accent truncate">{a.target}</div>
                <div className="text-[9px] text-fanos-dim">Reason: {a.reason}</div>
              </div>
              <div className="text-[9px] text-fanos-dim whitespace-nowrap flex-shrink-0 mt-0.5">
                {ts ? timeAgo(new Date(ts)) : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
