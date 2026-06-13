import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAlertStore } from '@/stores/alertStore'

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

export default function Header() {
  const activeAlerts = useAlertStore((s) => s.activeAlerts)
  const [time, setTime] = useState(formatTime(new Date()))

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(formatTime(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const alertCount = activeAlerts.length

  return (
    <header className="h-14 bg-bg-secondary/80 backdrop-blur border-b border-border-primary flex items-center justify-between px-6">
      <Breadcrumb />

      <div className="flex items-center gap-6">
        <div className="relative">
          <Bell className="w-[18px] h-[18px] text-text-secondary hover:text-text-primary transition-colors cursor-pointer" />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-accent-danger text-[10px] font-bold text-white px-1">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
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
