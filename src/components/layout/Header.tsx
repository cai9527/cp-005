import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, AlertTriangle, Clock, X, PanelLeftClose, PanelLeftOpen,
  ZoomIn, ZoomOut, RotateCcw, Link,
} from 'lucide-react'
import { useAlertStore, type Alert } from '@/stores/alertStore'
import { useUIStore, ZOOM_LEVELS, type ZoomLevel } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const routeNameMap: Record<string, string> = {
  '/': '实时监控',
  '/cranes': '塔机管理',
  '/history': '历史数据',
  '/alerts': '预警中心',
  '/analysis': '数据分析',
}

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function Breadcrumb() {
  const location = useLocation()
  const name = routeNameMap[location.pathname] || '未知页面'

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-text-muted">首页</span>
      <span className="text-text-muted">/</span>
      <span className="text-text-primary">{name}</span>
    </div>
  )
}

const levelConfig: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: '临界', color: 'text-accent-danger', bg: 'bg-accent-danger/10' },
  warning: { label: '警告', color: 'text-accent-warning', bg: 'bg-accent-warning/10' },
  info: { label: '提示', color: 'text-accent-primary', bg: 'bg-accent-primary/10' },
}

const sensorNameMap: Record<string, string> = {
  load: '起重量', moment: '力矩', radius: '幅度',
  height: '高度', rotation: '回转角度', wind: '风速',
}

interface PanelPosition {
  top: number
  right: number
}

function NotificationPanel({
  position,
  onClose,
  onViewAll,
  onAlertClick,
  activeAlerts,
  fetchActiveAlerts,
  panelRef,
}: {
  position: PanelPosition
  onClose: () => void
  onViewAll: () => void
  onAlertClick: (alert: Alert) => void
  activeAlerts: Alert[]
  fetchActiveAlerts: () => void
  panelRef: React.RefObject<HTMLDivElement>
}) {
  useEffect(() => {
    fetchActiveAlerts()
  }, [fetchActiveAlerts])

  const alertCount = activeAlerts.length

  return createPortal(
    <div
      ref={panelRef}
      style={{
        top: position.top,
        right: position.right,
        zIndex: 2147483647,
      }}
      className={cn(
        'fixed w-[380px] bg-bg-secondary border border-border-primary',
        'rounded-xl shadow-2xl overflow-hidden',
        'animate-in fade-in slide-in-from-top-2 duration-200',
        'notification-panel-elevated'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
        <h3 className="font-medium text-text-primary">消息通知</h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            'bg-accent-danger/20 text-accent-danger'
          )}>
            {alertCount} 条未读
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {activeAlerts.length > 0 ? (
          activeAlerts.slice(0, 8).map((alert) => {
            const level = levelConfig[alert.level] || levelConfig.warning
            return (
              <div
                key={alert.id}
                onClick={() => onAlertClick(alert)}
                className={cn(
                  'px-4 py-3 border-b border-border-primary/50 cursor-pointer',
                  'hover:bg-bg-tertiary/50 transition-colors'
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', level.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', level.bg, level.color)}>
                        {level.label}
                      </span>
                      <span className="text-xs text-text-muted">
                        {sensorNameMap[alert.sensor_type] || alert.sensor_type}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary mt-1 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      <span className="ml-auto">{alert.crane_name || alert.crane_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="px-4 py-8 text-center text-text-muted">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无新消息</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border-primary bg-bg-tertiary/30">
        <button
          type="button"
          onClick={onViewAll}
          className="w-full py-2 text-sm text-accent-primary hover:text-accent-secondary transition-colors text-center"
        >
          查看全部预警 →
        </button>
      </div>
    </div>,
    document.body
  )
}

export default function Header() {
  const activeAlerts = useAlertStore((s) => s.activeAlerts)
  const fetchActiveAlerts = useAlertStore((s) => s.fetchActiveAlerts)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const zoomLevel = useUIStore((s) => s.zoomLevel)
  const setZoomLevel = useUIStore((s) => s.setZoomLevel)
  const zoomIn = useUIStore((s) => s.zoomIn)
  const zoomOut = useUIStore((s) => s.zoomOut)
  const resetZoom = useUIStore((s) => s.resetZoom)
  const syncZoom = useUIStore((s) => s.syncZoom)
  const toggleSyncZoom = useUIStore((s) => s.toggleSyncZoom)

  const [time, setTime] = useState(formatTime(new Date()))
  const [showPanel, setShowPanel] = useState(false)
  const [panelPos, setPanelPos] = useState<PanelPosition>({ top: 0, right: 0 })
  const [showZoomMenu, setShowZoomMenu] = useState(false)

  const bellBtnRef = useRef<HTMLButtonElement>(null)
  const zoomBtnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const zoomMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(formatTime(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useLayoutEffect(() => {
    if (showPanel && bellBtnRef.current) {
      const rect = bellBtnRef.current.getBoundingClientRect()
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [showPanel])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedBell = bellBtnRef.current?.contains(target)
      const clickedPanel = panelRef.current?.contains(target)
      if (!clickedBell && !clickedPanel) {
        setShowPanel(false)
      }
      const clickedZoomBtn = zoomBtnRef.current?.contains(target)
      const clickedZoomMenu = zoomMenuRef.current?.contains(target)
      if (!clickedZoomBtn && !clickedZoomMenu) {
        setShowZoomMenu(false)
      }
    }
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowPanel(false)
        setShowZoomMenu(false)
      }
    }
    function handleResize() {
      if (showPanel && bellBtnRef.current) {
        const rect = bellBtnRef.current.getBoundingClientRect()
        setPanelPos({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        })
      }
    }
    if (showPanel || showZoomMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeydown)
      window.addEventListener('resize', handleResize)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('resize', handleResize)
    }
  }, [showPanel, showZoomMenu])

  const handleBellClick = () => {
    setShowPanel((prev) => !prev)
    setShowZoomMenu(false)
  }

  const handleViewAll = () => {
    setShowPanel(false)
    navigate('/alerts')
  }

  const handleAlertClick = (_alert: Alert) => {
    setShowPanel(false)
    navigate('/alerts')
  }

  const alertCount = activeAlerts.length

  const zoomPercent = Math.round(zoomLevel * 100)

  return (
    <header className="h-14 bg-bg-secondary/80 backdrop-blur border-b border-border-primary flex items-center justify-between px-6 relative z-[100]">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-lg',
            'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
            'transition-all duration-200 active:scale-95 touch-manipulation select-none'
          )}
          title={sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'}
          aria-label={sidebarCollapsed ? '展开菜单栏' : '收起菜单栏'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          ) : (
            <PanelLeftClose className="w-[18px] h-[18px]" />
          )}
        </button>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={zoomMenuRef}>
          <button
            ref={zoomBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowZoomMenu((prev) => !prev)
              setShowPanel(false)
            }}
            className={cn(
              'h-9 px-3 flex items-center gap-1.5 rounded-lg',
              'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              'transition-all duration-200 active:scale-95 touch-manipulation select-none',
              showZoomMenu && 'bg-bg-tertiary text-text-primary'
            )}
            title="页面缩放 (Ctrl+滚轮 / Ctrl++ / Ctrl+- / Ctrl+0)"
            aria-label="页面缩放"
          >
            <ZoomIn className="w-4 h-4" />
            <span className="text-xs font-mono tabular-nums min-w-[34px] text-center">
              {zoomPercent}%
            </span>
          </button>

          {showZoomMenu && (
            <div
              style={{ zIndex: 2147483646 }}
              className={cn(
                'absolute right-0 top-full mt-2 bg-bg-secondary border border-border-primary',
                'rounded-xl shadow-2xl overflow-hidden min-w-[200px]',
                'animate-in fade-in slide-in-from-top-2 duration-200'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-3 border-b border-border-primary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-muted">页面缩放</span>
                  <span className="text-xs text-text-secondary font-mono">
                    Ctrl + 滚轮
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={zoomOut}
                    disabled={zoomLevel === ZOOM_LEVELS[0]}
                    className={cn(
                      'flex-1 h-8 flex items-center justify-center rounded-md border transition-all',
                      zoomLevel === ZOOM_LEVELS[0]
                        ? 'border-border-primary/50 text-text-muted/50 cursor-not-allowed'
                        : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary active:scale-95'
                    )}
                    aria-label="缩小页面"
                    title="缩小页面 (Ctrl+-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={resetZoom}
                    className="flex-1 h-8 flex items-center justify-center rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all active:scale-95"
                    aria-label="重置缩放"
                    title="重置缩放 (Ctrl+0)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={zoomIn}
                    disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                    className={cn(
                      'flex-1 h-8 flex items-center justify-center rounded-md border transition-all',
                      zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
                        ? 'border-border-primary/50 text-text-muted/50 cursor-not-allowed'
                        : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary active:scale-95'
                    )}
                    aria-label="放大页面"
                    title="放大页面 (Ctrl++)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-2">
                {([...ZOOM_LEVELS] as ZoomLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setZoomLevel(level)
                      setShowZoomMenu(false)
                    }}
                    className={cn(
                      'w-full h-8 px-3 flex items-center justify-between rounded-md text-sm transition-all',
                      zoomLevel === level
                        ? 'bg-accent-primary/15 text-accent-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    )}
                  >
                    <span>{Math.round(level * 100)}%</span>
                    {zoomLevel === level && (
                      <span className="text-xs">当前</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="px-2 py-2 border-t border-border-primary">
                <button
                  type="button"
                  onClick={() => {
                    toggleSyncZoom()
                  }}
                  className={cn(
                    'w-full h-9 px-3 flex items-center gap-2 rounded-md text-sm transition-all',
                    syncZoom
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  )}
                >
                  <Link className="w-4 h-4" />
                  <span className="flex-1 text-left">同步缩放</span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    syncZoom
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-bg-tertiary text-text-muted'
                  )}>
                    {syncZoom ? '已开启' : '已关闭'}
                  </span>
                </button>
                <p className="mt-1.5 px-1 text-[11px] text-text-muted leading-relaxed">
                  开启后，调整侧边栏宽度时页面内容将同步缩放
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            ref={bellBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleBellClick()
            }}
            className={cn(
              'relative w-10 h-10 flex items-center justify-center rounded-lg',
              'hover:bg-bg-tertiary transition-colors active:scale-95',
              'touch-manipulation select-none',
              showPanel && 'bg-bg-tertiary'
            )}
            title="消息通知"
            aria-label="消息通知"
            aria-expanded={showPanel}
          >
            <Bell className={cn(
              'w-5 h-5 transition-colors',
              showPanel ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary',
              alertCount > 0 && !showPanel && 'animate-pulse'
            )} />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent-danger text-[10px] font-bold text-white px-1 ring-2 ring-bg-secondary shadow-lg z-[1]">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>
        </div>

        {showPanel && (
          <NotificationPanel
            position={panelPos}
            onClose={() => setShowPanel(false)}
            onViewAll={handleViewAll}
            onAlertClick={handleAlertClick}
            activeAlerts={activeAlerts}
            fetchActiveAlerts={fetchActiveAlerts}
            panelRef={panelRef}
          />
        )}

        <span className="text-xs text-text-secondary font-mono tabular-nums">{time}</span>

        <div
          className="w-8 h-8 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center text-sm font-bold cursor-pointer select-none"
          title="管理员"
        >
          管
        </div>
      </div>
    </header>
  )
}
