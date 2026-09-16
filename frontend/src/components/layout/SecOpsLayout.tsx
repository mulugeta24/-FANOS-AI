/**
 * SecOpsLayout — shell for the Security Operations workspace.
 * Wraps all /secops/* routes.
 */
import { Outlet } from 'react-router-dom'
import SecOpsSidebar from './SecOpsSidebar'
import SecOpsHeader  from './SecOpsHeader'

export default function SecOpsLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-fanos-bg">
      <SecOpsSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <SecOpsHeader />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
