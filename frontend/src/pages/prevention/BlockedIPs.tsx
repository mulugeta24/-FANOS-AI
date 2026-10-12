import { useState, useMemo } from 'react'
import { Ban, Plus, Trash2, Search, Filter, RefreshCw, X, ShieldAlert, CheckCircle2 } from 'lucide-react'
import PageShell from '@/components/ui/PageShell'
import { useBlockedIPs, useBlockIP, useUnblockIP } from '@/hooks/useDashboard'
import { timeAgo } from '@/lib/utils'
import type { BlockedIP } from '@/types'

export default function BlockedIPs() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newIp, setNewIp] = useState('')
  const [newReason, setNewReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: blockedIps = [], isLoading, isError, error, refetch, isFetching } = useBlockedIPs(false)
  const blockMutation = useBlockIP()
  const unblockMutation = useUnblockIP()

  const filtered = useMemo(() => {
    return blockedIps.filter((i) => {
      const matchSearch =
        !search.trim() ||
        i.ip_address.toLowerCase().includes(search.toLowerCase()) ||
        i.reason.toLowerCase().includes(search.toLowerCase()) ||
        i.blocked_by.toLowerCase().includes(search.toLowerCase())

      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? i.is_active
          : !i.is_active

      return matchSearch && matchStatus
    })
  }, [blockedIps, search, statusFilter])

  const totalCount = blockedIps.length
  const activeCount = blockedIps.filter((i) => i.is_active).length
  const autoCount = blockedIps.filter((i) => i.blocked_by.includes('AI') || i.blocked_by.includes('FANOS')).length

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!newIp.trim() || !newReason.trim()) return

    try {
      await blockMutation.mutateAsync({
        ip_address: newIp.trim(),
        reason: newReason.trim(),
      })
      setIsModalOpen(false)
      setNewIp('')
      setNewReason('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to block IP'
      setFormError(msg)
    }
  }

  const handleUnblock = async (ip: BlockedIP) => {
    if (confirm(`Deactivate block rule for ${ip.ip_address}?`)) {
      try {
        await unblockMutation.mutateAsync(ip.ip_address)
      } catch (err) {
        console.error('Failed to unblock IP:', err)
      }
    }
  }

  return (
    <PageShell
      title="Perimeter Blocklist"
      subtitle="Persistent firewall drop rules and automated IP perimeter containment"
      badge={{ label: `${activeCount} ACTIVE BLOCKS`, color: activeCount > 0 ? 'red' : 'green' }}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="fanos-btn text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-white/[0.06] transition"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin text-fanos-accent' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setFormError(null)
              setIsModalOpen(true)
            }}
            className="fanos-btn bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30 text-xs py-1.5 px-3 flex items-center gap-1.5 transition font-medium"
          >
            <Plus size={12} />
            <span>Block IP</span>
          </button>
        </div>
      }
    >
      {/* Metric Cards Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Enforced Rules', value: totalCount, color: '#00c8ff' },
          { label: 'Active Perimeter Blocks', value: activeCount, color: '#ef4444' },
          { label: 'Automated / AI Enforced', value: autoCount, color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="bg-[#12161f]/80 border border-white/[0.07] rounded-xl px-4 py-3 backdrop-blur shadow-sm">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{s.label}</div>
            <div className="text-2xl font-bold font-mono mt-1" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#12161f]/80 backdrop-blur border border-white/[0.08] rounded-xl p-3.5 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
        <div className="relative flex-1 max-w-md min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search IP address, reason, operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d14] border border-white/[0.08] rounded-lg text-xs text-fanos-text placeholder:text-gray-500 focus:outline-none focus:border-fanos-accent transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 bg-[#0a0d14] p-1 rounded-lg border border-white/[0.06] text-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 px-2 flex items-center gap-1">
            <Filter size={10} /> State:
          </span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === st
                  ? 'bg-fanos-accent/20 text-fanos-accent border border-fanos-accent/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5 flex items-center justify-between text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>Could not load blocked IPs from PostgreSQL: {(error as Error)?.message}</span>
          </div>
          <button onClick={() => refetch()} className="fanos-btn text-xs py-1 px-3">
            Retry
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="fanos-card overflow-hidden">
        <div className="fanos-panel-header flex items-center justify-between">
          <div className="fanos-panel-title flex items-center gap-2">
            <Ban size={14} className="text-red-400" />
            <span>Firewall Drop Registry</span>
            {isFetching && <span className="text-[10px] text-fanos-dim animate-pulse">(syncing...)</span>}
          </div>
          <span className="text-[11px] font-mono text-fanos-dim">POSTGRESQL SYNCED</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/20 border-b border-white/[0.06]">
                {['IP Address', 'Block Reason / Threat', 'Enforced By', 'Time Enforced', 'Rule Status', 'Action'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3.5 py-2.5 text-left text-[9px] font-bold tracking-[0.7px] uppercase text-fanos-dim whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-3 text-center text-xs text-fanos-dim">
                      Loading firewall blocklist...
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-fanos-dim text-xs">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                    No blocked IPs match current criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((ip) => (
                  <tr key={ip.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-red-300 font-bold whitespace-nowrap">
                      {ip.ip_address}
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-fanos-text font-medium">{ip.reason}</td>
                    <td className="px-3.5 py-2.5 text-[10px] font-mono text-cyan-400 whitespace-nowrap">
                      {ip.blocked_by}
                    </td>
                    <td className="px-3.5 py-2.5 text-[10px] text-fanos-dim whitespace-nowrap">
                      {timeAgo(new Date(ip.created_at))}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                          ip.is_active
                            ? 'bg-red-500/10 text-red-400 border border-red-500/25'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/25'
                        }`}
                      >
                        {ip.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {ip.is_active && (
                        <button
                          onClick={() => handleUnblock(ip)}
                          disabled={unblockMutation.isPending}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition disabled:opacity-40"
                        >
                          <Trash2 size={11} />
                          <span>Unblock</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block IP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Ban size={16} className="text-red-400" />
                <h3 className="text-sm font-semibold text-white">Add Perimeter Block Rule</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  IPv4 / IPv6 Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.56.45"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-red-400 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Mitigation Reason / Attack Category *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Repeated automated SQL Injection attempts"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d14] border border-white/[0.1] rounded-lg text-xs text-white focus:outline-none focus:border-red-400 transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="fanos-btn px-4 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={blockMutation.isPending}
                  className="fanos-btn bg-red-500/20 border-red-500/50 text-red-200 hover:bg-red-500/30 px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  {blockMutation.isPending ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Applying Rule...</span>
                    </>
                  ) : (
                    <span>Enforce Drop</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
