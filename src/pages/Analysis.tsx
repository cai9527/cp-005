import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Shield, Clock, Activity, BarChart3, AlertTriangle, ThermometerSun, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, PieChart, Pie, Cell,
} from 'recharts'
import { useCraneStore } from '@/stores/craneStore'
import { cn } from '@/lib/utils'

const sensorNameMap: Record<string, string> = {
  load: '起重量', moment: '力矩', radius: '幅度',
  height: '高度', rotation: '回转角度', wind: '风速',
}
const sensorTypes = ['load', 'moment', 'wind']
const radarAxes = ['载荷安全', '力矩安全', '风速安全', '幅度安全', '高度安全', '维保状态']

const tooltipStyle = {
  backgroundColor: '#1A2332',
  border: '1px solid #2A3A4E',
  borderRadius: 8,
  fontSize: 12,
}

interface RunStats {
  totalRunHours: number
  avgLoad: number
  maxLoad: number
  loadRate: number
  alertCount: number
  criticalCount: number
  warningCount: number
  safetyScore: number
}

interface DailyStat {
  date: string
  avgLoad: number
  maxLoad: number
  alertCount: number
}

interface TrendPoint {
  timestamp: string
  avgValue: number
  maxValue: number
  minValue: number
}

export default function Analysis() {
  const { cranes, fetchCranes } = useCraneStore()
  const [selectedCraneId, setSelectedCraneId] = useState<string>('')
  const [days, setDays] = useState<number>(7)
  const [stats, setStats] = useState<RunStats | null>(null)
  const [dailyData, setDailyData] = useState<DailyStat[]>([])
  const [sensorType, setSensorType] = useState<string>('load')
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async () => {
    if (!selectedCraneId) return
    try {
      const res = await fetch(`/api/analysis/stats/${selectedCraneId}`)
      const json = await res.json()
      if (json.success) setStats(json.data)
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }, [selectedCraneId])

  const fetchDaily = useCallback(async () => {
    if (!selectedCraneId) return
    try {
      const res = await fetch(`/api/analysis/daily/${selectedCraneId}?days=${days}`)
      const json = await res.json()
      if (json.success) setDailyData(json.data)
    } catch (e) {
      console.error('Failed to fetch daily data:', e)
    }
  }, [selectedCraneId, days])

  const fetchTrend = useCallback(async () => {
    if (!selectedCraneId) return
    try {
      const res = await fetch(`/api/analysis/trend/${selectedCraneId}?sensorType=${sensorType}&hours=24`)
      const json = await res.json()
      if (json.success) setTrendData(json.data)
    } catch (e) {
      console.error('Failed to fetch trend data:', e)
    }
  }, [selectedCraneId, sensorType])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchStats(), fetchDaily(), fetchTrend()])
    } finally {
      setTimeout(() => setRefreshing(false), 500)
    }
  }, [fetchStats, fetchDaily, fetchTrend])

  useEffect(() => {
    if (cranes.length === 0) fetchCranes()
  }, [])

  useEffect(() => {
    if (cranes.length > 0 && !selectedCraneId) {
      setSelectedCraneId(cranes[0].id)
    }
  }, [cranes])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchDaily()
  }, [fetchDaily])

  useEffect(() => {
    fetchTrend()
  }, [fetchTrend])

  const safetyColor = (score: number) =>
    score >= 80 ? 'text-accent-secondary' : score >= 60 ? 'text-accent-warning' : 'text-accent-danger'

  const radarData = radarAxes.map(axis => {
    if (!stats) return { dimension: axis, score: 0 }
    let score = 100
    if (axis === '载荷安全') score = 100 - (stats.loadRate > 80 ? (stats.loadRate - 80) * 3 : 0)
    else if (axis === '力矩安全') score = Math.max(0, 100 - stats.alertCount * 2)
    else if (axis === '风速安全') score = Math.max(0, 100 - stats.criticalCount * 15)
    else if (axis === '幅度安全') score = Math.max(0, 100 - stats.warningCount * 3)
    else if (axis === '高度安全') score = Math.max(0, 95 - stats.criticalCount * 8)
    else if (axis === '维保状态') {
      const crane = cranes.find(c => c.id === selectedCraneId)
      if (crane) {
        const daysSince = Math.floor((Date.now() - new Date(crane.last_maintenance).getTime()) / 86400000)
        score = Math.max(0, 100 - daysSince * 0.5)
      }
    }
    return { dimension: axis, score: Math.round(Math.max(0, Math.min(100, score))) }
  })

  const overallSafety = stats ? Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length) : 0

  const statsCards = stats
    ? [
        { label: '运行时长', value: `${stats.totalRunHours}h`, icon: Clock, color: 'text-accent-primary' },
        { label: '平均载荷', value: `${stats.avgLoad}t`, icon: Activity, color: 'text-accent-secondary' },
        { label: '最大载荷', value: `${stats.maxLoad}t`, icon: BarChart3, color: 'text-accent-warning' },
        { label: '载荷率', value: `${stats.loadRate}%`, icon: TrendingUp, color: 'text-accent-primary' },
        { label: '安全评分', value: `${stats.safetyScore}/100`, icon: Shield, color: safetyColor(stats.safetyScore) },
      ]
    : []

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">数据分析</h2>
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
      </div>

      <div className="flex items-center gap-3">
        <select
          value={selectedCraneId}
          onChange={e => setSelectedCraneId(e.target.value)}
          className="input-field w-48"
        >
          {cranes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          {[7, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                days === d
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                  : 'bg-bg-tertiary text-text-secondary border border-border-primary hover:text-text-primary'
              )}
            >
              近{d}天
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {statsCards.map(card => (
          <div key={card.label} className="glass-card p-4 flex items-center gap-3">
            <card.icon className={cn('w-5 h-5', card.color)} />
            <div>
              <div className="data-label">{card.label}</div>
              <div className={cn('font-display font-bold text-lg', card.color)}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">每日运行统计</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4E" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#718096' }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis yAxisId="load" tick={{ fontSize: 10, fill: '#718096' }} width={40} />
            <YAxis yAxisId="alert" orientation="right" tick={{ fontSize: 10, fill: '#718096' }} width={30} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="load" dataKey="avgLoad" name="平均载荷" fill="#00D4FF" radius={[2, 2, 0, 0]} />
            <Bar yAxisId="load" dataKey="maxLoad" name="最大载荷" fill="#00E676" radius={[2, 2, 0, 0]} />
            <Line yAxisId="alert" type="monotone" dataKey="alertCount" name="报警次数" stroke="#FF6B35" strokeWidth={2} dot={{ r: 3 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-secondary">趋势分析</h3>
          <div className="flex gap-2">
            {sensorTypes.map(t => (
              <button
                key={t}
                onClick={() => setSensorType(t)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs transition-all duration-200',
                  sensorType === t
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                    : 'bg-bg-tertiary text-text-secondary border border-border-primary hover:text-text-primary'
                )}
              >
                {sensorNameMap[t]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4E" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#718096' }} tickFormatter={(v: string) => v.slice(11, 16)} />
            <YAxis tick={{ fontSize: 10, fill: '#718096' }} width={40} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(v: string) => v.slice(11, 19)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="avgValue" name="平均值" stroke="#00D4FF" strokeWidth={2} dot={false} fill="#00D4FF" fillOpacity={0.1} />
            <Line type="monotone" dataKey="maxValue" name="最大值" stroke="#FF6B35" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="minValue" name="最小值" stroke="#00E676" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">安全评估</h3>
        <div className="flex items-center gap-8">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2A3A4E" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#A0AEC0' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#718096' }} />
              <Radar name="安全评分" dataKey="score" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className={cn('font-display font-bold text-5xl', safetyColor(overallSafety))}>
              {overallSafety}
            </div>
            <div className="text-text-secondary text-sm mt-1">综合安全评分</div>
          </div>
        </div>
      </div>
    </div>
  )
}
