/**
 * RequireAuth — wraps protected route groups.
 * Validates JWT token existence and expiration. If missing, malformed,
 * or expired, clears auth state and redirects to /login.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'

function isTokenValid(token: string | null): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(base64))
    if (decoded.exp && typeof decoded.exp === 'number') {
      // exp is in seconds, Date.now() is in milliseconds
      if (decoded.exp * 1000 <= Date.now()) {
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

export default function RequireAuth() {
  const location = useLocation()
  const token    = localStorage.getItem('fanos_token')

  if (!isTokenValid(token)) {
    localStorage.removeItem('fanos_token')
    localStorage.removeItem('fanos_user')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

