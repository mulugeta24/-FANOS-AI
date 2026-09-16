import { Save, Bell, Lock, Globe, Database, Mail, Cpu } from 'lucide-react'
import { useState } from 'react'
import PageShell from '@/components/ui/PageShell'

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <div>
        <div className="text-[12px] font-medium text-fanos-text">{label}</div>
        {desc && <div className="text-[10px] text-fanos-dim mt-0.5">{desc}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      onClick={() => setOn(v => !v)}
      className="w-9 h-5 rounded-full transition-all relative flex-shrink-0"
      style={{ background: on ? 'rgba(0,229,160,0.4)' : 'rgba(255,255,255,0.1)', border: `1px solid ${on ? 'rgba(0,229,160,0.5)' : 'rgba(255,255,255,0.15)'}` }}
    >
      <span
        className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all"
        style={{ background: on ? '#00e5a0' : '#6b7280', left: on ? 'calc(100% - 14px - 2px)' : '2px' }}
      />
    </button>
  )
}

function TextInput({ defaultValue }: { defaultValue: string }) {
  const [val, setVal] = useState(defaultValue)
  return (
    <input
      value={val}
      onChange={e => setVal(e.target.value)}
      className="bg-transparent border rounded px-2 py-1 text-[11px] text-fanos-text outline-none focus:border-fanos-accent/50 w-48"
      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
    />
  )
}

export default function SystemSettings() {
  return (
    <PageShell
      title="System Settings"
      subtitle="Platform configuration, notifications, and security preferences"
      actions={
        <button className="fanos-btn">
          <Save size={11} />Save Changes
        </button>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* General */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Globe size={13} className="text-fanos-accent" />General</div>
          </div>
          <div className="px-4 pb-2">
            <SettingRow label="Platform Name" desc="Displayed in UI and emails"><TextInput defaultValue="FANOS AI" /></SettingRow>
            <SettingRow label="Support Email" desc="Customer support contact"><TextInput defaultValue="support@fanos.ai" /></SettingRow>
            <SettingRow label="Default Timezone" desc="Used for all timestamps"><TextInput defaultValue="UTC+3 (EAT)" /></SettingRow>
            <SettingRow label="Maintenance Mode" desc="Take platform offline for maintenance"><Toggle /></SettingRow>
          </div>
        </div>

        {/* Security */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Lock size={13} style={{ color: '#ef4444' }} />Security</div>
          </div>
          <div className="px-4 pb-2">
            <SettingRow label="Enforce MFA" desc="Require MFA for all admin users"><Toggle defaultOn /></SettingRow>
            <SettingRow label="Session Timeout" desc="Auto-logout after inactivity"><TextInput defaultValue="60 minutes" /></SettingRow>
            <SettingRow label="IP Allowlist" desc="Restrict admin access to trusted IPs"><Toggle /></SettingRow>
            <SettingRow label="Audit Logging" desc="Log all platform actions"><Toggle defaultOn /></SettingRow>
          </div>
        </div>

        {/* Notifications */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Bell size={13} className="text-fanos-amber" />Notifications</div>
          </div>
          <div className="px-4 pb-2">
            <SettingRow label="Email Alerts" desc="Send email on critical events"><Toggle defaultOn /></SettingRow>
            <SettingRow label="SMS Alerts" desc="Send SMS for critical security events"><Toggle defaultOn /></SettingRow>
            <SettingRow label="Approval Reminders" desc="Remind approvers of pending items"><Toggle defaultOn /></SettingRow>
            <SettingRow label="Digest Reports" desc="Daily summary emails to admins"><Toggle /></SettingRow>
          </div>
        </div>

        {/* AI Engine */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Cpu size={13} className="text-fanos-accent" />AI Engine</div>
          </div>
          <div className="px-4 pb-2">
            <SettingRow label="Confidence Threshold" desc="Minimum AI confidence for detection"><TextInput defaultValue="75%" /></SettingRow>
            <SettingRow label="Auto-Block High Risk" desc="Automatically block risk score ≥ 90"><Toggle defaultOn /></SettingRow>
            <SettingRow label="Simulation Mode" desc="Use simulated AI predictions (no model)"><Toggle /></SettingRow>
            <SettingRow label="Model Auto-Update" desc="Auto-update AI model when new version available"><Toggle defaultOn /></SettingRow>
          </div>
        </div>

        {/* Email */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Mail size={13} className="text-fanos-accent" />Email / SMTP</div>
          </div>
          <div className="px-4 pb-2">
            <SettingRow label="SMTP Host"><TextInput defaultValue="smtp.sendgrid.net" /></SettingRow>
            <SettingRow label="SMTP Port"><TextInput defaultValue="587" /></SettingRow>
            <SettingRow label="From Address"><TextInput defaultValue="noreply@fanos.ai" /></SettingRow>
            <SettingRow label="TLS Encryption" desc="Use TLS for SMTP"><Toggle defaultOn /></SettingRow>
          </div>
        </div>

        {/* Data */}
        <div className="fanos-card">
          <div className="fanos-panel-header">
            <div className="fanos-panel-title"><Database size={13} className="text-fanos-accent" />Data & Retention</div>
          </div>
          <div className="px-4 pb-2">
            <SettingRow label="Event Retention" desc="How long to keep security events"><TextInput defaultValue="90 days" /></SettingRow>
            <SettingRow label="Audit Log Retention" desc="Audit log storage duration"><TextInput defaultValue="365 days" /></SettingRow>
            <SettingRow label="Auto Backup" desc="Daily automated database backups"><Toggle defaultOn /></SettingRow>
            <SettingRow label="Backup Location"><TextInput defaultValue="s3://fanos-backups" /></SettingRow>
          </div>
        </div>

      </div>
    </PageShell>
  )
}
