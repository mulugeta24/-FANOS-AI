/**
 * AdminLayout — shell for the Admin Portal workspace.
 * Wraps all /admin-portal/* routes.
 */
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminHeader  from './AdminHeader'

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-fanos-bg">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
