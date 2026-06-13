import { useEffect, useState, useCallback } from 'react'
import { Wifi, WifiOff, AlertTriangle, X, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useCraneStore } from '@/stores/craneStore'
import { useAlertStore } from '@/stores/alertStore'
import GaugeChart from '@/components/GaugeChart'
import StatusBadge from '@/components/StatusBadge'
import AlertBadge from '@/components/AlertBadge'
import { cn } from '@/lib/utils'

const sensorNames: Record<string, string> = {
  load: '起重量', moment: '力矩', radius: '幅度',
  height: '高度', rotation: '回转角度', wind: '风速',
}
const sensorUnits: Record<string, string> = {
  load: 't', moment: 't·m', radius: 'm',
  height: 'm', rotation: '°', wind: 'm/s',
}
const sensorColors: Record<string, string> = {
  load: '#00E676', moment: '#00D4FF', radius: '#FFD600',
  height: '#FF6B35', rotation: '#A855F7', wind: '#F472B6',
}
const chartTypes = ['load', 'moment', 'radius', 'height', 'rotation', 'wind']
const miniTypes = ['load', 'height', 'wind']

export default function Monitor() {
  const {
    cranes, sensorData, stats, selectedCraneId, selectCrane,
    fetchCranes, fetchCraneStats, fetchLatestSensorData,
  } = useCraneStore()
  const { activeAlerts, fetchActiveAlerts } = useAlertStore()
  const [historyData, setHistoryData] = useState<Record<string, any>[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadHistoryData = useCallback(async () => {
    if (!selectedCraneId) {
      setHistoryData([])
      return
    }
    const end = new Date()
    const start = new Date(end.getTime() - 5 * 60 * 1000)
    const fmt = (d: Date) => d.toISOString()
    try {
      const res = await fetch(
        `/api/sensor-data/history?craneId=${selectedCraneId}&startTime=${fmt(start)}&endTime=${fmt(end)}&interval=1m&aggregated=true`
      )
      const json = await res.json()
      if (json.success) {
        const pivoted: Record<string, any> = {}
        for (const d of json.data) {
          if (!pivoted[d.timestamp]) pivoted[d.timestamp] = { time: d.timestamp }
          pivoted[d.timestamp][d.sensor_type] = d.avg_value
        }
        setHistoryData(Object.values(pivoted))
      }
    } catch (e) {
      console.error('Failed to load history data:', e)
    }
  }, [selectedCraneId])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchCranes(),
        fetchCraneStats(),
        fetchLatestSensorData(),
        fetchActiveAlerts(),
        loadHistoryData(),
      ])
    } finally {
      setTimeout(() => setRefreshing(false), 500)
    }
  }, [fetchCranes, fetchCraneStats, fetchLatestSensorData, fetchActiveAlerts, loadHistoryData])

  const selectedCrane = cranes.find(c => c.id === selectedCraneId)
  const craneAlerts = activeAlerts.filter(a => a.crane_id === selectedCraneId)
  const latestAlerts = activeAlerts.slice(0, 10)

  useEffect(() => {
    loadHistoryData()
  }, [loadHistoryData])

  const getSensorValue = (type: string) => {
    const sensors = sensorData[selectedCraneId || ''] || []
    return sensors.find(s => s.sensor_type === type)?.value ?? 0
  }

  const gaugeConfigs = selectedCrane
    ? [
        { type: 'load', max: selectedCrane.max_load },
        { type: 'moment', max: selectedCrane.max_moment },
        { type: 'radius', max: selectedCrane.max_radius },
        { type: 'height', max: selectedCrane.max_height },
        { type: 'rotation', max: 360 },
        { type: 'wind', max: 40 },
      ]
    : []

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">实时监控</h2>
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
          刷新数据
        </button>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        <div
          className={cn(
            'flex flex-col gap-4 transition-all duration-300',
            selectedCraneId ? 'w-80 shrink-0' : 'w-full'
          )}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 flex items-center gap-3">
              <Wifi className="w-5 h-5 text-accent-secondary" />
              <div>
                <div className="data-label">在线数</div>
                <div className="font-display font-bold text-lg text-accent-secondary">{stats.online}</div>
              </div>
            </div>
            <div className="glass-card p-3 flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-text-muted" />
              <div>
                <div className="data-label">离线数</div>
                <div className="font-display font-bold text-lg text-text-muted">{stats.offline}</div>
              </div>
            </div>
            <div className="glass-card p-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-danger" />
              <div>
                <div className="data-label">报警数</div>
                <div className="font-display font-bold text-lg text-accent-danger">{stats.alarm}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {cranes.map(crane => {
              const sensors = sensorData[crane.id] || []
              const getValue = (type: string) =>
                sensors.find(s => s.sensor_type === type)?.value ?? 0
              return (
                <div
                  key={crane.id}
                  onClick={() => selectCrane(crane.id)}
                  className={cn(
                    'glass-card p-3 cursor-pointer transition-all duration-200 hover:shadow-glow-primary',
                    selectedCraneId === crane.id && 'border-accent-primary shadow-glow-primary'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-text-primary">{crane.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary rounded text-text-muted">
                        {crane.model}
                      </span>
                    </div>
                    <StatusBadge status={crane.status} />
                  </div>
                  <div className="flex gap-3 text-xs">
                    {miniTypes.map(type => (
                      <span key={type} className="text-text-secondary">
                        {sensorNames[type]}:{' '}
                        <span className="text-text-primary font-medium">
                          {getValue(type)}
                          {sensorUnits[type]}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selectedCraneId && selectedCrane && (
          <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
            <div className="glass-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-lg">{selectedCrane.name}</span>
                <span className="text-xs px-2 py-0.5 bg-bg-tertiary rounded text-text-muted">
                  {selectedCrane.model}
                </span>
                <StatusBadge status={selectedCrane.status} />
              </div>
              <button
                onClick={() => selectCrane(null)}
                className="p-1 rounded hover:bg-bg-tertiary transition-colors"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            <div className="glass-card p-4">
              <div className="grid grid-cols-3 gap-4 justify-items-center">
                {gaugeConfigs.map(cfg => (
                  <GaugeChart
                    key={cfg.type}
                    value={getSensorValue(cfg.type)}
                    max={cfg.max}
                    label={sensorNames[cfg.type]}
                    unit={sensorUnits[cfg.type]}
                  />
                ))}
              </div>
            </div>

            <div className="glass-card p-4 flex-1 min-h-[200px]">
              <h3 className="text-sm font-medium text-text-secondary mb-3">实时曲线</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={historyData}>
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#718096' }}
                    tickFormatter={(v: string) => v.slice(11, 16)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#718096' }} width={40} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A2332',
                      border: '1px solid #2A3A4E',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(v: string) => v.slice(11, 19)}
                  />
                  {chartTypes.map(type => (
                    <Line
                      key={type}
                      type="monotone"
                      dataKey={type}
                      name={sensorNames[type]}
                      stroke={sensorColors[type]}
                      dot={false}
                      strokeWidth={1.5}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {craneAlerts.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="text-sm font-medium text-text-secondary mb-2">当前报警</h3>
                <div className="space-y-2">
                  {craneAlerts.map(alert => (
                    <div key={alert.id} className="flex items-center gap-2 text-sm">
                      <AlertBadge level={alert.level} />
                      <span className="text-text-primary">{alert.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {latestAlerts.length > 0 && (
        <div className="glass-card py-2 px-4 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap gap-6">
            {latestAlerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-2 text-sm shrink-0">
                <AlertBadge level={alert.level} />
                <span className="text-text-primary font-medium">
                  {alert.crane_name || alert.crane_id}
                </span>
                <span className="text-text-secondary max-w-[200px] truncate">{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
