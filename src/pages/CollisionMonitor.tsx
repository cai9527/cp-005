import { useEffect, useState, useCallback, useRef, useMemo } from 'react'

interface IntersectionInfo {
  crane1_id: string
  crane2_id: string
  crane1_name: string
  crane2_name: string
  center_distance: number
  overlap_depth: number
  area: number
  type: 'partial' | 'contained'
}
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

  const intersections = useMemo<IntersectionInfo[]>(() => {
    const result: IntersectionInfo[] = []
    for (let i = 0; i < cranePositions.length; i++) {
      for (let j = i + 1; j < cranePositions.length; j++) {
        const p1 = cranePositions[i]
        const p2 = cranePositions[j]
        const d = Math.sqrt(
          Math.pow(p2.baseX - p1.baseX, 2) + Math.pow(p2.baseY - p1.baseY, 2)
        )
        const r1 = p1.radius
        const r2 = p2.radius
        if (d < r1 + r2) {
          const isContained = d <= Math.abs(r1 - r2)
          let area: number
          if (isContained) {
            const smallerR = Math.min(r1, r2)
            area = Math.PI * smallerR * smallerR
          } else {
            const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
            const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
            const angle1 = Math.acos(Math.min(1, Math.max(-1, a / r1)))
            const angle2 = Math.acos(Math.min(1, Math.max(-1, (d - a) / r2)))
            area = r1 * r1 * angle1 + r2 * r2 * angle2 - 0.5 * d * h
          }
          const overlapDepth = r1 + r2 - d
          result.push({
            crane1_id: p1.craneId,
            crane2_id: p2.craneId,
            crane1_name: p1.craneName,
            crane2_name: p2.craneName,
            center_distance: d,
            overlap_depth: overlapDepth,
            area,
            type: isContained ? 'contained' : 'partial',
          })
        }
      }
    }
    return result
  }, [cranePositions])

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

  const drawCircleIntersection = (
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, r1: number,
    x2: number, y2: number, r2: number
  ) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const d = Math.sqrt(dx * dx + dy * dy)

    if (d >= r1 + r2 || d <= Math.abs(r1 - r2)) return false
    if (d === 0) return false

    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    const h = Math.sqrt(r1 * r1 - a * a)

    const mx = x1 + (a * dx) / d
    const my = y1 + (a * dy) / d

    const px = (-h * dy) / d
    const py = (h * dx) / d

    const p1x = mx + px
    const p1y = my + py
    const p2x = mx - px
    const p2y = my - py

    const angle1 = Math.atan2(p1y - y1, p1x - x1)
    const angle2 = Math.atan2(p2y - y1, p2x - x1)
    const angle3 = Math.atan2(p1y - y2, p1x - x2)
    const angle4 = Math.atan2(p2y - y2, p2x - x2)

    ctx.beginPath()
    ctx.arc(x1, y1, r1, angle1, angle2, false)
    ctx.arc(x2, y2, r2, angle4, angle3, false)
    ctx.closePath()

    return true
  }

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

    const intersectionInfos: Array<{
      cx: number
      cy: number
      area: number
      overlapRatio: number
      crane1Name: string
      crane2Name: string
    }> = []

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i]
        const pos2 = positions[j]

        const cx1 = toCanvasX(pos1.baseX)
        const cy1 = toCanvasY(pos1.baseY)
        const r1 = pos1.radius * scale

        const cx2 = toCanvasX(pos2.baseX)
        const cy2 = toCanvasY(pos2.baseY)
        const r2 = pos2.radius * scale

        const dx = cx2 - cx1
        const dy = cy2 - cy1
        const d = Math.sqrt(dx * dx + dy * dy)

        if (d < r1 + r2 && d > Math.abs(r1 - r2)) {
          const intersects = drawCircleIntersection(ctx, cx1, cy1, r1, cx2, cy2, r2)
          if (intersects) {
            const dReal = Math.sqrt(
              Math.pow(pos2.baseX - pos1.baseX, 2) + Math.pow(pos2.baseY - pos1.baseY, 2)
            )
            const r1Real = pos1.radius
            const r2Real = pos2.radius

            const aReal = (r1Real * r1Real - r2Real * r2Real + dReal * dReal) / (2 * dReal)
            const hReal = Math.sqrt(Math.max(0, r1Real * r1Real - aReal * aReal))

            const angle1 = Math.acos(Math.min(1, Math.max(-1, aReal / r1Real)))
            const angle2 = Math.acos(Math.min(1, Math.max(-1, (dReal - aReal) / r2Real)))

            const area = r1Real * r1Real * angle1 + r2Real * r2Real * angle2 - 0.5 * dReal * hReal

            const smallerRadius = Math.min(r1Real, r2Real)
            const overlapDepth = r1Real + r2Real - dReal
            const overlapRatio = overlapDepth / (smallerRadius * 2)

            const gradient = ctx.createRadialGradient(
              (cx1 + cx2) / 2, (cy1 + cy2) / 2, 0,
              (cx1 + cx2) / 2, (cy1 + cy2) / 2, Math.max(r1, r2)
            )
            gradient.addColorStop(0, 'rgba(255, 59, 48, 0.35)')
            gradient.addColorStop(0.5, 'rgba(255, 59, 48, 0.25)')
            gradient.addColorStop(1, 'rgba(255, 59, 48, 0.15)')

            ctx.fillStyle = gradient
            ctx.fill()

            ctx.strokeStyle = 'rgba(255, 59, 48, 0.6)'
            ctx.lineWidth = 2
            ctx.setLineDash([6, 4])
            ctx.stroke()
            ctx.setLineDash([])

            intersectionInfos.push({
              cx: (cx1 + cx2) / 2,
              cy: (cy1 + cy2) / 2,
              area,
              overlapRatio,
              crane1Name: pos1.craneName.split(' ')[0],
              crane2Name: pos2.craneName.split(' ')[0],
            })
          }
        } else if (d <= Math.abs(r1 - r2)) {
          const smallerR = Math.min(r1, r2)
          const largerR = Math.max(r1, r2)
          const smallerCx = r1 < r2 ? cx1 : cx2
          const smallerCy = r1 < r2 ? cy1 : cy2

          const gradient = ctx.createRadialGradient(
            smallerCx, smallerCy, 0,
            smallerCx, smallerCy, smallerR
          )
          gradient.addColorStop(0, 'rgba(255, 59, 48, 0.4)')
          gradient.addColorStop(1, 'rgba(255, 59, 48, 0.2)')

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(smallerCx, smallerCy, smallerR, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = 'rgba(255, 59, 48, 0.7)'
          ctx.lineWidth = 2
          ctx.setLineDash([6, 4])
          ctx.stroke()
          ctx.setLineDash([])

          const smallerRReal = Math.min(pos1.radius, pos2.radius)
          const area = Math.PI * smallerRReal * smallerRReal

          intersectionInfos.push({
            cx: smallerCx,
            cy: smallerCy,
            area,
            overlapRatio: 1,
            crane1Name: pos1.craneName.split(' ')[0],
            crane2Name: pos2.craneName.split(' ')[0],
          })
        }
      }
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

    for (const info of intersectionInfos) {
      ctx.fillStyle = '#FF3B30'
      ctx.font = 'bold 10px Rajdhani, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`相交面积: ${info.area.toFixed(1)}m²`, info.cx, info.cy - 4)
      ctx.fillStyle = '#E2E8F0'
      ctx.font = '9px Rajdhani, sans-serif'
      ctx.fillText(
        `${info.crane1Name} ↔ ${info.crane2Name}`,
        info.cx, info.cy + 10
      )
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

      <div className="grid grid-cols-5 gap-3">
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
          <div className="p-2 rounded-lg bg-accent-danger/10">
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-accent-danger/50" />
            </div>
          </div>
          <div>
            <div className="data-label">空间相交</div>
            <div className="font-display font-bold text-lg text-accent-danger">
              {intersections.length}
            </div>
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
              <div className="absolute top-3 left-3 bg-bg-secondary/90 backdrop-blur-sm rounded-lg p-2.5 border border-border-primary/50 text-[10px] space-y-1.5">
                <div className="font-medium text-text-secondary mb-1">图例</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-danger/40 border border-accent-danger/60" />
                  <span className="text-text-muted">空间相交区域</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-accent-danger border-t border-dashed border-accent-danger" />
                  <span className="text-text-muted">相交边界</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-accent-primary" />
                  <span className="text-text-muted">起重臂</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-secondary" />
                  <span className="text-text-muted">基座位置</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-warning" />
                  <span className="text-text-muted">臂端位置</span>
                </div>
              </div>
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
            <h3 className="text-sm font-medium text-text-secondary mb-3">空间相交详情</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {intersections.length === 0 ? (
                <div className="text-center py-4 text-text-muted text-sm">
                  无空间相交区域
                </div>
              ) : (
                intersections.map((item, idx) => (
                  <div key={idx} className="p-2 rounded bg-accent-danger/5 border border-accent-danger/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {item.crane1_name.split(' ')[0]} ↔ {item.crane2_name.split(' ')[0]}
                      </span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        item.type === 'contained'
                          ? 'bg-accent-danger/20 text-accent-danger'
                          : 'bg-accent-warning/20 text-accent-warning'
                      )}>
                        {item.type === 'contained' ? '包含' : '部分相交'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-text-muted">
                      <div className="flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        <span>中心距 {item.center_distance.toFixed(1)}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>重叠深 {item.overlap_depth.toFixed(1)}m</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>相交面积 {item.area.toFixed(1)}m²</span>
                      </div>
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
