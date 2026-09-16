import { Wifi } from 'lucide-react'
import { useSensors } from '@/hooks/useDashboard'
import { mockSensors } from '@/lib/mockData'

export default function SensorStatusPanel() {
  const { data: sensors = mockSensors } = useSensors()
  const online = sensors.filter(s => s.status === 'ONLINE').length

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Wifi size={13} className="text-fanos-accent" />
          Security Sensors
        </div>
        <span className="text-[10px] font-semibold" style={{ color: '#00e5a0' }}>
          {online}/{sensors.length} Online
        </span>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        {sensors.map(s => (
          <div key={s.name}
            className="flex items-center justify-between px-2.5 py-2 rounded-md"
            style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-2">
              <span className={s.status === 'ONLINE' ? 'dot-green' : 'dot-red'} />
              <div>
                <div className="text-[11px] text-fanos-text font-medium">{s.name}</div>
                <div className="text-[9px] text-fanos-dim">{s.type}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-[9px] text-fanos-dim">Events</div>
                <div className="text-[10px] font-semibold text-fanos-text">{s.events.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[9px] text-fanos-dim">Uptime</div>
                <div className="text-[10px] font-semibold text-fanos-green">{s.uptime}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
