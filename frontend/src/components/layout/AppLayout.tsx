import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ConnectionBanner from './ConnectionBanner'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#060911] text-fanos-text relative cyber-grid-bg">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 w-[600px] h-[600px] rounded-full bg-sky-500/[0.03] blur-[120px]" />

      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ConnectionBanner />
    </div>
  )
}
