import { useCallback, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Radio, Activity, Construction, Database, AlertTriangle, BarChart3,
  ChevronLeft, ChevronRight, Minus, Plus, Maximize2, Link, Users,
  Wifi, RotateCw,
} from 'lucide-react'
import {
  useUIStore,
  SIDEBAR_WIDTHS,
  type SidebarWidthMode,
} from '@/stores/uiStore'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface NavItem {
  path: string
  label: string
  icon: typeof Activity
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { path: '/', label: '实时监控', icon: Activity, roles: ['admin', 'user'] },
  { path: '/device-status', label: '在线状态', icon: Wifi, roles: ['admin', 'user'] },
  { path: '/rotation-simulator', label: '旋转模拟', icon: RotateCw, roles: ['admin'] },
  { path: '/cranes', label: '塔机管理', icon: Construction, roles: ['admin'] },
  { path: '/history', label: '历史数据', icon: Database, roles: ['admin', 'user'] },
  { path: '/alerts', label: '预警中心', icon: AlertTriangle, roles: ['admin', 'user'] },
  { path: '/analysis', label: '数据分析', icon: BarChart3, roles: ['admin'] },
  { path: '/users', label: '用户管理', icon: Users, roles: ['admin'] },
]

const widthOrder: SidebarWidthMode[] = ['collapsed', 'compact', 'normal', 'wide']
const widthLabels: Record<SidebarWidthMode, string> = {
  collapsed: '图标',
  compact: '紧凑',
  normal: '标准',
  wide: '宽松',
}

export default function Sidebar() {
  const sidebarWidthMode = useUIStore((s) => s.sidebarWidthMode)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const syncZoom = useUIStore((s) => s.syncZoom)
  const zoomLevel = useUIStore((s) => s.zoomLevel)
  const cycleSidebarWidth = useUIStore((s) => s.cycleSidebarWidth)
  const setSidebarWidthMode = useUIStore((s) => s.setSidebarWidthMode)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleSyncZoom = useUIStore((s) => s.toggleSyncZoom)
  const sidebarRef = useRef<HTMLElement>(null)
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const userRole = useAuthStore((s) => s.user?.role || 'user')

  const visibleNavItems = navItems.filter((item) => item.roles.includes(userRole))

  const currentWidth = SIDEBAR_WIDTHS[sidebarCollapsed ? 'collapsed' : sidebarWidthMode]

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
    wheelTimeoutRef.current = setTimeout(() => {
      cycleSidebarWidth(e.deltaY > 0 ? 'decrease' : 'increase')
    }, 50)
  }, [cycleSidebarWidth])

  useEffect(() => {
    const el = sidebarRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
    }
  }, [handleWheel])

  const effectiveMode: SidebarWidthMode = sidebarCollapsed ? 'collapsed' : sidebarWidthMode
  const zoomPercent = Math.round(zoomLevel * 100)
  const currentWidthIndex = widthOrder.indexOf(effectiveMode)
  const isMinWidth = currentWidthIndex === 0
  const isMaxWidth = currentWidthIndex === widthOrder.length - 1

  return (
    <aside
      ref={sidebarRef}
      style={{ width: currentWidth }}
      className={cn(
        'h-full bg-bg-secondary flex flex-col border-r border-border-primary relative',
        'transition-all duration-300 ease-in-out flex-shrink-0 group/sidebar z-[50]'
      )}
      title={sidebarCollapsed ? '按住 Ctrl + 滚轮缩放菜单' : undefined}
    >
      <div
        className={cn(
          'h-16 flex items-center border-b border-border-primary overflow-hidden transition-all duration-300',
          effectiveMode === 'collapsed' ? 'justify-center px-0' : 'gap-3 px-4'
        )}
      >
        <Radio
          className={cn(
            'text-accent-primary flex-shrink-0 transition-all duration-300',
            effectiveMode === 'wide' ? 'w-9 h-9' : effectiveMode === 'collapsed' ? 'w-8 h-8' : 'w-7 h-7'
          )}
        />
        {effectiveMode !== 'collapsed' && (
          <h1
            className={cn(
              'font-display font-bold text-text-primary tracking-wide whitespace-nowrap transition-all duration-300',
              effectiveMode === 'wide' ? 'text-xl' : 'text-lg'
            )}
          >
            智慧工地塔机监测
          </h1>
        )}
      </div>

      <nav
        className={cn(
          'flex-1 py-4 space-y-1 transition-all duration-300 overflow-y-auto',
          effectiveMode === 'collapsed' && 'flex flex-col items-center'
        )}
      >
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center text-sm font-medium transition-all duration-200 group/item relative',
                effectiveMode === 'collapsed'
                  ? 'w-11 h-11 justify-center rounded-lg mx-auto'
                  : effectiveMode === 'compact'
                    ? 'gap-2 px-3 h-10'
                    : effectiveMode === 'wide'
                      ? 'gap-4 px-6 h-12 text-base'
                      : 'gap-3 px-5 h-11',
                isActive
                  ? effectiveMode === 'collapsed'
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'bg-accent-primary/10 text-accent-primary border-l-2 border-accent-primary'
                  : effectiveMode === 'collapsed'
                    ? 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50 rounded-lg'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50 border-l-2 border-transparent'
              )
            }
            title={effectiveMode === 'collapsed' ? item.label : undefined}
          >
            <item.icon
              className={cn(
                'flex-shrink-0 transition-all duration-200',
                effectiveMode === 'wide' ? 'w-5 h-5' : 'w-[18px] h-[18px]'
              )}
            />
            {effectiveMode !== 'collapsed' && (
              <span
                className={cn(
                  'whitespace-nowrap transition-all duration-200',
                  effectiveMode === 'compact' && 'text-xs'
                )}
              >
                {item.label}
              </span>
            )}
            {effectiveMode === 'collapsed' && (
              <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-bg-tertiary border border-border-primary text-xs text-text-primary whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:translate-x-0 translate-x-[-4px] transition-all duration-200 z-[9998] shadow-lg">
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {effectiveMode !== 'collapsed' && (
        <div className="px-3 py-3 border-t border-border-primary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">菜单宽度</span>
            <span className="text-xs font-medium text-accent-primary">
              {widthLabels[effectiveMode]} ({currentWidth}px)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => cycleSidebarWidth('decrease')}
              disabled={isMinWidth}
              className={cn(
                'flex-1 h-8 flex items-center justify-center rounded-md border transition-all duration-200',
                isMinWidth
                  ? 'border-border-primary/50 text-text-muted/50 cursor-not-allowed'
                  : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border-secondary active:scale-95'
              )}
              aria-label="缩小菜单宽度"
              title="缩小菜单宽度 (Ctrl+滚轮向上)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              className="h-8 w-10 flex items-center justify-center rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border-secondary transition-all duration-200 active:scale-95"
              aria-label={sidebarCollapsed ? '展开菜单' : '收起菜单'}
              title={sidebarCollapsed ? '展开菜单' : '收起菜单'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => cycleSidebarWidth('increase')}
              disabled={isMaxWidth}
              className={cn(
                'flex-1 h-8 flex items-center justify-center rounded-md border transition-all duration-200',
                isMaxWidth
                  ? 'border-border-primary/50 text-text-muted/50 cursor-not-allowed'
                  : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border-secondary active:scale-95'
              )}
              aria-label="增大菜单宽度"
              title="增大菜单宽度 (Ctrl+滚轮向下)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2 flex gap-1">
            {widthOrder.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSidebarWidthMode(mode)}
                className={cn(
                  'flex-1 h-6 rounded text-[10px] font-medium transition-all duration-200',
                  effectiveMode === mode
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                    : 'bg-bg-tertiary/30 text-text-muted hover:text-text-secondary hover:bg-bg-tertiary border border-transparent'
                )}
              >
                {widthLabels[mode]}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-border-primary/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">内容缩放</span>
              <span className="text-xs font-medium text-text-secondary font-mono">
                {zoomPercent}%
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSyncZoom}
              className={cn(
                'w-full h-8 flex items-center justify-center gap-1.5 rounded-md border transition-all duration-200 text-xs',
                syncZoom
                  ? 'bg-accent-primary/15 border-accent-primary/50 text-accent-primary'
                  : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border-secondary active:scale-95'
              )}
              aria-label={syncZoom ? '关闭同步缩放' : '开启同步缩放'}
              title="同步缩放：菜单宽度与内容缩放联动"
            >
              <Link className="w-3.5 h-3.5" />
              {syncZoom ? '同步缩放已开启' : '同步缩放已关闭'}
            </button>
          </div>
        </div>
      )}

      {effectiveMode === 'collapsed' && (
        <div className="px-2 py-3 border-t border-border-primary">
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-full h-8 flex items-center justify-center rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 active:scale-95"
            aria-label="展开菜单"
            title="展开菜单"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'py-3 border-t border-border-primary overflow-hidden transition-all duration-300',
          effectiveMode === 'collapsed' ? 'px-2' : 'px-4'
        )}
      >
        {effectiveMode === 'collapsed' ? (
          <div className="flex justify-center">
            <span className="status-dot status-online" title="模拟器运行中" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="status-dot status-online" />
            <span className="text-xs text-accent-secondary font-medium">模拟器运行中</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 w-6 h-14 flex items-center justify-center',
          'bg-bg-tertiary/80 border border-border-primary border-l-0 rounded-r-lg',
          'text-text-muted hover:text-text-primary hover:bg-bg-tertiary',
          'transition-all duration-200 z-20 group/toggle',
          sidebarCollapsed ? '-right-6' : '-right-5',
          'opacity-0 group-hover/sidebar:opacity-100 focus:opacity-100'
        )}
        aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4 transition-transform group-hover/toggle:translate-x-0.5" />
        ) : (
          <ChevronLeft className="w-4 h-4 transition-transform group-hover/toggle:-translate-x-0.5" />
        )}
      </button>
    </aside>
  )
}
