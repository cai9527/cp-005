import { useEffect, useState, useCallback, useRef } from 'react'
import { useCraneStore, type Crane } from '@/stores/craneStore'
import {
  Play, Pause, Square, RotateCw, Download, Settings,
  ArrowRight, ArrowLeft, RefreshCw, Crosshair, Gauge,
  Clock, Trash2, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RotationState {
  angle: number
  posX: number
  posY: number
  angularVelocity: number
  elapsedMs: number
  timestamp: string
}

interface SimulationInfo {
  id: string
  crane_id: string
  angular_velocity: number
  direction: 'cw' | 'ccw'
  center_x: number
  center_y: number
  radius: number
  status: 'running' | 'stopped' | 'paused'
  created_at: string
  craneName?: string
  currentAngle?: number
}

interface TrajectoryPoint {
  angle: number
  pos_x: number
  pos_y: number
  angular_velocity: number
  timestamp: string
  elapsed_ms: number
}

const API_BASE = '/api/rotation-simulator'

export default function RotationSimulator() {
  const { cranes, fetchCranes } = useCraneStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const trajectoryRef = useRef<TrajectoryPoint[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const [selectedCraneId, setSelectedCraneId] = useState<string>('')
  const [angularVelocity, setAngularVelocity] = useState(0.6)
  const [direction, setDirection] = useState<'cw' | 'ccw'>('cw')
  const [centerX, setCenterX] = useState(50)
  const [centerY, setCenterY] = useState(50)
  const [radius, setRadius] = useState(30)
  const [activeSimulations, setActiveSimulations] = useState<SimulationInfo[]>([])
  const [currentRotation, setCurrentRotation] = useState<RotationState | null>(null)
  const [loading, setLoading] = useState(false)
  const [trajectoryHistory, setTrajectoryHistory] = useState<TrajectoryPoint[]>([])
  const [showConfig, setShowConfig] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchCranes()
    fetchActiveSimulations()
  }, [fetchCranes])

  useEffect(() => {
    if (selectedCraneId) {
      const crane = cranes.find((c) => c.id === selectedCraneId)
      if (crane) {
        setCenterX(crane.location_x)
        setCenterY(crane.location_y)
      }
    }
  }, [selectedCraneId, cranes])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'rotation_update') {
          const data = msg.payload
          setCurrentRotation({
            angle: data.angle,
            posX: data.posX,
            posY: data.posY,
            angularVelocity: data.angularVelocity,
            elapsedMs: data.elapsedMs,
            timestamp: data.timestamp,
          })
          trajectoryRef.current.push({
            angle: data.angle,
            pos_x: data.posX,
            pos_y: data.posY,
            angular_velocity: data.angularVelocity,
            timestamp: data.timestamp,
            elapsed_ms: data.elapsedMs,
          })
          if (trajectoryRef.current.length > 2000) {
            trajectoryRef.current = trajectoryRef.current.slice(-1000)
          }
        }
      } catch (e) {
        // ignore
      }
    }

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const fetchActiveSimulations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/active`)
      const json = await res.json()
      if (json.success) {
        setActiveSimulations(json.data)
      }
    } catch (e) {
      console.error('Failed to fetch active simulations:', e)
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (!selectedCraneId) return
    setLoading(true)
    try {
      trajectoryRef.current = []
      const res = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          craneId: selectedCraneId,
          angularVelocity,
          direction,
          centerX,
          centerY,
          radius,
        }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchActiveSimulations()
      }
    } catch (e) {
      console.error('Failed to start simulation:', e)
    } finally {
      setLoading(false)
    }
  }, [selectedCraneId, angularVelocity, direction, centerX, centerY, radius, fetchActiveSimulations])

  const handleStop = useCallback(async (craneId: string) => {
    try {
      const res = await fetch(`${API_BASE}/stop/${craneId}`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setCurrentRotation(null)
        await fetchActiveSimulations()
      }
    } catch (e) {
      console.error('Failed to stop simulation:', e)
    }
  }, [fetchActiveSimulations])

  const handlePause = useCallback(async (craneId: string) => {
    try {
      await fetch(`${API_BASE}/pause/${craneId}`, { method: 'POST' })
      await fetchActiveSimulations()
    } catch (e) {
      console.error('Failed to pause simulation:', e)
    }
  }, [fetchActiveSimulations])

  const handleResume = useCallback(async (craneId: string) => {
    try {
      await fetch(`${API_BASE}/resume/${craneId}`, { method: 'POST' })
      await fetchActiveSimulations()
    } catch (e) {
      console.error('Failed to resume simulation:', e)
    }
  }, [fetchActiveSimulations])

  const handleFetchTrajectory = useCallback(async (simulationId: string) => {
    try {
      const res = await fetch(`${API_BASE}/trajectory/${simulationId}?limit=500`)
      const json = await res.json()
      if (json.success) {
        setTrajectoryHistory(json.data)
      }
    } catch (e) {
      console.error('Failed to fetch trajectory:', e)
    }
  }, [])

  const handleExport = useCallback(() => {
    if (trajectoryRef.current.length === 0 && trajectoryHistory.length === 0) return
    setExporting(true)
    try {
      const data = trajectoryRef.current.length > 0 ? trajectoryRef.current : trajectoryHistory
      const csv = [
        'elapsed_ms,angle,pos_x,pos_y,angular_velocity,timestamp',
        ...data.map((p) =>
          `${p.elapsed_ms},${p.angle},${p.pos_x},${p.pos_y},${p.angular_velocity},${p.timestamp}`
        ),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rotation_trajectory_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [trajectoryHistory])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const scale = Math.min(w, h) / 120

    const drawFrame = () => {
      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = '#0B1120'
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      const cx = centerX * scale + (w / 2 - 50 * scale)
      const cy = centerY * scale + (h / 2 - 50 * scale)
      const r = radius * scale

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = 'rgba(0, 212, 255, 0.3)'
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(cx - r - 10, cy)
      ctx.lineTo(cx + r + 10, cy)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx, cy - r - 10)
      ctx.lineTo(cx, cy + r + 10)
      ctx.stroke()

      const points = trajectoryRef.current.length > 0 ? trajectoryRef.current : trajectoryHistory
      if (points.length > 1) {
        const recentPoints = points.slice(-500)
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        for (let i = 1; i < recentPoints.length; i++) {
          const alpha = 0.1 + (i / recentPoints.length) * 0.9
          const prev = recentPoints[i - 1]
          const curr = recentPoints[i]

          const prevX = prev.pos_x * scale + (w / 2 - 50 * scale)
          const prevY = prev.pos_y * scale + (h / 2 - 50 * scale)
          const currX = curr.pos_x * scale + (w / 2 - 50 * scale)
          const currY = curr.pos_y * scale + (h / 2 - 50 * scale)

          const gradient = ctx.createLinearGradient(prevX, prevY, currX, currY)
          gradient.addColorStop(0, `rgba(0, 230, 118, ${alpha * 0.8})`)
          gradient.addColorStop(1, `rgba(0, 212, 255, ${alpha})`)
          ctx.strokeStyle = gradient

          ctx.beginPath()
          ctx.moveTo(prevX, prevY)
          ctx.lineTo(currX, currY)
          ctx.stroke()
        }
      }

      if (currentRotation) {
        const px = currentRotation.posX * scale + (w / 2 - 50 * scale)
        const py = currentRotation.posY * scale + (h / 2 - 50 * scale)

        ctx.strokeStyle = 'rgba(0, 230, 118, 0.3)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.setLineDash([])

        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, 16)
        glowGrad.addColorStop(0, 'rgba(0, 230, 118, 0.4)')
        glowGrad.addColorStop(0.5, 'rgba(0, 230, 118, 0.1)')
        glowGrad.addColorStop(1, 'rgba(0, 230, 118, 0)')
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(px, py, 16, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#00E676'
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fill()

        const angleDeg = currentRotation.angle.toFixed(1)
        ctx.font = '11px "Rajdhani", monospace'
        ctx.fillStyle = 'rgba(0, 212, 255, 0.8)'
        ctx.textAlign = 'left'
        ctx.fillText(`${angleDeg}°`, px + 12, py - 4)

        const dirArrow = direction === 'cw' ? '↻' : '↺'
        ctx.font = '16px sans-serif'
        ctx.fillStyle = 'rgba(0, 212, 255, 0.6)'
        ctx.textAlign = 'center'
        ctx.fillText(dirArrow, cx, cy - r - 12)
      }

      ctx.font = '10px "Noto Sans SC", sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.textAlign = 'left'
      ctx.fillText(`中心: (${centerX}, ${centerY})  半径: ${radius}`, 10, h - 10)

      animFrameRef.current = requestAnimationFrame(drawFrame)
    }

    animFrameRef.current = requestAnimationFrame(drawFrame)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [centerX, centerY, radius, direction, currentRotation, trajectoryHistory])

  const getCraneName = useCallback((craneId: string) => {
    return cranes.find((c) => c.id === craneId)?.name || craneId
  }, [cranes])

  const isRunning = activeSimulations.some((s) => s.crane_id === selectedCraneId && s.status === 'running')
  const isPaused = activeSimulations.some((s) => s.crane_id === selectedCraneId && s.status === 'paused')

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">设备旋转模拟</h2>
        <button
          type="button"
          onClick={fetchActiveSimulations}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        <div className={cn('flex flex-col gap-4 transition-all duration-300', showConfig ? 'w-80 shrink-0' : 'w-10 shrink-0')}>
          {!showConfig ? (
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="glass-card p-2 flex items-center justify-center hover:bg-bg-tertiary transition-colors"
            >
              <Settings className="w-4 h-4 text-text-secondary" />
            </button>
          ) : (
            <>
              <div className="glass-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Settings className="w-4 h-4 text-accent-primary" />
                    旋转参数
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">选择设备</label>
                  <select
                    value={selectedCraneId}
                    onChange={(e) => setSelectedCraneId(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">选择塔机设备</option>
                    {cranes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.model})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">
                    角速度 <span className="text-accent-primary font-mono">{angularVelocity}</span> r/min
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="5"
                    step="0.01"
                    value={angularVelocity}
                    onChange={(e) => setAngularVelocity(Number(e.target.value))}
                    className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted mt-1">
                    <span>0.01</span>
                    <span>5.00</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">旋转方向</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('cw')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all border',
                        direction === 'cw'
                          ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/50'
                          : 'bg-bg-tertiary text-text-secondary border-border-primary hover:text-text-primary'
                      )}
                    >
                      <RotateCw className="w-4 h-4" />
                      顺时针
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('ccw')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all border',
                        direction === 'ccw'
                          ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/50'
                          : 'bg-bg-tertiary text-text-secondary border-border-primary hover:text-text-primary'
                      )}
                    >
                      <RotateCw className="w-4 h-4 transform -scale-x-100" />
                      逆时针
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">
                    旋转中心 X <span className="text-accent-primary font-mono">{centerX}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={centerX}
                    onChange={(e) => setCenterX(Number(e.target.value))}
                    className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">
                    旋转中心 Y <span className="text-accent-primary font-mono">{centerY}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={centerY}
                    onChange={(e) => setCenterY(Number(e.target.value))}
                    className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">
                    旋转半径 <span className="text-accent-primary font-mono">{radius}</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {!isRunning && !isPaused && (
                    <button
                      type="button"
                      onClick={handleStart}
                      disabled={!selectedCraneId || loading}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      启动模拟
                    </button>
                  )}
                  {isRunning && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePause(selectedCraneId)}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <Pause className="w-4 h-4" />
                        暂停
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStop(selectedCraneId)}
                        className="btn-danger flex items-center justify-center gap-2"
                      >
                        <Square className="w-4 h-4" />
                        停止
                      </button>
                    </>
                  )}
                  {isPaused && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResume(selectedCraneId)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        继续
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStop(selectedCraneId)}
                        className="btn-danger flex items-center justify-center gap-2"
                      >
                        <Square className="w-4 h-4" />
                        停止
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="glass-card p-4 space-y-3">
                <h3 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent-primary" />
                  实时数据
                </h3>
                {currentRotation ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-bg-tertiary/50 rounded-lg p-2">
                      <div className="data-value text-base">{currentRotation.angle.toFixed(1)}°</div>
                      <div className="data-label text-[10px]">当前角度</div>
                    </div>
                    <div className="bg-bg-tertiary/50 rounded-lg p-2">
                      <div className="data-value text-base">{currentRotation.angularVelocity}</div>
                      <div className="data-label text-[10px]">角速度 r/min</div>
                    </div>
                    <div className="bg-bg-tertiary/50 rounded-lg p-2">
                      <div className="data-value text-base">({currentRotation.posX.toFixed(1)}, {currentRotation.posY.toFixed(1)})</div>
                      <div className="data-label text-[10px]">位置坐标</div>
                    </div>
                    <div className="bg-bg-tertiary/50 rounded-lg p-2">
                      <div className="data-value text-base">{(currentRotation.elapsedMs / 1000).toFixed(1)}s</div>
                      <div className="data-label text-[10px]">运行时长</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-text-muted text-sm py-4">
                    暂无运行数据
                  </div>
                )}
              </div>

              {activeSimulations.length > 0 && (
                <div className="glass-card p-4 space-y-3">
                  <h3 className="font-display text-sm font-semibold text-text-primary">运行中模拟</h3>
                  <div className="space-y-2">
                    {activeSimulations.map((sim) => (
                      <div key={sim.id} className="bg-bg-tertiary/50 rounded-lg p-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-text-primary font-medium">{sim.craneName || getCraneName(sim.crane_id)}</div>
                          <div className="text-[10px] text-text-muted">
                            ω={sim.angular_velocity} {sim.direction === 'cw' ? '顺时针' : '逆时针'}
                            {sim.currentAngle !== undefined && ` ∠${sim.currentAngle.toFixed(1)}°`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {sim.status === 'running' && (
                            <button
                              type="button"
                              onClick={() => handlePause(sim.crane_id)}
                              className="p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                            >
                              <Pause className="w-3.5 h-3.5 text-text-secondary" />
                            </button>
                          )}
                          {sim.status === 'paused' && (
                            <button
                              type="button"
                              onClick={() => handleResume(sim.crane_id)}
                              className="p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 text-accent-secondary" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStop(sim.crane_id)}
                            className="p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                          >
                            <Square className="w-3.5 h-3.5 text-accent-danger" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFetchTrajectory(sim.id)}
                            className="p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                            title="加载轨迹"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-accent-primary" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="glass-card p-1 flex-1 min-h-[400px] relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full rounded-lg"
              style={{ display: 'block' }}
            />
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || (trajectoryRef.current.length === 0 && trajectoryHistory.length === 0)}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-30"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? '导出中...' : '导出轨迹'}
              </button>
              <button
                type="button"
                onClick={() => {
                  trajectoryRef.current = []
                  setTrajectoryHistory([])
                }}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
                title="清除轨迹"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px] text-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-accent-secondary rounded inline-block" />
                轨迹
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-accent-secondary rounded-full inline-block" />
                当前位置
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 border-t border-dashed border-accent-primary inline-block" />
                旋转圆
              </span>
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-accent-primary" />
              轨迹数据预览
              <span className="text-[10px] text-text-muted ml-auto">
                {trajectoryRef.current.length > 0 ? `${trajectoryRef.current.length} 个数据点` : trajectoryHistory.length > 0 ? `${trajectoryHistory.length} 个数据点` : '暂无数据'}
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted border-b border-border-primary">
                    <th className="text-left py-1.5 pr-3 font-medium">时间(ms)</th>
                    <th className="text-left py-1.5 pr-3 font-medium">角度(°)</th>
                    <th className="text-left py-1.5 pr-3 font-medium">X</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Y</th>
                    <th className="text-left py-1.5 font-medium">角速度</th>
                  </tr>
                </thead>
                <tbody>
                  {(trajectoryRef.current.length > 0 ? trajectoryRef.current : trajectoryHistory).slice(-10).reverse().map((p, i) => (
                    <tr key={i} className="text-text-secondary border-b border-border-primary/20">
                      <td className="py-1 pr-3 font-mono">{p.elapsed_ms}</td>
                      <td className="py-1 pr-3 font-mono text-accent-primary">{p.angle.toFixed(2)}</td>
                      <td className="py-1 pr-3 font-mono">{p.pos_x.toFixed(2)}</td>
                      <td className="py-1 pr-3 font-mono">{p.pos_y.toFixed(2)}</td>
                      <td className="py-1 font-mono">{p.angular_velocity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
