import { useEffect, useState, useCallback, useRef } from 'react'
import { useDeviceStatusStore, type DeviceHeartbeat, type DeviceStatusLog } from '@/stores/deviceStatusStore'
import { useCraneStore, type Crane } from '@/stores/craneStore'
import {
  Wifi, WifiOff, AlertTriangle, Activity, RefreshCw, RotateCcw,
  Clock, Signal, ArrowUpDown, Zap, Radio, X,
} from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

const REASON_MAP: Record<string, string> = {
  device_registered: '设备注册',
  heartbeat_reconnected: '心跳重连',
  heartbeat_timeout: '心跳超时',
  manual_reconnect: '手动重连',
}

const STATUS_COLORS: Record<string, string> = {
  online: 'text-accent-secondary',
  offline: 'text-text-muted',
  alarm: 'text-accent-danger',
}

function HeartbeatBar({ percentage, isOverdue }: { percentage: number; isOverdue: boolean }) {
  return (
    <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          isOverdue
            ? 'bg-accent-danger'
            : percentage > 80
              ? 'bg-accent-warning'
              : 'bg-accent-secondary'
        )}
        style={{ width: `${Math.min(100, percentage)}%` }}
      />
    </div>
  )
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + `.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 1000) return '刚刚'
  if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`
  return `${Math.floor(diff / 60000)}分钟前`
}

export default function DeviceStatus() {
  const {
    heartbeats, statusLogs, stats, progressMap, selectedCraneId,
    fetchHeartbeats, fetchStatusLogs, fetchStats, fetchAllProgress,
    attemptReconnect, simulateOffline, selectCrane,
  } = useDeviceStatusStore()
  const { cranes, fetchCranes } = useCraneStore()
  const [refreshing, setRefreshing] = useState(false)
  const [reconnecting, setReconnecting] = useState<string | null>(null)
  const [reconnectMsg, setReconnectMsg] = useState<Record<string, string>>({})
  const [showLogs, setShowLogs] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchCranes(),
        fetchHeartbeats(),
        fetchStats(),
        fetchAllProgress(),
        fetchStatusLogs(undefined, 50),
      ])
    } finally {
      setTimeout(() => setRefreshing(false), 400)
    }
  }, [fetchCranes, fetchHeartbeats, fetchStats, fetchAllProgress, fetchStatusLogs])

  useEffect(() => {
    handleRefresh()
  }, [handleRefresh])

  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchAllProgress()
      fetchHeartbeats()
    }, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchAllProgress, fetchHeartbeats])

  const handleReconnect = useCallback(async (craneId: string) => {
    setReconnecting(craneId)
    try {
      const result = await attemptReconnect(craneId)
      setReconnectMsg((prev) => ({
        ...prev,
        [craneId]: result.message || (result.success ? '重连成功' : '重连失败'),
      }))
      setTimeout(() => {
        setReconnectMsg((prev) => {
          const next = { ...prev }
          delete next[craneId]
          return next
        })
      }, 3000)
    } finally {
      setReconnecting(null)
    }
  }, [attemptReconnect])

  const handleSimulateOffline = useCallback(async (craneId: string) => {
    await simulateOffline(craneId)
    await fetchHeartbeats()
    await fetchStats()
  }, [simulateOffline, fetchHeartbeats, fetchStats])

  const getCraneName = useCallback((craneId: string) => {
    const crane = cranes.find((c) => c.id === craneId)
    return crane?.name || craneId
  }, [cranes])

  const getCraneModel = useCallback((craneId: string) => {
    const crane = cranes.find((c) => c.id === craneId)
    return crane?.model || ''
  }, [cranes])

  const selectedHb = heartbeats.find((h) => h.crane_id === selectedCraneId)
  const selectedLogs = statusLogs.filter((l) => l.crane_id === selectedCraneId)
  const offlineDevices = heartbeats.filter((h) => h.status === 'offline')
  const alarmDevices = heartbeats.filter((h) => h.status === 'alarm')

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">设备在线状态监测</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className={cn(
              'btn-secondary flex items-center gap-2 text-xs',
              showLogs && 'border-accent-primary/50 text-accent-primary'
            )}
          >
            <Clock className="w-4 h-4" />
            {showLogs ? '隐藏日志' : '状态日志'}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn-secondary flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            刷新
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Activity className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <div className="data-label">设备总数</div>
            <div className="font-display font-bold text-lg text-text-primary">{stats.total}</div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-secondary/10">
            <Wifi className="w-5 h-5 text-accent-secondary" />
          </div>
          <div>
            <div className="data-label">在线</div>
            <div className="font-display font-bold text-lg text-accent-secondary">{stats.online}</div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-text-muted/10">
            <WifiOff className="w-5 h-5 text-text-muted" />
          </div>
          <div>
            <div className="data-label">离线</div>
            <div className="font-display font-bold text-lg text-text-muted">{stats.offline}</div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-danger/10">
            <AlertTriangle className="w-5 h-5 text-accent-danger" />
          </div>
          <div>
            <div className="data-label">报警</div>
            <div className="font-display font-bold text-lg text-accent-danger">{stats.alarm}</div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Signal className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <div className="data-label">平均延迟</div>
            <div className="font-display font-bold text-lg text-text-primary">{stats.avgLatency}<span className="text-xs text-text-muted ml-1">ms</span></div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-warning/10">
            <RotateCcw className="w-5 h-5 text-accent-warning" />
          </div>
          <div>
            <div className="data-label">平均重连</div>
            <div className="font-display font-bold text-lg text-text-primary">{stats.avgReconnects}<span className="text-xs text-text-muted ml-1">次</span></div>
          </div>
        </div>
      </div>

      {(offlineDevices.length > 0 || alarmDevices.length > 0) && (
        <div className="glass-card py-2 px-4 overflow-hidden border-accent-danger/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-4 h-4 text-accent-danger animate-pulse" />
              <span className="text-sm font-medium text-accent-danger">异常设备</span>
            </div>
            <div className="flex gap-3 overflow-x-auto">
              {offlineDevices.map((hb) => (
                <span key={hb.crane_id} className="text-xs text-text-secondary shrink-0">
                  <span className="text-text-muted">[离线]</span> {getCraneName(hb.crane_id)}
                </span>
              ))}
              {alarmDevices.map((hb) => (
                <span key={hb.crane_id} className="text-xs text-text-secondary shrink-0">
                  <span className="text-accent-danger">[报警]</span> {getCraneName(hb.crane_id)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 gap-4">
        <div className={cn('flex flex-col gap-2 transition-all duration-300', selectedCraneId ? 'w-96 shrink-0' : 'w-full')}>
          <div className="flex-1 overflow-y-auto space-y-2">
            {heartbeats.map((hb) => {
              const progress = progressMap[hb.crane_id]
              const isSelected = selectedCraneId === hb.crane_id
              const craneName = getCraneName(hb.crane_id)
              const craneModel = getCraneModel(hb.crane_id)
              const crane = cranes.find((c) => c.id === hb.crane_id)
              const craneStatus = crane?.status || 'offline'

              return (
                <div
                  key={hb.crane_id}
                  onClick={() => selectCrane(isSelected ? null : hb.crane_id)}
                  className={cn(
                    'glass-card p-4 cursor-pointer transition-all duration-200',
                    isSelected && 'border-accent-primary shadow-glow-primary',
                    hb.status === 'offline' && 'border-accent-danger/20',
                    hb.status === 'alarm' && 'border-accent-danger/40'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-text-primary">{craneName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary rounded text-text-muted">
                        {craneModel}
                      </span>
                    </div>
                    <StatusBadge status={craneStatus as 'online' | 'offline' | 'alarm'} />
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span>心跳: {timeAgo(hb.last_heartbeat_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Signal className="w-3 h-3 text-text-muted" />
                      <span>延迟: <span className={cn(hb.latency_ms > 100 ? 'text-accent-warning' : 'text-accent-secondary')}>{hb.latency_ms.toFixed(1)}ms</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Radio className="w-3 h-3 text-text-muted" />
                      <span>间隔: {formatMs(hb.heartbeat_interval_ms)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <RotateCcw className="w-3 h-3 text-text-muted" />
                      <span>重连: {hb.reconnect_count}次</span>
                    </div>
                  </div>

                  {progress && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-text-muted">心跳进度</span>
                        <span className={cn(
                          progress.isOverdue ? 'text-accent-danger' : progress.percentage > 80 ? 'text-accent-warning' : 'text-accent-secondary'
                        )}>
                          {progress.isOverdue ? '超时' : `${Math.round(progress.percentage)}%`}
                        </span>
                      </div>
                      <HeartbeatBar percentage={progress.percentage} isOverdue={progress.isOverdue} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border-primary/50">
                    <span className="text-[10px] text-text-muted">
                      {formatTimestamp(hb.last_heartbeat_at)}
                    </span>
                    <div className="flex-1" />
                    {hb.status === 'offline' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReconnect(hb.crane_id)
                        }}
                        disabled={reconnecting === hb.crane_id}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all',
                          reconnecting === hb.crane_id
                            ? 'bg-bg-tertiary text-text-muted cursor-wait'
                            : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20'
                        )}
                      >
                        {reconnecting === hb.crane_id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        重连
                      </button>
                    )}
                    {hb.status === 'online' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSimulateOffline(hb.crane_id)
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-accent-danger/10 text-accent-danger hover:bg-accent-danger/20 transition-all"
                      >
                        <WifiOff className="w-3 h-3" />
                        模拟离线
                      </button>
                    )}
                    {reconnectMsg[hb.crane_id] && (
                      <span className={cn(
                        'text-[10px] px-2 py-1 rounded',
                        reconnectMsg[hb.crane_id].includes('成功') ? 'bg-accent-secondary/10 text-accent-secondary' : 'bg-accent-danger/10 text-accent-danger'
                      )}>
                        {reconnectMsg[hb.crane_id]}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selectedCraneId && selectedHb && (
          <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
            <div className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-lg">{getCraneName(selectedCraneId)}</span>
                <span className="text-xs px-2 py-0.5 bg-bg-tertiary rounded text-text-muted">
                  {getCraneModel(selectedCraneId)}
                </span>
                <StatusBadge status={selectedHb.status} />
              </div>
              <button
                onClick={() => selectCrane(null)}
                className="p-1 rounded hover:bg-bg-tertiary transition-colors"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            <div className="glass-card p-5 space-y-4">
              <h3 className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent-primary" />
                心跳详情
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="data-value text-lg">{timeAgo(selectedHb.last_heartbeat_at)}</div>
                  <div className="data-label">最近心跳</div>
                  <div className="text-[10px] text-text-muted mt-1">{formatTimestamp(selectedHb.last_heartbeat_at)}</div>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <div className={cn('data-value text-lg', STATUS_COLORS[selectedHb.status])}>
                    {selectedHb.status === 'online' ? '在线' : selectedHb.status === 'offline' ? '离线' : '报警'}
                  </div>
                  <div className="data-label">当前状态</div>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="data-value text-lg">{selectedHb.latency_ms.toFixed(1)}<span className="text-sm text-text-muted ml-1">ms</span></div>
                  <div className="data-label">网络延迟</div>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="data-value text-lg">{formatMs(selectedHb.heartbeat_interval_ms)}</div>
                  <div className="data-label">心跳间隔</div>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="data-value text-lg">{selectedHb.reconnect_count}<span className="text-sm text-text-muted ml-1">次</span></div>
                  <div className="data-label">重连次数</div>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="data-value text-lg">
                    {progressMap[selectedCraneId] ? `${Math.round(progressMap[selectedCraneId].percentage)}%` : '-'}
                  </div>
                  <div className="data-label">心跳进度</div>
                </div>
              </div>

              {progressMap[selectedCraneId] && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">心跳超时倒计时</span>
                    <span className="text-text-muted text-xs">
                      已过 {formatMs(progressMap[selectedCraneId].elapsed)} / 阈值 {formatMs(progressMap[selectedCraneId].threshold)}
                    </span>
                  </div>
                  <HeartbeatBar
                    percentage={progressMap[selectedCraneId].percentage}
                    isOverdue={progressMap[selectedCraneId].isOverdue}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedHb.status === 'offline' && (
                  <button
                    type="button"
                    onClick={() => handleReconnect(selectedCraneId)}
                    disabled={reconnecting === selectedCraneId}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    手动重连
                  </button>
                )}
                {selectedHb.status === 'online' && (
                  <button
                    type="button"
                    onClick={() => handleSimulateOffline(selectedCraneId)}
                    className="btn-danger flex items-center gap-2"
                  >
                    <WifiOff className="w-4 h-4" />
                    模拟离线
                  </button>
                )}
              </div>
            </div>

            <div className="glass-card p-5 space-y-4">
              <h3 className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-accent-primary" />
                重连策略
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="p-1.5 rounded bg-accent-primary/10 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-accent-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">心跳超时判定</div>
                    <div className="text-text-muted text-xs mt-0.5">
                      超过心跳间隔3倍（{formatMs(selectedHb.heartbeat_interval_ms * 3)}）未收到心跳包，自动判定为离线
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="p-1.5 rounded bg-accent-warning/10 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-accent-warning" />
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">自动报警</div>
                    <div className="text-text-muted text-xs mt-0.5">
                      设备异常离线后自动触发报警通知，并通过WebSocket实时推送给所有监控端
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="p-1.5 rounded bg-accent-secondary/10 shrink-0 mt-0.5">
                    <RotateCcw className="w-4 h-4 text-accent-secondary" />
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">重连策略</div>
                    <div className="text-text-muted text-xs mt-0.5">
                      支持手动重连，最多尝试5次。重连成功后自动恢复在线状态，重连失败则保持离线
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLogs && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">状态变更日志</h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {(selectedCraneId ? selectedLogs : statusLogs).map((log: DeviceStatusLog) => (
              <div key={log.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-border-primary/30">
                <span className="text-text-muted font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}.{String(new Date(log.timestamp).getMilliseconds()).padStart(3, '0')}
                </span>
                <span className="text-text-primary shrink-0">{getCraneName(log.crane_id)}</span>
                <span className={cn('font-medium', STATUS_COLORS[log.old_status])}>{log.old_status}</span>
                <span className="text-text-muted">→</span>
                <span className={cn('font-medium', STATUS_COLORS[log.new_status])}>{log.new_status}</span>
                <span className="text-text-muted">{REASON_MAP[log.reason] || log.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
