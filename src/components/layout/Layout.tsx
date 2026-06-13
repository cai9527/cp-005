import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCraneStore } from '@/stores/craneStore'
import { useAlertStore } from '@/stores/alertStore'

export default function Layout() {
  useWebSocket()

  const fetchCranes = useCraneStore((s) => s.fetchCranes)
  const fetchCraneStats = useCraneStore((s) => s.fetchCraneStats)
  const fetchLatestSensorData = useCraneStore((s) => s.fetchLatestSensorData)
  const fetchActiveAlerts = useAlertStore((s) => s.fetchActiveAlerts)
  const fetchAlertStats = useAlertStore((s) => s.fetchAlertStats)

  useEffect(() => {
    fetchCranes()
    fetchCraneStats()
    fetchLatestSensorData()
    fetchActiveAlerts()
    fetchAlertStats()
  }, [fetchCranes, fetchCraneStats, fetchLatestSensorData, fetchActiveAlerts, fetchAlertStats])

  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto bg-bg-primary grid-bg p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
