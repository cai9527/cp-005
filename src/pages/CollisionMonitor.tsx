import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Shield, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle,
  MapPin, Zap, Ruler, Clock, ChevronRight, Settings,
  CheckCircle, XCircle
} from 'lucide-react'
import { useCollisionStore, type CollisionRiskPair, type CranePosition } from '@/stores/collisionStore'
import { useCraneStore } from '@/stores/craneStore'
import StatusBadge from '@/components/StatusBadge'
import AlertBadge from '@/components/AlertBadge'
import { cn } from '@/lib/utils'

export default function CollisionMonitor() {
  const {
    riskPairs, cranePositions, overallRisk, activeCollisionAlerts, alertStats,
    activeRule,
    fetchRiskPairs, fetchOverallRisk, fetchCranePositions,
    fetchActiveCollisionAlerts, fetchCollisionAlertStats, fetchActiveRule,
    acknowledgeCollisionAlert, resolveCollisionAlert,
  } = useCollisionStore()
  const { cranes, fetchCranes } = useCraneStore()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPair, setSelectedPair] = useState<CollisionRiskPair | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const getCraneName = useCallback((craneId: string) => {
    return cranes.find(c => c.id === craneId)?.name || craneId
  }, [cranes])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchRiskPairs(),
        fetchOverallRisk(),
        fetchCranePositions(),
        fetchActiveCollisionAlerts(),
        fetchCollisionAlertStats(),
        fetchActiveRule(),
        fetchCranes(),
      ])
    } finally {
      setTimeout(() => setRefreshing(false), 500)
    }
  }, [fetchRiskPairs, fetchOverallRisk, fetchCranePositions, fetchActiveCollisionAlerts, fetchCollisionAlertStats, fetchActiveRule, fetchCranes])

  useEffect(() => {
    handleRefresh()
  }, [handleRefresh])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || cranePositions.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = 40

    const positions = cranePositions
    const allX = positions.flatMap(p => [p.baseX, p.jibEndX])
    const allY = positions.flatMap(p => [p.baseY, p.jibEndY])
    const minX = Math.min(...allX) - 10
    const maxX = Math.max(...allX) + 10
    const minY = Math.min(...allY) - 10
    const maxY = Math.max(...allY) + 10

    const scaleX = (width - padding * 2) / (maxX - minX)
    const scaleY = (height - padding * 2) / (maxY - minY)
    const scale = Math.min(scaleX, scaleY)

    const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale
    const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale

    const toCanvasX = (x: number) => x * scale + offsetX
    const toCanvasY = (y: number) => y * scale + offsetY

    ctx.clearRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(42, 58, 78, 0.5)'
    ctx.lineWidth = 1
    const gridSize = 10 * scale
    for (let x = padding; x < width - padding; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }
    for (let y = padding; y < height - padding; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    for (const pair of riskPairs) {
      if (pair.risk_level === 'safe') continue

      const pos1 = positions.find(p => p.craneId === pair.crane1_id)
      const pos2 = positions.find(p => p.craneId === pair.crane2_id)
      if (!pos1 || !pos2) continue

      const x1 = toCanvasX(pos1.jibEndX)
      const y1 = toCanvasY(pos1.jibEndY)
      const x2 = toCanvasX(pos2.jibEndX)
      const y2 = toCanvasY(pos2.jibEndY)

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
      if (pair.risk_level === 'critical') {
        gradient.addColorStop(0, 'rgba(255, 59, 48, 0.8)')
        gradient.addColorStop(1, 'rgba(255, 59, 48, 0.8)')
      } else {
        gradient.addColorStop(0, 'rgba(255, 204, 0, 0.6)')
        gradient.addColorStop(1, 'rgba(255, 204, 0, 0.6)')
      }

      ctx.strokeStyle = gradient
      ctx.lineWidth = pair.risk_level === 'critical' ? 3 : 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.setLineDash([])

      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      ctx.fillStyle = pair.risk_level === 'critical' ? '#FF3B30' : '#FFCC00'
      ctx.font = 'bold 11px Rajdhani, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${pair.distance.toFixed(1)}m`, midX, midY - 8)
    }

    for (const pos of positions) {
      const baseX = toCanvasX(pos.baseX)
      const baseY = toCanvasY(pos.baseY)
      const endX = toCanvasX(pos.jibEndX)
      const endY = toCanvasY(pos.jibEndY)

      ctx.strokeStyle = '#2A3A4E'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(baseX, baseY, pos.radius * scale, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = '#00D4FF'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(baseX, baseY)
      ctx.lineTo(endX, endY)
      ctx.stroke()

      ctx.fillStyle = '#0B1120'
      ctx.strokeStyle = '#00D4FF'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(baseX, baseY, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#FF6B35'
      ctx.beginPath()
      ctx.arc(endX, endY, 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#E2E8F0'
      ctx.font = '11px Rajdhani, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(pos.craneName.split(' ')[0], baseX, baseY - 14)
    }

  }, [cranePositions, riskPairs])

  const riskLevelConfig = {
    safe: { icon: ShieldCheck, color: 'text-accent-secondary', bg: 'bg-accent-secondary/10', border: 'border-accent-secondary/30', label: '安全' },
    warning: { icon: ShieldAlert, color: 'text-accent-warning', bg: 'bg-accent-warning/10', border: 'border-accent-warning/30', label: '警告' },
    critical: { icon: Shield, color: 'text-accent-danger', bg: 'bg-accent-danger/10', border: 'border-accent-danger/30', label: '临界' },
  }

  const overallConfig = riskLevelConfig[overallRisk]
  const OverallIcon = overallConfig.icon

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold text-text-primary">防碰撞监控</h2>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border', overallConfig.bg, overallConfig.border)}>
            <OverallIcon className={cn('w-4 h-4', overallConfig.color)} />
            <span className={cn('text-sm font-medium', overallConfig.color)}>
              整体风险：{overallConfig.label}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="btn-secondary flex items-center gap-2"
          disabled={refreshing}
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <MapPin className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <div className="data-label">在线设备</div>
            <div className="font-display font-bold text-lg text-text-primary">{cranePositions.length}</div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-warning/10">
            <AlertTriangle className="w-5 h-5 text-accent-warning" />
          </div>
          <div>
            <div className="data-label">风险配对</div>
            <div className="font-display font-bold text-lg text-accent-warning">
              {riskPairs.filter(p => p.risk_level !== 'safe').length}
            </div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-danger/10">
            <ShieldAlert className="w-5 h-5 text-accent-danger" />
          </div>
          <div>
            <div className="data-label">活跃预警</div>
            <div className="font-display font-bold text-lg text-accent-danger">{activeCollisionAlerts.length}</div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-secondary/10">
            <CheckCircle className="w-5 h-5 text-accent-secondary" />
          </div>
          <div>
            <div className="data-label">今日预警</div>
            <div className="font-display font-bold text-lg text-accent-secondary">{alertStats.today}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="glass-card p-4 flex-1 min-h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-secondary">设备位置分布</h3>
              <span className="text-xs text-text-muted">俯视图</span>
            </div>
            <div ref={containerRef} className="flex-1 relative bg-bg-tertiary/30 rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full" />
              {cranePositions.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
                  暂无位置数据
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-secondary">风险配对详情</h3>
              <span className="text-xs text-text-muted">共 {riskPairs.length} 对</span>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {riskPairs.length === 0 ? (
                <div className="text-center py-6 text-text-muted text-sm">暂无风险配对数据</div>
              ) : (
                riskPairs.map((pair, idx) => {
                  const config = riskLevelConfig[pair.risk_level]
                  const PairIcon = config.icon
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedPair(pair)}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all',
                        'hover:bg-bg-tertiary/50 border border-transparent',
                        selectedPair === pair && 'bg-bg-tertiary/50 border-accent-primary/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <PairIcon className={cn('w-4 h-4', config.color)} />
                        <div>
                          <div className="text-sm text-text-primary font-medium">
                            {getCraneName(pair.crane1_id)} ↔ {getCraneName(pair.crane2_id)}
                          </div>
                          <div className="text-xs text-text-muted">
                            {pair.distance.toFixed(2)}m · {pair.relative_velocity.toFixed(2)}m/s
                          </div>
                        </div>
                      </div>
                      <AlertBadge level={pair.risk_level === 'safe' ? 'info' : pair.risk_level} />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="w-80 shrink-0 flex flex-col gap-4">
          <div className="glass-card p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-secondary">实时预警</h3>
              <span className="text-xs text-text-muted">{activeCollisionAlerts.length} 条活跃</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {activeCollisionAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-muted">
                  <ShieldCheck className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm">暂无碰撞预警</span>
                </div>
              ) : (
                activeCollisionAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      alert.level === 'critical'
                        ? 'bg-accent-danger/10 border-accent-danger/30'
                        : 'bg-accent-warning/10 border-accent-warning/30'
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <AlertBadge level={alert.level} />
                      <span className="text-[10px] text-text-muted">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-text-primary leading-relaxed mb-2">{alert.message}</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-text-muted">
                      <div className="flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        <span>{alert.distance.toFixed(2)}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{alert.relative_velocity.toFixed(2)}m/s</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); acknowledgeCollisionAlert(alert.id) }}
                        className="flex-1 text-[10px] py-1 rounded bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80 transition-colors"
                      >
                        确认
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); resolveCollisionAlert(alert.id) }}
                        className="flex-1 text-[10px] py-1 rounded bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 transition-colors"
                      >
                        解除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-secondary">防碰撞规则</h3>
              <Settings className="w-4 h-4 text-text-muted cursor-pointer hover:text-text-primary" />
            </div>
            {activeRule ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">{activeRule.name}</span>
                  {activeRule.enabled ? (
                    <span className="text-accent-secondary">启用中</span>
                  ) : (
                    <span className="text-text-muted">已禁用</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-primary">
                  <div>
                    <div className="text-text-muted">安全距离</div>
                    <div className="text-text-primary font-medium">{activeRule.safe_distance}m</div>
                  </div>
                  <div>
                    <div className="text-text-muted">风险速度</div>
                    <div className="text-text-primary font-medium">{activeRule.risk_velocity}m/s</div>
                  </div>
                  <div>
                    <div className="text-text-muted">警告系数</div>
                    <div className="text-text-primary font-medium">{activeRule.warning_distance_ratio}x</div>
                  </div>
                  <div>
                    <div className="text-text-muted">临界系数</div>
                    <div className="text-text-primary font-medium">{activeRule.critical_distance_ratio}x</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-text-muted text-sm">暂无规则</div>
            )}
          </div>

          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-3">设备列表</h3>
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {cranePositions.map((pos) => {
                const crane = cranes.find(c => c.id === pos.craneId)
                const hasRisk = riskPairs.some(p =>
                  (p.crane1_id === pos.craneId || p.crane2_id === pos.craneId) &&
                  p.risk_level !== 'safe'
                )
                return (
                  <div key={pos.craneId} className="flex items-center justify-between p-2 rounded bg-bg-tertiary/30">
                    <div className="flex items-center gap-2">
                      {hasRisk && <AlertTriangle className="w-3.5 h-3.5 text-accent-warning" />}
                      <span className="text-sm text-text-primary">{pos.craneName}</span>
                    </div>
                    {crane && <StatusBadge status={crane.status} />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
