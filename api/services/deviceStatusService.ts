import { getDatabase } from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'
import { craneRepository } from '../repositories/craneRepository.js'
import { wsService } from './wsService.js'

export interface DeviceHeartbeat {
  id: string
  crane_id: string
  last_heartbeat_at: string
  heartbeat_interval_ms: number
  status: 'online' | 'offline' | 'alarm'
  reconnect_count: number
  latency_ms: number
  created_at: string
  updated_at: string
}

export interface DeviceStatusLog {
  id: string
  crane_id: string
  old_status: string
  new_status: string
  reason: string
  timestamp: string
}

const DEFAULT_HEARTBEAT_INTERVAL_MS = 25000
const OFFLINE_THRESHOLD_MULTIPLIER = 3
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BACKOFF_BASE_MS = 2000
const MONITOR_INTERVAL_MS = 5000

class DeviceStatusService {
  private db = getDatabase()
  private monitorIntervalId: NodeJS.Timeout | null = null
  private isMonitoring = false
  private simulatedHeartbeats: Map<string, { intervalId: NodeJS.Timeout; jitter: number }> = new Map()

  init(): void {
    this.startMonitoring()
    this.initSimulatedHeartbeats()
    console.log('[DeviceStatus] Service initialized, monitoring every', MONITOR_INTERVAL_MS, 'ms')
  }

  private initSimulatedHeartbeats(): void {
    const cranes = craneRepository.findAll()
    for (const crane of cranes) {
      const existing = this.getHeartbeat(crane.id)
      if (!existing) {
        this.registerDevice(crane.id, DEFAULT_HEARTBEAT_INTERVAL_MS)
      }
      if (crane.status !== 'offline') {
        this.startSimulatedHeartbeat(crane.id)
      }
    }
  }

  registerDevice(craneId: string, intervalMs: number = DEFAULT_HEARTBEAT_INTERVAL_MS): DeviceHeartbeat {
    const existing = this.getHeartbeat(craneId)
    if (existing) return existing

    const now = new Date().toISOString()
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO device_heartbeat (id, crane_id, last_heartbeat_at, heartbeat_interval_ms, status, reconnect_count, latency_ms, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'online', 0, 0, ?, ?)
    `).run(id, craneId, now, intervalMs, now, now)

    this.logStatusChange(craneId, 'unknown', 'online', 'device_registered')

    return this.getHeartbeat(craneId)!
  }

  receiveHeartbeat(craneId: string, latencyMs: number = 0): DeviceHeartbeat | null {
    let hb = this.getHeartbeat(craneId)
    if (!hb) {
      hb = this.registerDevice(craneId)
    }

    const now = new Date().toISOString()
    const oldStatus = hb.status

    this.db.prepare(`
      UPDATE device_heartbeat
      SET last_heartbeat_at = ?, status = 'online', latency_ms = ?, updated_at = ?
      WHERE crane_id = ?
    `).run(now, latencyMs, now, craneId)

    if (oldStatus === 'offline' || oldStatus === 'alarm') {
      this.db.prepare(`
        UPDATE device_heartbeat SET reconnect_count = reconnect_count + 1 WHERE crane_id = ?
      `).run(craneId)

      const crane = craneRepository.findById(craneId)
      if (crane && crane.status !== 'online') {
        craneRepository.updateStatus(craneId, 'online')
        wsService.broadcast('status_change', { craneId, status: 'online' })
      }

      this.logStatusChange(craneId, oldStatus, 'online', 'heartbeat_reconnected')
      console.log(`[DeviceStatus] Device ${craneId} reconnected (was ${oldStatus})`)
    }

    return this.getHeartbeat(craneId)
  }

  private checkOfflineDevices(): void {
    const now = Date.now()
    const heartbeats = this.db.prepare('SELECT * FROM device_heartbeat').all() as DeviceHeartbeat[]

    for (const hb of heartbeats) {
      if (hb.status === 'offline') continue

      const lastHbTime = new Date(hb.last_heartbeat_at).getTime()
      const elapsed = now - lastHbTime
      const threshold = hb.heartbeat_interval_ms * OFFLINE_THRESHOLD_MULTIPLIER

      if (elapsed > threshold) {
        const oldStatus = hb.status
        this.db.prepare(`
          UPDATE device_heartbeat SET status = 'offline', updated_at = ? WHERE crane_id = ?
        `).run(new Date().toISOString(), hb.crane_id)

        const crane = craneRepository.findById(hb.crane_id)
        if (crane && crane.status !== 'alarm') {
          craneRepository.updateStatus(hb.crane_id, 'offline')
          wsService.broadcast('status_change', { craneId: hb.crane_id, status: 'offline' })
        }

        this.logStatusChange(hb.crane_id, oldStatus, 'offline', 'heartbeat_timeout')

        wsService.broadcast('device_offline', {
          craneId: hb.crane_id,
          lastHeartbeat: hb.last_heartbeat_at,
          elapsedMs: elapsed,
          craneName: crane?.name || '未知设备',
        })

        console.log(`[DeviceStatus] Device ${hb.crane_id} offline (no heartbeat for ${Math.round(elapsed / 1000)}s)`)
      }
    }
  }

  startMonitoring(): void {
    if (this.isMonitoring) return
    this.isMonitoring = true
    this.monitorIntervalId = setInterval(() => {
      this.checkOfflineDevices()
    }, MONITOR_INTERVAL_MS)
  }

  stopMonitoring(): void {
    this.isMonitoring = false
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId)
      this.monitorIntervalId = null
    }
  }

  attemptReconnect(craneId: string): { success: boolean; attempts: number; message: string } {
    const hb = this.getHeartbeat(craneId)
    if (!hb) return { success: false, attempts: 0, message: '设备未注册' }

    if (hb.status === 'online') return { success: true, attempts: 0, message: '设备已在线' }

    const currentAttempts = hb.reconnect_count
    if (currentAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return { success: false, attempts: currentAttempts, message: `已达到最大重连次数(${MAX_RECONNECT_ATTEMPTS})` }
    }

    const now = new Date().toISOString()
    this.db.prepare(`
      UPDATE device_heartbeat SET last_heartbeat_at = ?, status = 'online', latency_ms = ?, updated_at = ?
      WHERE crane_id = ?
    `).run(now, Math.random() * 50 + 5, now, craneId)

    this.db.prepare(`
      UPDATE device_heartbeat SET reconnect_count = reconnect_count + 1 WHERE crane_id = ?
    `).run(craneId)

    const crane = craneRepository.findById(craneId)
    if (crane) {
      craneRepository.updateStatus(craneId, 'online')
      wsService.broadcast('status_change', { craneId, status: 'online' })
    }

    this.logStatusChange(craneId, hb.status, 'online', 'manual_reconnect')

    this.startSimulatedHeartbeat(craneId)

    return {
      success: true,
      attempts: currentAttempts + 1,
      message: `重连成功(第${currentAttempts + 1}次尝试)`,
    }
  }

  startSimulatedHeartbeat(craneId: string): void {
    if (this.simulatedHeartbeats.has(craneId)) return

    const jitter = Math.random() * 5000
    const intervalId = setInterval(() => {
      const hb = this.getHeartbeat(craneId)
      if (!hb || hb.status === 'offline') {
        this.stopSimulatedHeartbeat(craneId)
        return
      }

      const shouldMiss = Math.random() < 0.005
      if (!shouldMiss) {
        this.receiveHeartbeat(craneId, Math.random() * 30 + 2)
      }
    }, DEFAULT_HEARTBEAT_INTERVAL_MS + jitter)

    this.simulatedHeartbeats.set(craneId, { intervalId, jitter })
    this.receiveHeartbeat(craneId, Math.random() * 20 + 2)
  }

  stopSimulatedHeartbeat(craneId: string): void {
    const entry = this.simulatedHeartbeats.get(craneId)
    if (entry) {
      clearInterval(entry.intervalId)
      this.simulatedHeartbeats.delete(craneId)
    }
  }

  simulateOffline(craneId: string): boolean {
    this.stopSimulatedHeartbeat(craneId)
    return true
  }

  getHeartbeat(craneId: string): DeviceHeartbeat | undefined {
    return this.db.prepare('SELECT * FROM device_heartbeat WHERE crane_id = ?').get(craneId) as DeviceHeartbeat | undefined
  }

  getAllHeartbeats(): DeviceHeartbeat[] {
    return this.db.prepare('SELECT * FROM device_heartbeat ORDER BY updated_at DESC').all() as DeviceHeartbeat[]
  }

  getStatusLogs(craneId: string, limit: number = 50): DeviceStatusLog[] {
    return this.db.prepare(
      'SELECT * FROM device_status_log WHERE crane_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(craneId, limit) as DeviceStatusLog[]
  }

  getAllStatusLogs(limit: number = 100): DeviceStatusLog[] {
    return this.db.prepare(
      'SELECT * FROM device_status_log ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as DeviceStatusLog[]
  }

  private logStatusChange(craneId: string, oldStatus: string, newStatus: string, reason: string): void {
    this.db.prepare(`
      INSERT INTO device_status_log (id, crane_id, old_status, new_status, reason, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), craneId, oldStatus, newStatus, reason, new Date().toISOString())
  }

  getMonitoringStats(): {
    total: number
    online: number
    offline: number
    alarm: number
    avgLatency: number
    avgReconnects: number
  } {
    const heartbeats = this.getAllHeartbeats()
    const online = heartbeats.filter(h => h.status === 'online').length
    const offline = heartbeats.filter(h => h.status === 'offline').length
    const alarm = heartbeats.filter(h => h.status === 'alarm').length
    const avgLatency = heartbeats.length > 0
      ? heartbeats.reduce((sum, h) => sum + h.latency_ms, 0) / heartbeats.length
      : 0
    const avgReconnects = heartbeats.length > 0
      ? heartbeats.reduce((sum, h) => sum + h.reconnect_count, 0) / heartbeats.length
      : 0

    return { total: heartbeats.length, online, offline, alarm, avgLatency: Math.round(avgLatency * 100) / 100, avgReconnects: Math.round(avgReconnects * 100) / 100 }
  }

  getHeartbeatProgress(craneId: string): { elapsed: number; threshold: number; percentage: number; isOverdue: boolean } {
    const hb = this.getHeartbeat(craneId)
    if (!hb) return { elapsed: 0, threshold: 0, percentage: 0, isOverdue: false }

    const elapsed = Date.now() - new Date(hb.last_heartbeat_at).getTime()
    const threshold = hb.heartbeat_interval_ms * OFFLINE_THRESHOLD_MULTIPLIER
    const percentage = Math.min(100, (elapsed / threshold) * 100)

    return { elapsed, threshold, percentage, isOverdue: elapsed > threshold }
  }
}

export const deviceStatusService = new DeviceStatusService()
