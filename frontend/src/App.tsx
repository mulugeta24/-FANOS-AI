import { Routes, Route, Navigate } from 'react-router-dom'

// ── Layouts ───────────────────────────────────────────────────
import AppLayout          from '@/components/layout/AppLayout'
import AdminLayout        from '@/components/layout/AdminLayout'
import SecOpsLayout       from '@/components/layout/SecOpsLayout'
import RequireAuth        from '@/components/layout/RequireAuth'

// ── Public pages ──────────────────────────────────────────────
import Dashboard          from '@/pages/Dashboard'
import LandingPage        from '@/pages/LandingPage'
import AboutPage          from '@/pages/AboutPage'
import ContactPage        from '@/pages/ContactPage'
import IntelligencePage   from '@/pages/IntelligencePage'
import RequestServicePage from '@/pages/RequestServicePage'
import RegisterPage       from '@/pages/RegisterPage'
import LoginPage          from '@/pages/LoginPage'
import LoginHelpPage      from '@/pages/LoginHelpPage'
import SecurityGuidesPage from '@/pages/SecurityGuidesPage'

// ── Customer SOC — Detection ──────────────────────────────────
import NetworkIDS         from '@/pages/detection/NetworkIDS'
import WebAttackDetection from '@/pages/detection/WebAttackDetection'
import SystemDetection    from '@/pages/detection/SystemDetection'
import DetectionEvents    from '@/pages/detection/DetectionEvents'

// ── Customer SOC — Prevention ─────────────────────────────────
import BlockedIPs         from '@/pages/prevention/BlockedIPs'

// ── Customer SOC — SOC ────────────────────────────────────────
import Alerts             from '@/pages/soc/Alerts'
import Threats            from '@/pages/soc/Threats'
import Incidents          from '@/pages/soc/Incidents'

// ── Customer SOC — AI ─────────────────────────────────────────
import AIEngine           from '@/pages/ai/AIEngine'

// ── Customer SOC — Infrastructure ────────────────────────────
import Sensors            from '@/pages/infrastructure/Sensors'

// ── Customer SOC — Legacy admin ───────────────────────────────
import Users              from '@/pages/admin/Users'
import AuditLogs          from '@/pages/admin/AuditLogs'
import SmsDashboard       from '@/pages/admin/sms/SmsDashboard'
import SmsSettings        from '@/pages/admin/sms/SmsSettings'

// ── Admin Portal pages ────────────────────────────────────────
import AdminOverview      from '@/pages/admin-portal/Overview'
import AdminOrganizations from '@/pages/admin-portal/Organizations'
import AdminCustomers     from '@/pages/admin-portal/Customers'
import AdminUsersRoles    from '@/pages/admin-portal/UsersRoles'
import AdminRequests      from '@/pages/admin-portal/ServiceRequests'
import AdminApprovals     from '@/pages/admin-portal/Approvals'
import AdminDeployments   from '@/pages/admin-portal/Deployments'
import AdminAuditLogs     from '@/pages/admin-portal/AuditLogs'
import AdminSettings      from '@/pages/admin-portal/SystemSettings'
import AdminPlaceholder   from '@/pages/admin-portal/AdminPlaceholder'

// ── Security Operations pages ─────────────────────────────────
import SecOpsOverview     from '@/pages/secops/Overview'
import SecOpsAlerts       from '@/pages/secops/Alerts'
import SecOpsIncidents    from '@/pages/secops/Incidents'
import Investigations     from '@/pages/secops/Investigations'
import SecurityEvents     from '@/pages/secops/SecurityEvents'
import ZeekPage           from '@/pages/secops/network/ZeekPage'
import SuricataPage       from '@/pages/secops/network/SuricataPage'
import WAFPage            from '@/pages/secops/web/WAFPage'
import ThreatIntelligence from '@/pages/secops/ThreatIntelligence'
import SecOpsAssets       from '@/pages/secops/Assets'
import SecurityReports    from '@/pages/secops/SecurityReports'

// ── Generic placeholder ───────────────────────────────────────
import Placeholder        from '@/pages/Placeholder'
import PortalSelectPage   from '@/pages/PortalSelectPage'

export default function App() {
  return (
    <Routes>
      {/* ══════════════════════════════════════════════════════
          PUBLIC — no layout
         ══════════════════════════════════════════════════════ */}
      {/* Root → landing page */}
      <Route index                   element={<Navigate to="/home" replace />} />
      <Route path="/home"            element={<LandingPage />} />
      <Route path="/about"           element={<AboutPage />} />
      <Route path="/contact"         element={<ContactPage />} />
      <Route path="/intelligence"    element={<IntelligencePage />} />
      <Route path="/security-guides" element={<SecurityGuidesPage />} />
      <Route path="/request-service" element={<RequestServicePage />} />

      {/* ── Authentication ──────────────────────────────── */}
      <Route path="/portal-login"    element={<PortalSelectPage />} />
      <Route path="/support-center"  element={<ContactPage />} />
      <Route path="/register"        element={<RegisterPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/login-help"      element={<LoginHelpPage />} />

      {/* ══════════════════════════════════════════════════════
          PROTECTED — all workspaces require a valid token
         ══════════════════════════════════════════════════════ */}
      <Route element={<RequireAuth />}>

        {/* ── ADMIN PORTAL workspace  (/admin-portal/*) ──── */}
        <Route element={<AdminLayout />}>
        <Route path="/admin-portal"             element={<Navigate to="/admin-portal/overview" replace />} />
        <Route path="/admin-portal/overview"    element={<AdminOverview />} />
        <Route path="/admin-portal/organizations" element={<AdminOrganizations />} />
        <Route path="/admin-portal/customers"   element={<AdminCustomers />} />
        <Route path="/admin-portal/requests"    element={<AdminRequests />} />
        <Route path="/admin-portal/approvals"   element={<AdminApprovals />} />
        <Route path="/admin-portal/assets"      element={<AdminPlaceholder title="Assets" desc="Manage platform assets and hardware inventory." icon="Package" color="blue" />} />
        <Route path="/admin-portal/deployments" element={<AdminDeployments />} />
        <Route path="/admin-portal/services"    element={<AdminPlaceholder title="Services" desc="Manage platform services and their health." icon="Layers" color="blue" />} />
        <Route path="/admin-portal/integrations" element={<AdminPlaceholder title="Integrations" desc="Configure third-party integrations and connectors." icon="Plug" color="green" />} />
        <Route path="/admin-portal/users"       element={<AdminUsersRoles />} />
        <Route path="/admin-portal/audit"       element={<AdminAuditLogs />} />
        <Route path="/admin-portal/settings"    element={<AdminSettings />} />
      </Route>

      {/* ══════════════════════════════════════════════════════
          SECURITY OPERATIONS workspace  (/secops/*)
          Security monitoring & response — SecOpsLayout
         ══════════════════════════════════════════════════════ */}
      <Route element={<SecOpsLayout />}>
        <Route path="/secops"                   element={<Navigate to="/secops/overview" replace />} />
        <Route path="/secops/overview"          element={<SecOpsOverview />} />
        <Route path="/secops/alerts"            element={<SecOpsAlerts />} />
        <Route path="/secops/incidents"         element={<SecOpsIncidents />} />
        <Route path="/secops/investigations"    element={<Investigations />} />
        <Route path="/secops/events"            element={<SecurityEvents />} />
        {/* Network Security — Zeek + Suricata */}
        <Route path="/secops/network/zeek"      element={<ZeekPage />} />
        <Route path="/secops/network/suricata"  element={<SuricataPage />} />
        {/* Web Security — WAF */}
        <Route path="/secops/web/waf"           element={<WAFPage />} />
        {/* Intelligence + Assets + Reports */}
        <Route path="/secops/threat-intel"      element={<ThreatIntelligence />} />
        <Route path="/secops/assets"            element={<SecOpsAssets />} />
        <Route path="/secops/reports"           element={<SecurityReports />} />
      </Route>

      {/* ══════════════════════════════════════════════════════
          CUSTOMER SOC workspace  (existing AppLayout — UNCHANGED)
          All existing routes preserved exactly as before.
         ══════════════════════════════════════════════════════ */}
      <Route element={<AppLayout />}>
        {/* ── Overview ─────────────────────────── */}
        <Route path="/dashboard"  element={<Dashboard />} />

        {/* ── Detection ────────────────────────── */}
        <Route path="/detection/network"     element={<NetworkIDS />} />
        <Route path="/detection/web"         element={<WebAttackDetection />} />
        <Route path="/detection/system"      element={<SystemDetection />} />
        <Route path="/detection/endpoint"    element={<Placeholder title="Endpoint Detection"    icon="Cpu"      color="blue"   desc="AI-powered endpoint detection using Wazuh agents. Detects malware, rootkits, lateral movement, and suspicious process activity." />} />
        <Route path="/detection/identity"    element={<Placeholder title="Identity Detection"   icon="User"     color="purple" desc="Detect credential attacks, account takeovers, privilege escalation, and anomalous identity behavior across all user accounts." />} />
        <Route path="/detection/cloud"       element={<Placeholder title="Cloud Detection"      icon="Cloud"    color="blue"   desc="Monitor cloud workloads across AWS, Azure, and GCP. Detect misconfigurations, unauthorized access, and cloud-native threats." />} />
        <Route path="/detection/malware"     element={<Placeholder title="Malware Detection"    icon="Skull"    color="red"    desc="Real-time malware detection using AI signature and behavior analysis. Covers trojans, worms, RATs, and advanced persistent threats." />} />
        <Route path="/detection/ransomware"  element={<Placeholder title="Ransomware Detection" icon="Lock"     color="red"    desc="Behavioral ransomware detection — identifies file encryption patterns, shadow copy deletion, and ransom note creation in real time." />} />
        <Route path="/detection/phishing"    element={<Placeholder title="Phishing Detection"   icon="Mail"     color="orange" desc="AI email and URL phishing detection. Analyzes headers, links, and payload to identify spear-phishing and business email compromise." />} />
        <Route path="/detection/bots"        element={<Placeholder title="Bot Detection"        icon="Bot"      color="purple" desc="Detect automated bot traffic, credential stuffing, web scraping, and DDoS bot networks using behavioral fingerprinting." />} />
        <Route path="/detection/bruteforce"  element={<Placeholder title="Brute Force Detection" icon="KeyRound" color="orange" desc="Monitor and detect brute force attacks across SSH, RDP, web login forms, and API authentication endpoints." />} />
        <Route path="/detection/rules"       element={<Placeholder title="Detection Rules"      icon="Filter"   color="purple" desc="Manage and tune FANOS AI detection rules, Suricata signatures, and custom rule sets." />} />
        <Route path="/detection/events"      element={<DetectionEvents />} />

        {/* ── Prevention ───────────────────────── */}
        <Route path="/prevention/blocking"  element={<Placeholder title="Active Blocking"      icon="Shield"      color="green"  desc="Real-time threat blocking across network, web, and host layers with automated prevention engine." />} />
        <Route path="/prevention/ips"       element={<BlockedIPs />} />
        <Route path="/prevention/sessions"  element={<Placeholder title="Blocked Sessions"     icon="WifiOff"     color="orange" desc="Active session blocks applied by the FANOS AI response engine for brute force and session hijack attempts." />} />
        <Route path="/prevention/waf"       element={<Placeholder title="WAF Protection"       icon="ShieldCheck" color="blue"   desc="ModSecurity Web Application Firewall rules, triggers, and bypass attempts. OWASP CRS integration." />} />
        <Route path="/prevention/isolation" element={<Placeholder title="Endpoint Isolation"   icon="Shield"      color="red"    desc="Isolated endpoints quarantined by FANOS AI automated response. View isolation status, reason, and re-join approvals." />} />
        <Route path="/prevention/rules"     element={<Placeholder title="Prevention Rules"     icon="List"        color="purple" desc="Configure automated response rules: IP block thresholds, rate limiting, geo-blocking policies." />} />
        <Route path="/response/playbooks"   element={<Placeholder title="Response Playbooks"   icon="BookOpen"    color="blue"   desc="Configure and manage automated incident response playbooks. Define trigger conditions, action sequences, and escalation paths." />} />
        <Route path="/response/history"     element={<Placeholder title="Response History"     icon="History"     color="blue"   desc="Complete history of all automated and manual prevention actions taken by the FANOS AI platform." />} />
        <Route path="/prevention/history"   element={<Placeholder title="Response History"     icon="History"     color="blue"   desc="Complete history of all automated and manual prevention actions taken by the FANOS AI platform." />} />

        {/* ── SOC ──────────────────────────────── */}
        <Route path="/soc/alerts"       element={<Alerts />} />
        <Route path="/soc/threats"      element={<Threats />} />
        <Route path="/soc/incidents"    element={<Incidents />} />
        <Route path="/soc/timeline"     element={<Placeholder title="Threat Timeline"     icon="GitBranch" color="purple" desc="Chronological visualization of all threat events, incidents, and response actions across the kill chain." />} />
        <Route path="/soc/correlation"  element={<Placeholder title="Threat Correlation"  icon="Network"   color="red"    desc="AI-powered correlation engine linking related events into attack campaigns with kill chain mapping." />} />

        {/* ── Web Security ─────────────────────── */}
        <Route path="/web/assessment"  element={<Placeholder title="URI Assessment"    icon="Link2"     color="blue"   desc="Analyze authorized web application endpoints for suspicious activity, vulnerabilities, and security findings." />} />
        <Route path="/web/requests"    element={<Placeholder title="Web Requests"      icon="Globe"     color="green"  desc="Full web request log with attack classification, payload inspection, and WAF decision for each request." />} />
        <Route path="/web/findings"    element={<Placeholder title="Security Findings" icon="Search"    color="orange" desc="Confirmed security vulnerabilities and findings discovered by FANOS AI across your web applications." />} />
        <Route path="/web/analytics"   element={<Placeholder title="Web Analytics"     icon="BarChart2" color="blue"   desc="Traffic analytics, attack trend visualization, and threat intelligence for web application security." />} />

        {/* ── AI Intelligence ──────────────────── */}
        <Route path="/ai/engine"      element={<AIEngine />} />
        <Route path="/ai/predictions" element={<Placeholder title="AI Predictions"    icon="BrainCircuit" color="purple" desc="Real-time AI model predictions with confidence scores, feature importance, and explainability reports." />} />
        <Route path="/ai/performance" element={<Placeholder title="Model Performance" icon="Activity"     color="blue"   desc="Ongoing model evaluation metrics, drift detection, confusion matrix, and ROC curve visualization." />} />
        <Route path="/ai/registry"    element={<Placeholder title="Model Registry"    icon="List"         color="green"  desc="Versioned model registry with deployment history, rollback capability, and A/B testing framework." />} />
        <Route path="/ai/nas"         element={<Placeholder title="NAS Lab"           icon="FlaskConical" color="purple" desc="Neural Architecture Search laboratory for experimenting with new model architectures and hyperparameters." />} />

        {/* ── Infrastructure ───────────────────── */}
        <Route path="/infra/sensors"     element={<Sensors />} />
        <Route path="/infra/network"     element={<Placeholder title="Network"      icon="Network"   color="blue"   desc="Network topology, monitored segments, traffic flows, and asset discovery across your infrastructure." />} />
        <Route path="/infra/hosts"       element={<Placeholder title="Hosts"        icon="Server"    color="green"  desc="Monitored hosts inventory, Wazuh agent status, vulnerability scan results, and host risk scores." />} />
        <Route path="/infra/datasources" element={<Placeholder title="Data Sources" icon="Database"  color="purple" desc="Configured log sources, collection pipelines, parsing rules, and ingestion health for all data feeds." />} />

        {/* ── Analytics ────────────────────────── */}
        <Route path="/analytics/security" element={<Placeholder title="Security Analytics" icon="LineChart"  color="blue"   desc="Advanced security analytics dashboards with MTTR, detection coverage, and risk trend analysis." />} />
        <Route path="/analytics/trends"   element={<Placeholder title="Attack Trends"      icon="TrendingUp" color="orange" desc="Historical attack trend analysis, seasonal patterns, and predictive threat forecasting." />} />
        <Route path="/analytics/ai"       element={<Placeholder title="AI Performance"     icon="AreaChart"  color="purple" desc="AI model performance analytics over time, accuracy drift, and retraining recommendations." />} />
        <Route path="/analytics/reports"  element={<Placeholder title="Reports"            icon="FileText"   color="green"  desc="Generate and schedule executive, compliance, and technical security reports in PDF and CSV formats." />} />

        {/* ── Analysis ─────────────────────────── */}
        <Route path="/analysis/mitre"  element={<Placeholder title="MITRE ATT&CK"        icon="Target"    color="purple" desc="Interactive MITRE ATT&CK navigator showing technique coverage, active detections, and mapped incidents across the full kill chain." />} />

        {/* ── Management ───────────────────────── */}
        <Route path="/infra/hosts"       element={<Placeholder title="Assets"             icon="Package"   color="blue"   desc="Complete asset inventory with risk scores, patch status, and agent coverage for all monitored hosts and network devices." />} />
        <Route path="/infra/datasources" element={<Placeholder title="Integrations"       icon="Plug"      color="green"  desc="Configured log sources, collection pipelines, parsing rules, and ingestion health for all data feeds." />} />

        {/* ── Administration ───────────────────── */}
        <Route path="/admin/orgs"     element={<Placeholder title="Organizations"       icon="Building2" color="blue"   desc="Multi-tenant organization management for MSSP deployments. Configure per-tenant isolation, policies, and reporting." />} />
        <Route path="/admin/users"    element={<Users />} />
        <Route path="/admin/roles"    element={<Placeholder title="Teams & Roles"        icon="UserCog"   color="blue"   desc="Configure role-based access control, team assignments, and least-privilege policies for all platform users." />} />
        <Route path="/admin/audit"    element={<AuditLogs />} />
        <Route path="/admin/api-keys" element={<Placeholder title="API Keys"             icon="Key"       color="purple" desc="Manage API keys for external integrations, SIEM connectors, and programmatic platform access." />} />
        <Route path="/admin/settings" element={<Placeholder title="System Settings"      icon="Settings"  color="green"  desc="Platform configuration: notification channels, retention policies, integrations, and system preferences." />} />
        <Route path="/admin/sms"          element={<SmsDashboard />} />
        <Route path="/admin/sms/settings" element={<SmsSettings />} />

        {/* Fallback inside protected zone → home */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>

      </Route>{/* end RequireAuth */}
    </Routes>
  )
}
