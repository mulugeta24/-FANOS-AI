/**
 * WorkspaceContext — tracks which FANOS workspace is active and multi-customer tenancy.
 *
 * Workspaces:
 *   'customer-soc'  — Customer SOC dashboard (/)
 *   'admin-portal'  — Admin Portal (/admin-portal/*)
 *   'secops'        — Security Operations (/secops/*)
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ── Types ──────────────────────────────────────────────────────
export type Workspace = 'customer-soc' | 'admin-portal' | 'secops'

export type UserRole = 'admin' | 'analyst' | 'customer'

export interface WorkspaceUser {
  username:  string
  full_name: string
  email:     string
  role:      UserRole
  organization?: string
}

export interface CustomerTenant {
  id: string
  name: string
  organization: string
  domain: string
  primaryAsset: string
  ipAddress: string
  approvedServices: string[] // e.g. ['waf'], ['ids'], ['scanner'], ['url-detection']
  pendingServices: string[]
  lastRequestId?: string
  createdDate: string
}

export const INITIAL_CUSTOMERS: CustomerTenant[] = [
  {
    id: 'cust-abyssinia',
    name: 'Bank of Abyssinia',
    organization: 'Bank of Abyssinia SC',
    domain: 'ebank.bankofabyssinia.com',
    primaryAsset: 'Core Internet Banking Gateway',
    ipAddress: '127.0.0.1:8002',
    approvedServices: [],
    pendingServices: ['waf'],
    lastRequestId: 'REQ-WAF-2026-C97CE9',
    createdDate: '2026-10-24',
  },
  {
    id: 'cust-ethiopian-air',
    name: 'Ethiopian Airlines',
    organization: 'Ethiopian Airlines Group',
    domain: 'flightops.ethiopianairlines.com',
    primaryAsset: 'Flight Operations & Datacenter Core',
    ipAddress: '10.200.0.0/16',
    approvedServices: ['ids'],
    pendingServices: [],
    lastRequestId: 'REQ-IDS-2026-A1098F',
    createdDate: '2026-09-20',
  },
  {
    id: 'cust-telebirr',
    name: 'Telebirr Enterprise',
    organization: 'Ethio Telecom',
    domain: 'telebirr.et',
    primaryAsset: 'Fintech Payment Gateway & Web Portal',
    ipAddress: '197.156.64.12:8002',
    approvedServices: ['waf', 'url-detection'],
    pendingServices: [],
    lastRequestId: 'REQ-WAF-2026-F44201',
    createdDate: '2026-10-01',
  },
  {
    id: 'cust-cbe',
    name: 'Commercial Bank of Ethiopia',
    organization: 'Commercial Bank of Ethiopia',
    domain: 'cbe.com.et',
    primaryAsset: 'Enterprise Banking & Internal Systems',
    ipAddress: '196.189.88.22',
    approvedServices: ['waf', 'ids', 'scanner'],
    pendingServices: [],
    lastRequestId: 'REQ-ALL-2026-88B12C',
    createdDate: '2026-08-10',
  },
  {
    id: 'cust-zemen',
    name: 'Zemen Bank',
    organization: 'Zemen Bank SC',
    domain: 'digital.zemenbank.com',
    primaryAsset: 'Digital Banking Platform',
    ipAddress: '196.188.54.10:8002',
    approvedServices: [],
    pendingServices: ['waf'],
    lastRequestId: 'REQ-WAF-2026-Z77102',
    createdDate: '2026-10-24',
  },
]

interface WorkspaceContextValue {
  workspace:       Workspace
  user:            WorkspaceUser
  activeCustomer:  CustomerTenant
  customers:       CustomerTenant[]
  switchCustomer:  (id: string) => void
  hasService:      (serviceId: string) => boolean
  approveCustomerService: (customerId: string, serviceId: string) => void
  rejectCustomerService:  (customerId: string, serviceId: string) => void
  requestCustomerService: (customerId: string, serviceIds: string[], assetInfo?: any) => void
  switchTo:        (ws: Workspace) => void
  canAccess:       (ws: Workspace) => boolean
}

// ── Default user (shown when no token is present) ─────────────
const GUEST_USER: WorkspaceUser = {
  username:  'guest',
  full_name: 'Guest User',
  email:     '',
  role:      'customer',
  organization: 'Customer SOC',
}

// ── Helpers ───────────────────────────────────────────────────
function readUserFromStorage(): WorkspaceUser {
  try {
    const raw = localStorage.getItem('fanos_user')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceUser>
      if (parsed.username && parsed.role) return parsed as WorkspaceUser
    }
    const token = localStorage.getItem('fanos_token')
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload?.sub) {
        return {
          username:  payload.sub,
          full_name: payload.full_name ?? payload.sub,
          email:     payload.email ?? '',
          role:      (payload.role as UserRole) ?? 'customer',
          organization: payload.organization || 'Customer SOC',
        }
      }
    }
  } catch {
    // ignore
  }
  return GUEST_USER
}

function workspaceFromPath(pathname: string): Workspace {
  if (pathname.startsWith('/admin-portal')) return 'admin-portal'
  if (pathname.startsWith('/secops'))       return 'secops'
  return 'customer-soc'
}

export const WORKSPACE_HOME: Record<Workspace, string> = {
  'customer-soc': '/dashboard',
  'admin-portal': '/admin-portal/overview',
  'secops':       '/secops/overview',
}

const WORKSPACE_ROLES: Record<Workspace, UserRole[]> = {
  'customer-soc': ['admin', 'analyst', 'customer'],
  'admin-portal': ['admin'],
  'secops':       ['admin', 'analyst'],
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [user, setUser] = useState<WorkspaceUser>(readUserFromStorage)
  const [workspace, setWorkspace] = useState<Workspace>(
    () => workspaceFromPath(location.pathname),
  )

  useEffect(() => {
    const handleStorage = () => {
      setUser(readUserFromStorage())
    }
    window.addEventListener('storage', handleStorage)
    handleStorage()
    return () => window.removeEventListener('storage', handleStorage)
  }, [location.pathname])

  // Multi-Customer State
  const [customers, setCustomers] = useState<CustomerTenant[]>(() => {
    try {
      const saved = localStorage.getItem('fanos_customers_registry')
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return INITIAL_CUSTOMERS
  })

  const [activeCustomerId, setActiveCustomerId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fanos_active_customer_id')
      if (saved && INITIAL_CUSTOMERS.some(c => c.id === saved)) return saved
      const u = localStorage.getItem('fanos_user')
      if (u) {
        const pu = JSON.parse(u)
        if (pu.username?.toLowerCase().includes('azanaw') || pu.full_name?.toLowerCase().includes('azanaw')) {
          return 'cust-ethiopian-air'
        }
      }
    } catch {
      // ignore
    }
    return 'cust-ethiopian-air'
  })


  useEffect(() => {
    try {
      localStorage.setItem('fanos_customers_registry', JSON.stringify(customers))
    } catch {
      // ignore
    }
  }, [customers])

  useEffect(() => {
    try {
      localStorage.setItem('fanos_active_customer_id', activeCustomerId)
    } catch {
      // ignore
    }
  }, [activeCustomerId])

  const activeCustomer = customers.find(c => c.id === activeCustomerId) || customers[0]

  const switchCustomer = useCallback((id: string) => {
    if (customers.some(c => c.id === id)) {
      setActiveCustomerId(id)
    }
  }, [customers])

  const hasService = useCallback((serviceId: string): boolean => {
    const norm = serviceId.toLowerCase().trim()
    return activeCustomer.approvedServices.some(s => {
      const sn = s.toLowerCase().trim()
      return sn === norm || (norm === 'waf' && sn.includes('waf')) || (norm === 'ids' && sn.includes('ids'))
    })
  }, [activeCustomer])

  const approveCustomerService = useCallback((customerId: string, serviceId: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      const norm = serviceId.toLowerCase().trim()
      const newApproved = Array.from(new Set([...c.approvedServices, norm]))
      const newPending = c.pendingServices.filter(s => s.toLowerCase().trim() !== norm)
      return { ...c, approvedServices: newApproved, pendingServices: newPending }
    }))
  }, [])

  const rejectCustomerService = useCallback((customerId: string, serviceId: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      const norm = serviceId.toLowerCase().trim()
      const newPending = c.pendingServices.filter(s => s.toLowerCase().trim() !== norm)
      return { ...c, pendingServices: newPending }
    }))
  }, [])

  const requestCustomerService = useCallback((customerIdOrOrg: string, serviceIds: string[], assetInfo?: any) => {
    const normList = serviceIds.map(s => s.toLowerCase().trim())
    const reqId = assetInfo?.requestId || (assetInfo?.requestNumbers && assetInfo.requestNumbers[0]) || `REQ-WAF-2026-${Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()}`

    let targetId = ''

    setCustomers(prev => {
      const match = prev.find(c => 
        c.id === customerIdOrOrg ||
        c.name.toLowerCase() === customerIdOrOrg.toLowerCase() ||
        c.organization.toLowerCase() === customerIdOrOrg.toLowerCase()
      )

      if (match) {
        targetId = match.id
        return prev.map(c => {
          if (c.id !== match.id) return c
          const newPending = Array.from(new Set([...c.pendingServices, ...normList]))
          // Any newly requested service must be strictly pending until admin approval
          const newApproved = c.approvedServices.filter(s => !normList.includes(s.toLowerCase().trim()))
          return {
            ...c,
            approvedServices: newApproved,
            pendingServices: newPending,
            lastRequestId: reqId,
            domain: assetInfo?.domain || c.domain,
            primaryAsset: assetInfo?.assetName || c.primaryAsset,
            ipAddress: assetInfo?.ipAddress ? `${assetInfo.ipAddress}:${assetInfo.port || '8002'}` : c.ipAddress,
          }
        })
      } else {
        const cleanName = assetInfo?.company || customerIdOrOrg
        targetId = `cust-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`
        const newCustomer: CustomerTenant = {
          id: targetId,
          name: cleanName,
          organization: cleanName,
          domain: assetInfo?.domain || 'secure.enterprise-portal.com',
          primaryAsset: assetInfo?.assetName || 'Core Enterprise Asset',
          ipAddress: assetInfo?.ipAddress ? `${assetInfo.ipAddress}:${assetInfo.port || '8002'}` : '127.0.0.1:8002',
          approvedServices: [],
          pendingServices: normList,
          lastRequestId: reqId,
          createdDate: new Date().toISOString().split('T')[0],
        }
        return [...prev, newCustomer]
      }
    })

    if (targetId) {
      setActiveCustomerId(targetId)
      try {
        localStorage.setItem('fanos_active_customer_id', targetId)
        localStorage.setItem('fanos_pending_request', JSON.stringify({
          requestId: reqId,
          company: assetInfo?.company || customerIdOrOrg,
          services: normList,
          assetName: assetInfo?.assetName,
          domain: assetInfo?.domain,
          ipAddress: assetInfo?.ipAddress,
          timestamp: new Date().toISOString(),
          status: 'Pending',
        }))
      } catch {
        // ignore
      }
    }
  }, [])

  // Keep workspace in sync when the user navigates directly via URL
  useEffect(() => {
    setWorkspace(workspaceFromPath(location.pathname))
  }, [location.pathname])

  const canAccess = useCallback(
    (ws: Workspace) => WORKSPACE_ROLES[ws].includes(user.role),
    [user.role],
  )

  const switchTo = useCallback(
    (ws: Workspace) => {
      if (!canAccess(ws)) return
      setWorkspace(ws)
      navigate(WORKSPACE_HOME[ws])
    },
    [canAccess, navigate],
  )

  return (
    <WorkspaceContext.Provider value={{
      workspace,
      user,
      activeCustomer,
      customers,
      switchCustomer,
      hasService,
      approveCustomerService,
      rejectCustomerService,
      requestCustomerService,
      switchTo,
      canAccess,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}

