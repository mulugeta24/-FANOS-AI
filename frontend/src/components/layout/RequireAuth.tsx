/**
 * RequireAuth — wraps protected route groups.
 * If no fanos_token is present in localStorage the user is
 * redirected to /login.  The original URL is saved in state
 * so the login page can send them back after authentication.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function RequireAuth() {
  const location = useLocation()
  const token    = localStorage.getItem('fanos_token')

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
