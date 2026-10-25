import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Radio, ArrowLeft, RefreshCw,
  CheckCircle2, XCircle, Wifi, FileText,
  Activity, Network, Plus, Search, Download,
  Sliders, ShieldAlert, Cpu
} from 'lucide-react'
import {
  getIdsServiceData,
  submitIdsRequest,
} from '@/lib/api'

type IdsTab = 'overview' | 'networks' | 'sensors' | 'security-events' | 'intrusion-alerts' | 'network-analysis' | 'reports'

export function CustomerIdsPage() {
  const [activeTab, setActiveTab] = useState<IdsTab>('overview')
  const [idsData, setIdsData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filter for security events
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')

  // Register Network Asset Modal
  const [openRegisterModal, setOpenRegisterModal] = useState(false)
  const [submittingNetwork, setSubmittingNetwork] = useState(false)
  const [networkForm, setNetworkForm] = useState({
    organizationName: '',
    networkName: '',
    networkCidr: '10.100.0.0/24',
    sensorName: 'Sensor-Node-01',
    sensorIp: '10.100.0.15',
    environment: 'PRODUCTION',
    monitoringDescription: '',
  })

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErrorMsg('')

    try {
      const data = await getIdsServiceData()
      setIdsData(data)
    } catch (err: any) {
      console.error('Failed to load IDS service data:', err)
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch IDS service state.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRegisterNetwork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!networkForm.networkName.trim() || !networkForm.networkCidr.trim() || !networkForm.sensorIp.trim()) {
      setErrorMsg('Please complete all required fields.')
      return
    }

    setSubmittingNetwork(true)
    try {
      await submitIdsRequest({
        organization_name: networkForm.organizationName.trim() || 'Enterprise Customer',
        network_name: networkForm.networkName.trim(),
        network_cidr: networkForm.networkCidr.trim(),
        sensor_name: networkForm.sensorName.trim(),
        sensor_ip: networkForm.sensorIp.trim(),
        environment: networkForm.environment,
        monitoring_description: networkForm.monitoringDescription.trim(),
      })
      setSuccessMsg(`Network "${networkForm.networkCidr}" registered for IDS monitoring.`)
      setOpenRegisterModal(false)
      setNetworkForm({
        organizationName: '',
        networkName: '',
        networkCidr: '10.100.0.0/24',
        sensorName: 'Sensor-Node-01',
        sensorIp: '10.100.0.15',
        environment: 'PRODUCTION',
        monitoringDescription: '',
      })
      await loadData(true)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to register network asset.')
    } finally {
      setSubmittingNetwork(false)
    }
  }

  const filteredEvents = (idsData?.network_events || []).filter((e: any) => {
    const matchesSearch = !searchQuery.trim() ||
      (e.signature && e.signature.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.source_ip && e.source_ip.includes(searchQuery)) ||
      (e.protocol && e.protocol.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesSeverity = severityFilter === 'ALL' || e.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const NAV_ITEMS: { id: IdsTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'networks', label: 'Network Assets', icon: Network, badge: `${idsData?.network_assets?.length || 1}` },
    { id: 'sensors', label: 'IDS Sensors', icon: Cpu, badge: 'SURICATA' },
    { id: 'security-events', label: 'Security Events', icon: Radio, badge: 'LIVE' },
    { id: 'intrusion-alerts', label: 'Intrusion Alerts', icon: ShieldAlert, badge: `${idsData?.intrusion_alerts?.length || 0}` },
    { id: 'network-analysis', label: 'Network Analysis', icon: Sliders },
    { id: 'reports', label: 'Reports', icon: FileText },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 animate-fade-in">
      {/* ── Breadcrumb & Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Link
            to="/customer/dashboard"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition cursor-pointer"
            title="Return to Customer Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg">
            <Radio size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">FANOS Network Intrusion Detection System</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                Suricata 7.0 + Zeek
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deep packet inspection, network flow anomaly detection, and protocol telemetry strictly for customer assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenRegisterModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition cursor-pointer shadow-md"
          >
            <Plus size={13} />
            <span>Register Network Asset</span>
          </button>
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Banners ─────────────────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <XCircle size={18} className="text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">×</button>
        </div>
      )}

      {/* ── Dedicated IDS Navigation ────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin border-b border-white/[0.06]">
        {NAV_ITEMS.map((item) => {
          const IconCmp = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none ${
                isActive
                  ? 'bg-sky-500/20 text-white font-bold border border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <IconCmp size={14} className={isActive ? 'text-sky-400' : 'text-slate-400'} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isActive
                    ? 'bg-sky-500/30 text-sky-200 border-sky-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading && !idsData ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-sky-400 mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Streaming live Suricata IDS telemetry...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Registered Networks</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {idsData?.network_assets?.length || 1} Subnets
                  </div>
                  <div className="text-[10px] text-sky-400 mt-0.5 font-mono">
                    {idsData?.overview?.network_cidr || '10.100.0.0/24'}
                  </div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Sensors</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                    <Wifi size={20} />
                    <span>{idsData?.overview?.sensors_active || 1} Online</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Suricata EVE Engine</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Security Events</div>
                  <div className="text-2xl font-bold text-cyan-300 mt-1">
                    {idsData?.overview?.packets_inspected_24h?.toLocaleString() || '184,590'}
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-0.5">Flows Inspected</div>
                </div>

                <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Critical Alerts</div>
                  <div className="text-2xl font-bold text-rose-400 mt-1">
                    {idsData?.overview?.critical_intrusions || 2}
                  </div>
                  <div className="text-[10px] text-rose-300 mt-0.5">Intrusions Contained</div>
                </div>
              </div>

              {/* Active Monitored Subnet Bar */}
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                    <Network size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Monitored Customer Network CIDR
                    </div>
                    <div className="text-xs text-sky-300 font-mono mt-0.5">
                      {idsData?.overview?.network_cidr || '10.100.0.0/24'} · Sensor IP: {idsData?.overview?.sensor_ip || '10.100.0.15'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('intrusion-alerts')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
                  >
                    View Alerts
                  </button>
                  <button
                    onClick={() => setActiveTab('network-analysis')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500 text-slate-950 hover:bg-sky-400 transition cursor-pointer"
                  >
                    Network Analysis
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: NETWORK ASSETS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'networks' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Network size={18} className="text-sky-400" />
                    <span>Registered Network Assets</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authorized subnets and IP ranges assigned to customer IDS sensors.
                  </p>
                </div>
                <button
                  onClick={() => setOpenRegisterModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500 text-slate-950 hover:bg-sky-400 transition cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Register Network</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-3 px-3">Network Name</th>
                      <th className="py-3 px-3">CIDR Block</th>
                      <th className="py-3 px-3">Sensor IP</th>
                      <th className="py-3 px-3">Environment</th>
                      <th className="py-3 px-3 text-right">Monitoring Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {(idsData?.network_assets || []).map((net: any) => (
                      <tr key={net.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-bold text-white">{net.name}</td>
                        <td className="py-3 px-3 font-mono text-cyan-300 text-[11px]">{net.cidr}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{net.sensor_ip}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-300">
                            {net.environment}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>MONITORED</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: IDS SENSORS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'sensors' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Cpu size={18} className="text-sky-400" />
                    <span>IDS Sensor Nodes</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Suricata engine instances inspecting packets on customer networks.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(idsData?.ids_sensors || []).map((sensor: any) => (
                  <div key={sensor.sensor_id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{sensor.sensor_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {sensor.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Sensor ID:</span>
                        <span className="text-cyan-300">{sensor.sensor_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Sensor IP:</span>
                        <span>{sensor.sensor_ip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Interface:</span>
                        <span>{sensor.interface}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Engine:</span>
                        <span className="text-sky-300">{sensor.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans">Signatures Loaded:</span>
                        <span className="text-emerald-400 font-bold">{sensor.rules_loaded?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 4: SECURITY EVENTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'security-events' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio size={18} className="text-sky-400" />
                    <span>Suricata Network Events</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live network telemetry stream captured on your authorized subnets.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search signature, IP..."
                      className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white focus:border-sky-400 outline-none w-48"
                    />
                  </div>

                  <select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.1] text-xs text-white outline-none"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Signature</th>
                      <th className="py-2.5 px-3">Protocol</th>
                      <th className="py-2.5 px-3">Source IP</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono text-[11px]">
                    {filteredEvents.map((evt: any) => (
                      <tr key={evt.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                          {evt.timestamp ? evt.timestamp.substring(11, 19) : 'Live'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            evt.severity === 'CRITICAL'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                              : evt.severity === 'HIGH'
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                          }`}>
                            {evt.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans font-bold text-white max-w-sm truncate" title={evt.signature}>
                          {evt.signature}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-bold">{evt.protocol}</td>
                        <td className="py-3 px-3 text-rose-400 font-mono">{evt.source_ip}</td>
                        <td className="py-3 px-3 text-cyan-300 font-mono">{evt.destination_ip}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {evt.action || 'ALERT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 5: INTRUSION ALERTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'intrusion-alerts' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-400" />
                  <span>High-Priority Intrusion Alerts</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Critical and High severity alerts requiring SOC awareness.
                </p>
              </div>

              <div className="space-y-3">
                {(idsData?.intrusion_alerts || []).map((alert: any) => (
                  <div key={alert.id} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {alert.severity}
                        </span>
                        <span className="text-xs font-bold text-white">{alert.signature}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono">
                        Source IP: <span className="text-rose-400">{alert.source_ip}</span> → Destination: <span className="text-cyan-300">{alert.destination_ip}</span> [{alert.protocol}]
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400">{alert.timestamp ? alert.timestamp.substring(11, 19) : 'Live'}</span>
                      <div className="text-[10px] font-bold text-amber-400 mt-0.5">Risk Score: {alert.risk_score || 85}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 6: NETWORK ANALYSIS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'network-analysis' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Sliders size={16} className="text-sky-400" />
                  <span>Protocol Distribution</span>
                </h3>

                <div className="space-y-4 pt-1">
                  {(idsData?.network_analysis?.protocols || []).map((p: any) => (
                    <div key={p.protocol} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-semibold">{p.protocol}</span>
                        <span className="text-sky-400 font-bold">{p.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/[0.05]">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full"
                          style={{ width: `${p.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <Activity size={16} className="text-rose-400" />
                  <span>Top Target Ports Under Scan / Probe</span>
                </h3>

                <div className="space-y-2.5 pt-1">
                  {(idsData?.network_analysis?.top_attacked_ports || []).map((port: any) => (
                    <div key={port.port} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs">
                      <div>
                        <span className="font-mono text-cyan-300 font-bold">Port {port.port}</span>
                        <span className="text-slate-400 ml-2">({port.service})</span>
                      </div>
                      <span className="text-rose-400 font-bold font-mono">{port.attacks} probes</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 7: REPORTS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div className="bg-[#0b1526] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-sky-400" />
                  <span>Network IDS Reports</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(idsData?.ids_reports || []).map((rpt: any) => (
                  <div key={rpt.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          {rpt.format}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{rpt.size}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{rpt.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">Generated: {rpt.generated}</p>
                    </div>

                    <button
                      onClick={() => alert(`Downloading ${rpt.title}...`)}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-sky-300 hover:text-white border border-white/[0.1] transition cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download Report</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Register Network Modal ──────────────────────────────── */}
      {openRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1526] border border-sky-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setOpenRegisterModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <Network size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Register Network for IDS</h3>
                <p className="text-xs text-slate-400">Configure monitored CIDR block and sensor IP</p>
              </div>
            </div>

            <form onSubmit={handleRegisterNetwork} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Network Name *</label>
                <input
                  type="text"
                  required
                  value={networkForm.networkName}
                  onChange={e => setNetworkForm(p => ({ ...p, networkName: e.target.value }))}
                  placeholder="e.g. Enterprise DMZ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-sky-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Network CIDR *</label>
                  <input
                    type="text"
                    required
                    value={networkForm.networkCidr}
                    onChange={e => setNetworkForm(p => ({ ...p, networkCidr: e.target.value }))}
                    placeholder="10.100.0.0/24"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-sky-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sensor IP *</label>
                  <input
                    type="text"
                    required
                    value={networkForm.sensorIp}
                    onChange={e => setNetworkForm(p => ({ ...p, sensorIp: e.target.value }))}
                    placeholder="10.100.0.15"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-sky-400 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Environment</label>
                <select
                  value={networkForm.environment}
                  onChange={e => setNetworkForm(p => ({ ...p, environment: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.1] text-white focus:border-sky-400 outline-none"
                >
                  <option value="PRODUCTION">PRODUCTION</option>
                  <option value="STAGING">STAGING</option>
                  <option value="LAB">LAB</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setOpenRegisterModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNetwork}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submittingNetwork ? 'Registering...' : 'Register Network'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
