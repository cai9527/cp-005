import { useEffect, useState, useCallback } from 'react'
import { useCraneStore } from '@/stores/craneStore'
import StatusBadge from '@/components/StatusBadge'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Plus, MapPin, Calendar, Wrench, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Cranes() {
  const navigate = useNavigate()
  const { cranes, fetchCranes, fetchCraneStats } = useCraneStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchCranes(), fetchCraneStats()])
    } finally {
      setTimeout(() => setRefreshing(false), 500)
    }
  }, [fetchCranes, fetchCraneStats])

  useEffect(() => {
    fetchCranes()
  }, [fetchCranes])

  const filtered = cranes.filter((c) => {
    const matchSearch = !search || c.name.includes(search) || c.model.includes(search)
    const matchStatus = !statusFilter || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">塔机管理</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleRefresh()
            }}
            className="btn-secondary flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            刷新
          </button>
          <button className="btn-primary flex items-center gap-2" disabled>
            <Plus className="w-4 h-4" />
            添加塔机
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="搜索塔机名称或型号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn('input-field pl-9')}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field pl-9 pr-8 appearance-none min-w-[140px]"
          >
            <option value="">全部状态</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
            <option value="alarm">报警</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((crane) => (
          <div
            key={crane.id}
            className="glass-card p-5 hover:border-accent-primary/50 transition-all cursor-pointer"
            onClick={() => navigate(`/cranes/${crane.id}`)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-lg font-bold text-text-primary">{crane.name}</span>
              <span className="bg-bg-tertiary px-2 py-0.5 rounded text-xs text-text-secondary">
                {crane.model}
              </span>
            </div>

            <div className="mb-3">
              <StatusBadge status={crane.status} />
            </div>

            <div className="space-y-2 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-text-muted" />
                <span>安装位置: ({crane.location_x}, {crane.location_y})</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <span>安装日期: {crane.install_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-text-muted" />
                <span>最近维保: {crane.last_maintenance}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border-primary flex items-center gap-4 text-xs text-text-muted">
              <span>{crane.max_load} t</span>
              <span>{crane.max_moment} t·m</span>
              <span>{crane.max_radius} m</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted">暂无塔机数据</div>
      )}
    </div>
  )
}
