import { useEffect, useState } from 'react'
import { useCraneStore } from '@/stores/craneStore'
import { useAlertStore } from '@/stores/alertStore'
import { useParams, useNavigate } from 'react-router-dom'
import GaugeChart from '@/components/GaugeChart'
import StatusBadge from '@/components/StatusBadge'
import AlertBadge from '@/components/AlertBadge'
import { ArrowLeft, MapPin, Calendar, Wrench, Settings, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const SENSOR_NAMES: Record<string, string> = {
  load: '起重量', moment: '力矩', radius: '幅度',
  height: '高度', rotation: '回转角度', wind: '风速',
}
const SENSOR_UNITS: Record<string, string> = {
  load: 't', moment: 't·m', radius: 'm',
  height: 'm', rotation: '°', wind: 'm/s',
}
const SENSOR_MAX: Record<string, number> = {
  load: 12, moment: 200, radius: 70,
  height: 200, rotation: 360, wind: 30,
}
const SENSOR_ORDER = ['load', 'moment', 'radius', 'height', 'rotation', 'wind']

interface SensorInfo {
  id: string
  type: string
  unit: string
  min_value: number
  max_value: number
  status: 'normal' | 'warning' | 'alarm'
}

const statusColor = {
  normal: 'bg-accent-secondary',
  warning: 'bg-accent-warning',
  alarm: 'bg-accent-danger',
}

export default function CraneDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { cranes, sensorData, fetchLatestByCrane } = useCraneStore()
  const { activeAlerts } = useAlertStore()
  const [sensors, setSensors] = useState<SensorInfo[]>([])

  const crane = cranes.find((c) => c.id === id)
  const data = id ? sensorData[id] || [] : []
  const craneAlerts = activeAlerts.filter((a) => a.crane_id === id)

  useEffect(() => {
    if (!id) return
    fetchLatestByCrane(id)
    fetch(`/api/cranes/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.sensors) {
          setSensors(json.data.sensors)
        }
      })
      .catch(() => {})
  }, [id, fetchLatestByCrane])

  useEffect(() => {
    if (!id) return
    const timer = setInterval(() => {
      fetchLatestByCrane(id)
    }, 5000)
    return () => clearInterval(timer)
  }, [id, fetchLatestByCrane])

  if (!crane) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        塔机未找到
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/cranes')}
          className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold text-text-primary">{crane.name}</h2>
          <span className="bg-bg-tertiary px-2 py-0.5 rounded text-xs text-text-secondary">
            {crane.model}
          </span>
          <StatusBadge status={crane.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
              <Settings className="w-4 h-4 text-accent-primary" />
              基本信息
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <span>安装日期: {crane.install_date}</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Wrench className="w-3.5 h-3.5 text-text-muted" />
                <span>最近维保: {crane.last_maintenance}</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <MapPin className="w-3.5 h-3.5 text-text-muted" />
                <span>安装位置: ({crane.location_x}, {crane.location_y})</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="text-text-muted w-3.5 text-center text-xs">M</span>
                <span>型号: {crane.model}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h3 className="font-display text-base font-semibold text-text-primary">技术参数</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '额定起重量', value: crane.max_load, unit: 't' },
                { label: '最大力矩', value: crane.max_moment, unit: 't·m' },
                { label: '最大幅度', value: crane.max_radius, unit: 'm' },
                { label: '最大高度', value: crane.max_height, unit: 'm' },
              ].map((item) => (
                <div key={item.label} className="bg-bg-tertiary/50 rounded-lg p-3">
                  <div className="data-value text-lg">{item.value}</div>
                  <div className="data-label">{item.label} ({item.unit})</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h3 className="font-display text-base font-semibold text-text-primary">传感器状态</h3>
            <div className="space-y-2">
              {sensors.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn('status-dot', statusColor[s.status])} />
                    <span className="text-text-secondary">{SENSOR_NAMES[s.type] || s.type}</span>
                  </div>
                  <span className="text-text-muted text-xs">{s.unit}</span>
                </div>
              ))}
              {sensors.length === 0 && (
                <span className="text-text-muted text-sm">暂无传感器数据</span>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-display text-base font-semibold text-text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-primary" />
              实时数据
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {SENSOR_ORDER.map((type) => {
                const sensor = data.find((d) => d.sensor_type === type)
                return (
                  <GaugeChart
                    key={type}
                    value={sensor ? Number(sensor.value.toFixed(1)) : 0}
                    max={SENSOR_MAX[type]}
                    label={SENSOR_NAMES[type]}
                    unit={SENSOR_UNITS[type]}
                  />
                )
              })}
            </div>
          </div>

          {craneAlerts.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <h3 className="font-display text-base font-semibold text-text-primary">活跃告警</h3>
              <div className="space-y-2">
                {craneAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between bg-bg-tertiary/50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AlertBadge level={alert.level} />
                      <span className="text-sm text-text-primary">{alert.message}</span>
                    </div>
                    <span className="text-xs text-text-muted">{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
