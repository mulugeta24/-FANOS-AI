import { useState } from 'react'
import { Link2, AlertTriangle, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useURIAssessment } from '@/hooks/useURIAssessment'
import { cn } from '@/lib/utils'

const SCOPES = ['Single URI', 'Application Path', 'Authorized Application']

export default function URIAssessmentPanel() {
  const [uri,   setUri]   = useState('https://example.com/login')
  const [scope, setScope] = useState(SCOPES[0])

  const { mutate, data: result, isPending, isError, reset } = useURIAssessment()

  function handleAssess() {
    reset()
    mutate({ uri, scope })
  }

  const riskColor =
    !result ? ''
    : result.risk_score >= 70 ? 'text-fanos-red'
    : result.risk_score >= 40 ? 'text-fanos-amber'
    : 'text-fanos-green'

  return (
    <div className="fanos-card">
      <div className="fanos-panel-header">
        <div className="fanos-panel-title">
          <Link2 size={13} className="text-fanos-accent" />
          URI Assessment
        </div>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2">
        {/* Warning */}
        <div className="flex items-start gap-2 rounded-md p-2"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <AlertTriangle size={11} className="text-fanos-amber flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-fanos-amber leading-relaxed">
            Authorized applications &amp; security testing environments only. Unauthorized scanning is prohibited.
          </p>
        </div>

        {/* URI input */}
        <div>
          <label className="text-[9px] uppercase tracking-[0.8px] text-fanos-dim block mb-1">Target URI</label>
          <input
            type="text"
            value={uri}
            onChange={e => setUri(e.target.value)}
            className="w-full rounded-md px-2.5 py-2 text-[11px] font-mono text-fanos-text outline-none transition-all"
            style={{ background: 'rgba(8,14,26,0.8)', border: '1px solid rgba(0,200,255,0.15)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,200,255,0.4)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(0,200,255,0.15)')}
          />
        </div>

        {/* Scope */}
        <div>
          <label className="text-[9px] uppercase tracking-[0.8px] text-fanos-dim block mb-1">Assessment Scope</label>
          <select
            value={scope}
            onChange={e => setScope(e.target.value)}
            className="w-full rounded-md px-2.5 py-2 text-[11px] text-fanos-muted outline-none cursor-pointer"
            style={{ background: 'rgba(8,14,26,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <button
          onClick={handleAssess}
          disabled={isPending || !uri}
          className={cn('fanos-btn w-full justify-center gap-1.5 mt-0.5', isPending && 'opacity-70 cursor-not-allowed')}
        >
          {isPending
            ? <><Loader2 size={11} className="animate-spin" /> SCANNING…</>
            : <><Play size={11} /> START ASSESSMENT</>
          }
        </button>

        {/* Result */}
        {result && (
          <div className="rounded-md p-2.5 flex flex-col gap-1"
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-fanos-text">Scan Complete</span>
              <div className="flex items-center gap-1">
                {result.findings === 0
                  ? <CheckCircle2 size={12} className="text-fanos-green" />
                  : <XCircle size={12} className="text-fanos-red" />
                }
                <span className={cn('text-[12px] font-bold', riskColor)}>
                  Risk {result.risk_score}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-fanos-muted leading-relaxed">{result.summary}</p>
            <div className="flex gap-3 text-[9px] text-fanos-dim mt-0.5">
              <span>Findings: <b className="text-fanos-text">{result.findings}</b></span>
              <span>Critical: <b className="text-fanos-red">{result.critical}</b></span>
              <span>High: <b className="text-fanos-orange">{result.high}</b></span>
              <span className="ml-auto">{result.scan_duration.toFixed(1)} ms</span>
            </div>
          </div>
        )}

        {isError && (
          <p className="text-[10px] text-fanos-red">Backend unreachable — check API connection.</p>
        )}
      </div>
    </div>
  )
}
