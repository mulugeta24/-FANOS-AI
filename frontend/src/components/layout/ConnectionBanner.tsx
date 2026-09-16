import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import axios from 'axios'

export default function ConnectionBanner() {
  const [online,  setOnline]  = useState<boolean | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    async function check() {
      try {
        await axios.get('/api/v1/dashboard/kpis', { timeout: 3000 })
        if (online === false) {
          setOnline(true)
          setVisible(true)
          timer = setTimeout(() => setVisible(false), 3000)
        } else {
          setOnline(true)
        }
      } catch {
        setOnline(false)
        setVisible(true)
      }
    }

    check()
    const interval = setInterval(check, 15_000)
    return () => { clearInterval(interval); clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible || online === null) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium shadow-xl transition-all animate-fade-in"
      style={
        online
          ? { background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.3)', color: '#00e5a0' }
          : { background: 'rgba(239,68,68,0.12)',  border: '1px solid rgba(239,68,68,0.3)',  color: '#ef4444' }
      }
    >
      {online
        ? <><Wifi size={13} /> Backend connected — live data active</>
        : <><WifiOff size={13} /> Backend offline — showing demo data</>
      }
    </div>
  )
}
