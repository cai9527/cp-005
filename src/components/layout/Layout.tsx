import { useEffect, useCallback, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCraneStore } from '@/stores/craneStore'
import { useAlertStore } from '@/stores/alertStore'
import { useUIStore, SIDEBAR_WIDTHS } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export default function Layout() {
  useWebSocket()

  const fetchCranes = useCraneStore((s) => s.fetchCranes)
  const fetchCraneStats = useCraneStore((s) => s.fetchCraneStats)
  const fetchLatestSensorData = useCraneStore((s) => s.fetchLatestSensorData)
  const fetchActiveAlerts = useAlertStore((s) => s.fetchActiveAlerts)
  const fetchAlertStats = useAlertStore((s) => s.fetchAlertStats)

  const sidebarWidthMode = useUIStore((s) => s.sidebarWidthMode)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const zoomLevel = useUIStore((s) => s.zoomLevel)
  const syncZoom = useUIStore((s) => s.syncZoom)
  const zoomIn = useUIStore((s) => s.zoomIn)
  const zoomOut = useUIStore((s) => s.zoomOut)
  const resetZoom = useUIStore((s) => s.resetZoom)
  const mainRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const sidebarWidth = SIDEBAR_WIDTHS[sidebarCollapsed ? 'collapsed' : sidebarWidthMode]

  useEffect(() => {
    fetchCranes()
    fetchCraneStats()
    fetchLatestSensorData()
    fetchActiveAlerts()
    fetchAlertStats()
  }, [fetchCranes, fetchCraneStats, fetchLatestSensorData, fetchActiveAlerts, fetchAlertStats])

  const handleMainWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    const target = e.target as HTMLElement
    if (target.closest('aside')) return
    e.preventDefault()
    if (e.deltaY > 0) {
      zoomOut()
    } else {
      zoomIn()
    }
  }, [zoomIn, zoomOut])

  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    main.addEventListener('wheel', handleMainWheel, { passive: false })
    return () => main.removeEventListener('wheel', handleMainWheel)
  }, [handleMainWheel])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === '0') {
        e.preventDefault()
        resetZoom()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomIn, zoomOut, resetZoom])

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full w-full bg-bg-primary overflow-hidden',
        'transition-all duration-300 ease-in-out'
      )}
      style={{
        ['--sidebar-width' as any]: `${sidebarWidth}px`,
        ['--content-zoom' as any]: zoomLevel,
      }}
    >
      <Sidebar />
      <div
        ref={mainRef}
        className="flex-1 flex flex-col min-w-0 relative overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: `calc(100% - ${sidebarWidth}px)` }}
      >
        <Header />
        <main
          className={cn(
            'flex-1 overflow-y-auto bg-bg-primary grid-bg relative',
            'transition-all duration-300 ease-in-out',
            syncZoom ? 'p-5' : 'p-6'
          )}
        >
          <div
            className={cn(
              'w-full min-h-full',
              'transition-all duration-300 ease-in-out',
              'origin-top-left will-change-transform'
            )}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              width: zoomLevel !== 1 ? `${100 / zoomLevel}%` : '100%',
              minHeight: zoomLevel !== 1 ? `${100 / zoomLevel}%` : '100%',
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
