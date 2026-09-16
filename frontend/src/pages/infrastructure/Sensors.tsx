import PageShell from '@/components/ui/PageShell'
import { useSensors } from '@/hooks/useDashboard'
import { mockSensors } from '@/lib/mockData'

export default function Sensors() {
  const { data: sensors = mockSensors } = useSensors()
  const online = sensors.filter(s=>s.status==='ONLINE').length

  return (
    <PageShell title="Security Sensors" subtitle="Real-time status of all FANOS AI collection sensors"
      badge={{ label:`${online}/${sensors.length} ONLINE`, color:'green' }}>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Total Sensors', value:sensors.length,     color:'#00c8ff' },
          { label:'Online',        value:online,              color:'#00e5a0' },
          { label:'Total Events',  value:sensors.reduce((s,x)=>s+x.events,0).toLocaleString(), color:'#8b5cf6' },
        ].map(s=>(
          <div key={s.label} className="fanos-card px-4 py-3">
            <div className="text-[9px] uppercase tracking-widest text-fanos-dim">{s.label}</div>
            <div className="text-[26px] font-bold mt-1" style={{color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sensors.map(s=>(
          <div key={s.name} className="fanos-card px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={s.status==='ONLINE'?'dot-green':'dot-red'}/>
                <span className="text-[14px] font-bold text-white">{s.name}</span>
              </div>
              <span className={s.status==='ONLINE'?'status-blocked':'status-alert'}>{s.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:'Type',   value:s.type },
                { label:'Events', value:s.events.toLocaleString() },
                { label:'Uptime', value:s.uptime },
              ].map(m=>(
                <div key={m.label}>
                  <div className="text-[9px] uppercase tracking-widest text-fanos-dim">{m.label}</div>
                  <div className="text-[12px] font-semibold text-fanos-text mt-0.5">{m.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full bg-fanos-green" style={{width:'100%'}}/>
            </div>
            <div className="text-[9px] text-fanos-dim mt-1">Sensor uptime: {s.uptime}</div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
