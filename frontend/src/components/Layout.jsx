import { Outlet } from 'react-router-dom'
import { usePolling } from '../hooks/usePolling'
import { api } from '../services/api'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout() {
  // Shared poll feeds the sidebar alert badge and system-status block
  const { data, error } = usePolling(api.dashboard, 5000)
  return (
    <div className="flex min-h-screen">
      <Sidebar data={data} error={error} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header error={error} />
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-6 py-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
