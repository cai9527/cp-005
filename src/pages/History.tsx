import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, BarChart, Bar,
} from 'recharts'
import { useCraneStore } from '@/stores/craneStore'
import { Search, Calendar, Download, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const sensorNameMap: Record<string, string> = {
  load: '起重量', moment: '力矩', radius: '幅度',
  height: '高度', rotation: '回转角度', wind: '风速',
}
const sensorUnitMap: Record<string, string> = {
  load: 't', moment: 't·m', radius: 'm',
  height: 'm', rotation: '°', wind: 'm/s',
}
const sensorColorMap: Record<string, string> = {
  load: '#00E676', moment: '#00D4FF', radius: '#FFD600',
  height: '#FF6B35', rotation: '#A855F7', wind: '#F472B6',
}
const allSensorTypes = ['load', 'moment', 'radius', 'height', 'rotation', 'wind']

const tooltipStyle = {
  backgroundColor: '#1A2332',
  border: '1px solid #2A3A4E',
  borderRadius: 8,
  fontSize: 12,
}

interface HistoryDataPoint {
  timestamp: string
  [key: string]: number | string
}

export default function History() {
  const { cranes, fetchCranes } = useCraneStore()
  const [selectedCraneId, setSelectedCraneId] = useState<string>('')
  const [selectedSensors, setSelectedSensors] = useState<string[]>(['load', 'moment', 'wind'])
  const [timeRange, setTimeRange] = useState<string>('1h')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cranes.length === 0) fetchCranes()
  }, [])

  useEffect(() => {
    if (cranes.length > 0 && !selectedCraneId) {
      setSelectedCraneId(cranes[0].id)
    }
  }, [cranes])

  useEffect(() => {
    if (!selectedCraneId) return
    fetchHistoryData()
  }, [selectedCraneId, timeRange, selectedSensors])

  const getTimeRange = () => {
    const end = new Date()
    const start = new Date()
    switch (timeRange) {
      case '1h': start.setHours(start.getHours() - 1); break
      case '6h': start.setHours(start.getHours() - 6); break
      case '24h': start.setHours(start.getHours() - 24); break
      case '7d': start.setDate(start.getDate() - 7); break
      case '30d': start.setDate(start.getDate() - 30); break
      default: start.setHours(start.getHours() - 1)
    }
    return { start, end }
  }

  const getInterval = () => {
    switch (timeRange) {
      case '1h': return '1m'
      case '6h': return '5m'
      case '24h': return '15m'
      case '7d': return '1h'
      case '30d': return '1d'
      default: return '5m'
    }
  }

  const fetchHistoryData = async () => {
    setLoading(true)
    try {
      const { start, end } = getTimeRange()
      const fmt = (d: Date) => d.toISOString()
      const res = await fetch(
        `/api/sensor-data/history?craneId=${selectedCraneId}&startTime=${fmt(start)}&endTime=${fmt(end)}&interval=${getInterval()}&aggregated=true`
      )
      const json = await res.json()
      if (json.success) {
        setRawData(json.data)
        const pivoted: Record<string, HistoryDataPoint> = {}
        for (const d of json.data) {
          if (!pivoted[d.timestamp]) {
            pivoted[d.timestamp] = { timestamp: d.timestamp }
          }
          pivoted[d.timestamp][d.sensor_type] = d.avg_value
        }
        setHistoryData(Object.values(pivoted).sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ))
      }
    } catch (e) {
      console.error('Failed to fetch history data:', e)
    } finally {
      setLoading(false)
    }
  }

  const toggleSensor = (type: string) => {
    setSelectedSensors(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const formatTimeLabel = (ts: string) => {
    if (timeRange === '7d' || timeRange === '30d') {
      return ts.slice(5, 10)
    }
    return ts.slice(11, 16)
  }

  const exportData = () => {
    if (rawData.length === 0) return
    const headers = ['时间', '传感器类型', '平均值', '最大值', '最小值']
    const rows = rawData.map(d => [
      d.timestamp,
      sensorNameMap[d.sensor_type] || d.sensor_type,
      d.avg_value.toFixed(2),
      d.max_value.toFixed(2),
      d.min_value.toFixed(2),
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sensor_history_${selectedCraneId}_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const timeRanges = [
    { value: '1h', label: '近1小时' },
    { value: '6h', label: '近6小时' },
    { value: '24h', label: '近24小时' },
    { value: '7d', label: '近7天' },
    { value: '30d', label: '近30天' },
  ]

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">历史数据</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistoryData}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            刷新
          </button>
          <button
            onClick={exportData}
            className="btn-primary flex items-center gap-2"
            disabled={rawData.length === 0}
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">塔机:</span>
            <select
              value={selectedCraneId}
              onChange={(e) => setSelectedCraneId(e.target.value)}
              className="input-field w-48"
            >
              {cranes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-secondary">时间范围:</span>
            <div className="flex gap-1">
              {timeRanges.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setTimeRange(r.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs transition-all duration-200',
                    timeRange === r.value
                      ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                      : 'bg-bg-tertiary text-text-secondary border border-border-primary hover:text-text-primary'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">图表:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setChartType('line')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-all duration-200',
                  chartType === 'line'
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                    : 'bg-bg-tertiary text-text-secondary border border-border-primary hover:text-text-primary'
                )}
              >
                折线图
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-all duration-200',
                  chartType === 'bar'
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                    : 'bg-bg-tertiary text-text-secondary border border-border-primary hover:text-text-primary'
                )}
              >
                柱状图
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-text-secondary mr-2">传感器:</span>
          {allSensorTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleSensor(type)}
              className={cn(
                'px-3 py-1 rounded-full text-xs transition-all duration-200 border',
                selectedSensors.includes(type)
                  ? 'border-transparent text-white'
                  : 'border-border-primary text-text-muted hover:text-text-secondary'
              )}
              style={{
                backgroundColor: selectedSensors.includes(type) ? sensorColorMap[type] : 'transparent',
              }}
            >
              {sensorNameMap[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-4 flex-1 min-h-[400px]">
        <h3 className="text-sm font-medium text-text-secondary mb-3">数据趋势</h3>
        {historyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={380}>
            {chartType === 'line' ? (
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4E" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10, fill: '#718096' }}
                  tickFormatter={formatTimeLabel}
                />
                <YAxis tick={{ fontSize: 10, fill: '#718096' }} width={50} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v: string) => v}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {selectedSensors.map((type) => (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey={type}
                    name={sensorNameMap[type]}
                    stroke={sensorColorMap[type]}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4E" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10, fill: '#718096' }}
                  tickFormatter={formatTimeLabel}
                />
                <YAxis tick={{ fontSize: 10, fill: '#718096' }} width={50} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v: string) => v}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {selectedSensors.map((type) => (
                  <Bar
                    key={type}
                    dataKey={type}
                    name={sensorNameMap[type]}
                    fill={sensorColorMap[type]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[380px] text-text-muted">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        )}
      </div>

      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">数据明细</h3>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-secondary">
              <tr className="text-text-muted text-xs">
                <th className="text-left py-2 px-3 font-medium">时间</th>
                {selectedSensors.map((type) => (
                  <th key={type} className="text-right py-2 px-3 font-medium">
                    {sensorNameMap[type]} ({sensorUnitMap[type]})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyData.slice(-50).reverse().map((row, idx) => (
                <tr key={idx} className="border-t border-border-primary/50 hover:bg-bg-tertiary/30">
                  <td className="py-2 px-3 text-text-secondary font-mono text-xs">
                    {row.timestamp}
                  </td>
                  {selectedSensors.map((type) => (
                    <td key={type} className="text-right py-2 px-3 text-text-primary font-mono">
                      {typeof row[type] === 'number'
                        ? (row[type] as number).toFixed(2)
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
              {historyData.length === 0 && (
                <tr>
                  <td
                    colSpan={selectedSensors.length + 1}
                    className="text-center py-8 text-text-muted"
                  >
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
