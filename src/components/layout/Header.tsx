import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, X } from 'lucide-react'
import { useAlertStore, type Alert } from '@/stores/alertStore'
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

export default function Header() {
  const activeAlerts = useAlertStore((s) => s.activeAlerts)
  const fetchActiveAlerts = useAlertStore((s) => s.fetchActiveAlerts)
  const [time, setTime] = useState(formatTime(new Date()))
  const [showPanel, setShowPanel] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(formatTime(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false)
      }
    }
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPanel])

  const alertCount = activeAlerts.length

  const handleBellClick = () => {
    setShowPanel(!showPanel)
    if (!showPanel) {
      fetchActiveAlerts()
    }
  }

  const handleViewAll = () => {
    setShowPanel(false)
    navigate('/alerts')
  }

  const handleAlertClick = (alert: Alert) => {
    setShowPanel(false)
    navigate('/alerts')
  }

  return (
    <header className="h-14 bg-bg-secondary/80 backdrop-blur border-b border-border-primary flex items-center justify-between px-6">
      <Breadcrumb />

      <div className="flex items-center gap-6 relative z-10">
        <div className="relative" ref={panelRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleBellClick()
            }}
            className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-bg-tertiary transition-colors active:scale-95 touch-manipulation select-none"
            title="消息通知"
            aria-label="消息通知"
            type="button"
          >
            <Bell className={cn(
              'w-5 h-5 transition-colors',
              showPanel ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary',
              alertCount > 0 && !showPanel && 'animate-pulse'
            )} />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent-danger text-[10px] font-bold text-white px-1 ring-2 ring-bg-secondary shadow-lg">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          {showPanel && (
            <div
              className="absolute right-0 top-full mt-2 w-[380px] bg-bg-secondary border border-border-primary rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
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
                    onClick={() => setShowPanel(false)}
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
                        onClick={() => handleAlertClick(alert)}
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
                  onClick={handleViewAll}
                  className="w-full py-2 text-sm text-accent-primary hover:text-accent-secondary transition-colors text-center"
                >
                  查看全部预警 →
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="text-xs text-text-secondary font-mono tabular-nums">{time}</span>

        <div className="w-8 h-8 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center text-sm font-bold cursor-pointer">
          管
        </div>
      </div>
    </header>
  )
}
