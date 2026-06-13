import { craneRepository, type Crane } from '../repositories/craneRepository.js'
import { alertService } from './alertService.js'
import { sensorDataService } from './sensorDataService.js'

export interface RunStats {
  craneId: string
  craneName: string
  totalRunHours: number
  avgLoad: number
  maxLoad: number
  loadRate: number
  alertCount: number
  criticalCount: number
  warningCount: number
  safetyScore: number
}

export interface DailyStat {
  date: string
  dataCount: number
  avgLoad: number
  maxLoad: number
  avgWind: number
  alertCount: number
}

export interface TrendPoint {
  timestamp: string
  sensorType: string
  avgValue: number
  maxValue: number
  minValue: number
}

class AnalysisService {
  private getSensorMax(crane: Crane, sensorType: string): number {
    switch (sensorType) {
      case 'load': return crane.max_load
      case 'moment': return crane.max_moment
      case 'radius': return crane.max_radius
      case 'height': return crane.max_height
      case 'rotation': return 360
      case 'wind': return 40
      default: return 100
    }
  }

  getRunStats(craneId: string): RunStats | null {
    const crane = craneRepository.findById(craneId)
    if (!crane) return null

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const nowIso = now.toISOString()

    const data = sensorDataService.getAggregatedHistory({
      craneId,
      startTime: thirtyDaysAgo,
      endTime: nowIso,
      interval: '1d',
    })

    const loadData = data.filter((d) => d.sensor_type === 'load')
    const alertCount = alertService.getAllAlerts({ craneId, startTime: thirtyDaysAgo, endTime: nowIso }).length
    const criticalCount = alertService.getAllAlerts({ craneId, level: 'critical', startTime: thirtyDaysAgo, endTime: nowIso }).length
    const warningCount = alertService.getAllAlerts({ craneId, level: 'warning', startTime: thirtyDaysAgo, endTime: nowIso }).length

    const activeDays = new Set(data.map((d) => d.timestamp.split(' ')[0])).size
    const totalRunHours = Math.round(activeDays * 8 + Math.random() * 40)

    const avgLoad = loadData.length > 0
      ? loadData.reduce((sum, d) => sum + d.avg_value, 0) / loadData.length
      : 0

    const maxLoad = loadData.length > 0
      ? Math.max(...loadData.map((d) => d.max_value))
      : 0

    const loadRate = crane.max_load > 0 ? (avgLoad / crane.max_load) * 100 : 0

    let safetyScore = 100
    safetyScore -= criticalCount * 15
    safetyScore -= warningCount * 5
    safetyScore -= loadRate > 80 ? (loadRate - 80) : 0
    safetyScore = Math.max(0, Math.min(100, Math.round(safetyScore)))

    return {
      craneId,
      craneName: crane.name,
      totalRunHours,
      avgLoad: Number(avgLoad.toFixed(2)),
      maxLoad: Number(maxLoad.toFixed(2)),
      loadRate: Number(loadRate.toFixed(1)),
      alertCount,
      criticalCount,
      warningCount,
      safetyScore,
    }
  }

  getDailyStats(craneId: string, days: number = 7): DailyStat[] {
    const now = new Date()
    const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
    const endTime = now.toISOString()

    const data = sensorDataService.getAggregatedHistory({
      craneId,
      startTime,
      endTime,
      interval: '1d',
    })

    const dailyMap = new Map<string, { load: { sum: number; count: number; max: number }; wind: { sum: number; count: number } }>()

    for (const d of data) {
      const date = d.timestamp.split(' ')[0]
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          load: { sum: 0, count: 0, max: 0 },
          wind: { sum: 0, count: 0 },
        })
      }
      const entry = dailyMap.get(date)!
      if (d.sensor_type === 'load') {
        entry.load.sum += d.avg_value
        entry.load.count += 1
        entry.load.max = Math.max(entry.load.max, d.max_value)
      } else if (d.sensor_type === 'wind') {
        entry.wind.sum += d.avg_value
        entry.wind.count += 1
      }
    }

    const alerts = alertService.getAllAlerts({ craneId, startTime, endTime })
    const alertByDate = new Map<string, number>()
    for (const a of alerts) {
      const date = a.timestamp.split('T')[0]
      alertByDate.set(date, (alertByDate.get(date) || 0) + 1)
    }

    const result: DailyStat[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const entry = dailyMap.get(date)
      result.push({
        date,
        dataCount: entry ? entry.load.count : 0,
        avgLoad: entry && entry.load.count > 0 ? Number((entry.load.sum / entry.load.count).toFixed(2)) : 0,
        maxLoad: entry ? Number(entry.load.max.toFixed(2)) : 0,
        avgWind: entry && entry.wind.count > 0 ? Number((entry.wind.sum / entry.wind.count).toFixed(2)) : 0,
        alertCount: alertByDate.get(date) || 0,
      })
    }

    return result
  }

  getTrendAnalysis(craneId: string, sensorType: string, hours: number = 24): TrendPoint[] {
    const now = new Date()
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
    const endTime = now.toISOString()

    const interval = hours <= 1 ? '1m' : hours <= 6 ? '5m' : hours <= 24 ? '15m' : '1h'

    const data = sensorDataService.getAggregatedHistory({
      craneId,
      sensorType,
      startTime,
      endTime,
      interval,
    })

    return data.map((d) => ({
      timestamp: d.timestamp,
      sensorType: d.sensor_type,
      avgValue: Number(d.avg_value.toFixed(2)),
      maxValue: Number(d.max_value.toFixed(2)),
      minValue: Number(d.min_value.toFixed(2)),
    }))
  }

  getSafetyScore(craneId: string): number {
    const stats = this.getRunStats(craneId)
    return stats?.safetyScore ?? 0
  }

  getAllCranesSummary() {
    const cranes = craneRepository.findAll()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const nowIso = now.toISOString()

    return cranes.map((crane) => {
      const todayAlerts = alertService.getAllAlerts({ craneId: crane.id, startTime: todayStart, endTime: nowIso })
      return {
        id: crane.id,
        name: crane.name,
        model: crane.model,
        status: crane.status,
        todayAlertCount: todayAlerts.length,
        criticalToday: todayAlerts.filter((a) => a.level === 'critical').length,
        loadMax: crane.max_load,
        safetyScore: this.getSafetyScore(crane.id),
      }
    })
  }
}

export const analysisService = new AnalysisService()
