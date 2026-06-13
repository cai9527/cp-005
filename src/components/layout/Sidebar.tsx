import { NavLink } from 'react-router-dom'
import { Radio, Activity, Construction, Database, AlertTriangle, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: '实时监控', icon: Activity },
  { path: '/cranes', label: '塔机管理', icon: Construction },
  { path: '/history', label: '历史数据', icon: Database },
  { path: '/alerts', label: '预警中心', icon: AlertTriangle },
  { path: '/analysis', label: '数据分析', icon: BarChart3 },
]

export default function Sidebar() {
  return (
    <aside className="w-[240px] h-full bg-bg-secondary flex flex-col border-r border-border-primary">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-border-primary">
        <Radio className="w-7 h-7 text-accent-primary" />
        <h1 className="font-display text-lg font-bold text-text-primary tracking-wide">
          智慧工地塔机监测
        </h1>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-5 h-11 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-accent-primary/10 text-accent-primary border-l-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50 border-l-2 border-transparent'
              )
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-border-primary">
        <div className="flex items-center gap-2">
          <span className="status-dot status-online" />
          <span className="text-xs text-accent-secondary font-medium">模拟器运行中</span>
        </div>
      </div>
    </aside>
  )
}
