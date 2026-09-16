/**
 * WorkspaceContext — tracks which FANOS workspace is active.
 *
 * Workspaces:
 *   'customer-soc'  — Customer SOC dashboard (/)
 *   'admin-portal'  — Admin Portal (/admin-portal/*)
 *   'secops'        — Security Operations (/secops/*)
 *
 * The current workspace is derived from the URL path on first load,
 * then kept in React state so the WorkspaceSwitcher can update it
 * without a full page reload.
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
}

interface WorkspaceContextValue {
  workspace:    Workspace
  user:         WorkspaceUser
  switchTo:     (ws: Workspace) => void
  canAccess:    (ws: Workspace) => boolean
}

// ── Default user (shown when no token is present) ─────────────
const GUEST_USER: WorkspaceUser = {
  username:  'guest',
  full_name: 'Guest User',
  email:     '',
  role:      'customer',
}

// ── Helpers ───────────────────────────────────────────────────
function readUserFromStorage(): WorkspaceUser {
  try {
    const raw = localStorage.getItem('fanos_user')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceUser>
      if (parsed.username && parsed.role) return parsed as WorkspaceUser
    }
    // Fall back to token-derived data if available
    const token = localStorage.getItem('fanos_token')
    if (token) {
      // JWT payload is the second segment
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload?.sub) {
        return {
          username:  payload.sub,
          full_name: payload.full_name ?? payload.sub,
          email:     payload.email ?? '',
          role:      (payload.role as UserRole) ?? 'customer',
        }
      }
    }
  } catch {
    // ignore parse errors
  }
  return GUEST_USER
}

function workspaceFromPath(pathname: string): Workspace {
  if (pathname.startsWith('/admin-portal')) return 'admin-portal'
  if (pathname.startsWith('/secops'))       return 'secops'
  return 'customer-soc'
}

// ── Default landing path per workspace ────────────────────────
export const WORKSPACE_HOME: Record<Workspace, string> = {
  'customer-soc': '/dashboard',
  'admin-portal': '/admin-portal/overview',
  'secops':       '/secops/overview',
}

// ── RBAC — which roles can access which workspace ─────────────
const WORKSPACE_ROLES: Record<Workspace, UserRole[]> = {
  'customer-soc': ['admin', 'analyst', 'customer'],
  'admin-portal': ['admin'],
  'secops':       ['admin', 'analyst'],
}

// ── Context ───────────────────────────────────────────────────
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [user]      = useState<WorkspaceUser>(readUserFromStorage)
  const [workspace, setWorkspace] = useState<Workspace>(
    () => workspaceFromPath(location.pathname),
  )

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
    <WorkspaceContext.Provider value={{ workspace, user, switchTo, canAccess }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
