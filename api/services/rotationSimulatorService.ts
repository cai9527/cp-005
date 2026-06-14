import { getDatabase } from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'
import { craneRepository } from '../repositories/craneRepository.js'
import { wsService } from './wsService.js'

export interface RotationSimulation {
  id: string
  crane_id: string
  angular_velocity: number
  direction: 'cw' | 'ccw'
  center_x: number
  center_y: number
  radius: number
  status: 'running' | 'stopped' | 'paused'
  created_at: string
  updated_at: string
}

export interface RotationTrajectoryPoint {
  id: string
  simulation_id: string
  angle: number
  pos_x: number
  pos_y: number
  angular_velocity: number
  timestamp: string
  elapsed_ms: number
}

export interface RotationConfig {
  craneId: string
  angularVelocity: number
  direction: 'cw' | 'ccw'
  centerX: number
  centerY: number
  radius: number
}

class RotationSimulatorService {
  private db = getDatabase()
  private activeSimulations: Map<string, {
    simulationId: string
    config: RotationConfig
    startTime: number
    currentAngle: number
    intervalId: NodeJS.Timeout
    tickIntervalMs: number
    trajectoryBuffer: RotationTrajectoryPoint[]
  }> = new Map()

  private readonly TICK_INTERVAL_MS = 100
  private readonly TRAJECTORY_BUFFER_FLUSH_SIZE = 10

  configureAndStart(config: RotationConfig): RotationSimulation {
    this.stopExistingSimulation(config.craneId)

    const now = new Date().toISOString()
    const id = uuidv4()

    this.db.prepare(`
      INSERT INTO rotation_simulation (id, crane_id, angular_velocity, direction, center_x, center_y, radius, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, ?)
    `).run(id, config.craneId, config.angularVelocity, config.direction, config.centerX, config.centerY, config.radius, now, now)

    const currentRotation = this.getCurrentRotation(config.craneId)

    const simState = {
      simulationId: id,
      config,
      startTime: Date.now(),
      currentAngle: currentRotation,
      intervalId: null as unknown as NodeJS.Timeout,
      tickIntervalMs: this.TICK_INTERVAL_MS,
      trajectoryBuffer: [] as RotationTrajectoryPoint[],
    }

    simState.intervalId = setInterval(() => {
      this.tick(simState)
    }, simState.tickIntervalMs)

    this.activeSimulations.set(config.craneId, simState)

    const crane = craneRepository.findById(config.craneId)
    if (crane && crane.status === 'offline') {
      craneRepository.updateStatus(config.craneId, 'online')
      wsService.broadcast('status_change', { craneId: config.craneId, status: 'online' })
    }

    console.log(`[RotationSim] Started for crane ${config.craneId}, ω=${config.angularVelocity} r/min, dir=${config.direction}`)

    return this.getSimulation(id)!
  }

  private tick(simState: NonNullable<ReturnType<typeof this.activeSimulations.get>>): void {
    const now = Date.now()
    const elapsed = now - simState.startTime
    const dt = simState.tickIntervalMs / 1000
    const directionMultiplier = simState.config.direction === 'cw' ? 1 : -1
    const degreesPerSecond = simState.config.angularVelocity * 360 / 60

    simState.currentAngle = (simState.currentAngle + directionMultiplier * degreesPerSecond * dt + 360) % 360

    const angleRad = (simState.currentAngle * Math.PI) / 180
    const posX = simState.config.centerX + simState.config.radius * Math.cos(angleRad)
    const posY = simState.config.centerY + simState.config.radius * Math.sin(angleRad)

    const point: Omit<RotationTrajectoryPoint, 'id'> = {
      simulation_id: simState.simulationId,
      angle: Math.round(simState.currentAngle * 1000) / 1000,
      pos_x: Math.round(posX * 1000) / 1000,
      pos_y: Math.round(posY * 1000) / 1000,
      angular_velocity: simState.config.angularVelocity,
      timestamp: new Date(now).toISOString(),
      elapsed_ms: elapsed,
    }

    simState.trajectoryBuffer.push({ id: uuidv4(), ...point })

    if (simState.trajectoryBuffer.length >= this.TRAJECTORY_BUFFER_FLUSH_SIZE) {
      this.flushTrajectoryBuffer(simState)
    }

    wsService.broadcast('rotation_update', {
      craneId: simState.config.craneId,
      angle: point.angle,
      posX: point.pos_x,
      posY: point.pos_y,
      angularVelocity: point.angular_velocity,
      elapsedMs: point.elapsed_ms,
      timestamp: point.timestamp,
    })
  }

  private flushTrajectoryBuffer(simState: NonNullable<ReturnType<typeof this.activeSimulations.get>>): void {
    if (simState.trajectoryBuffer.length === 0) return

    const stmt = this.db.prepare(`
      INSERT INTO rotation_trajectory (id, simulation_id, angle, pos_x, pos_y, angular_velocity, timestamp, elapsed_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const batch = this.db.transaction(() => {
      for (const point of simState.trajectoryBuffer) {
        stmt.run(point.id, point.simulation_id, point.angle, point.pos_x, point.pos_y, point.angular_velocity, point.timestamp, point.elapsed_ms)
      }
    })

    batch()
    simState.trajectoryBuffer = []
  }

  stop(craneId: string): boolean {
    const simState = this.activeSimulations.get(craneId)
    if (!simState) return false

    clearInterval(simState.intervalId)
    this.flushTrajectoryBuffer(simState)

    this.db.prepare(`
      UPDATE rotation_simulation SET status = 'stopped', updated_at = ? WHERE id = ?
    `).run(new Date().toISOString(), simState.simulationId)

    this.activeSimulations.delete(craneId)

    console.log(`[RotationSim] Stopped for crane ${craneId}`)
    return true
  }

  pause(craneId: string): boolean {
    const simState = this.activeSimulations.get(craneId)
    if (!simState) return false

    clearInterval(simState.intervalId)
    this.flushTrajectoryBuffer(simState)

    this.db.prepare(`
      UPDATE rotation_simulation SET status = 'paused', updated_at = ? WHERE id = ?
    `).run(new Date().toISOString(), simState.simulationId)

    return true
  }

  resume(craneId: string): boolean {
    const simState = this.activeSimulations.get(craneId)
    if (!simState) return false

    simState.startTime = Date.now() - (simState.trajectoryBuffer.length > 0
      ? simState.trajectoryBuffer[simState.trajectoryBuffer.length - 1].elapsed_ms
      : 0)
    simState.trajectoryBuffer = []

    simState.intervalId = setInterval(() => {
      this.tick(simState)
    }, simState.tickIntervalMs)

    this.db.prepare(`
      UPDATE rotation_simulation SET status = 'running', updated_at = ? WHERE id = ?
    `).run(new Date().toISOString(), simState.simulationId)

    return true
  }

  private stopExistingSimulation(craneId: string): void {
    const existing = this.activeSimulations.get(craneId)
    if (existing) {
      clearInterval(existing.intervalId)
      this.flushTrajectoryBuffer(existing)
      this.db.prepare(`
        UPDATE rotation_simulation SET status = 'stopped', updated_at = ? WHERE id = ?
      `).run(new Date().toISOString(), existing.simulationId)
      this.activeSimulations.delete(craneId)
    }
  }

  private getCurrentRotation(craneId: string): number {
    const row = this.db.prepare(`
      SELECT value FROM sensor_data
      WHERE crane_id = ? AND sensor_type = 'rotation'
      ORDER BY timestamp DESC LIMIT 1
    `).get(craneId) as { value: number } | undefined
    return row?.value ?? Math.random() * 360
  }

  getSimulation(id: string): RotationSimulation | undefined {
    return this.db.prepare('SELECT * FROM rotation_simulation WHERE id = ?').get(id) as RotationSimulation | undefined
  }

  getSimulationByCrane(craneId: string): RotationSimulation | undefined {
    return this.db.prepare(
      "SELECT * FROM rotation_simulation WHERE crane_id = ? AND status IN ('running', 'paused') ORDER BY created_at DESC LIMIT 1"
    ).get(craneId) as RotationSimulation | undefined
  }

  getTrajectory(simulationId: string, limit: number = 500): RotationTrajectoryPoint[] {
    return this.db.prepare(
      'SELECT * FROM rotation_trajectory WHERE simulation_id = ? ORDER BY elapsed_ms ASC LIMIT ?'
    ).all(simulationId, limit) as RotationTrajectoryPoint[]
  }

  getTrajectoryRange(simulationId: string, fromMs: number, toMs: number): RotationTrajectoryPoint[] {
    return this.db.prepare(
      'SELECT * FROM rotation_trajectory WHERE simulation_id = ? AND elapsed_ms >= ? AND elapsed_ms <= ? ORDER BY elapsed_ms ASC'
    ).all(simulationId, fromMs, toMs) as RotationTrajectoryPoint[]
  }

  getActiveSimulations(): Array<RotationSimulation & { craneName: string; currentAngle: number }> {
    const results: Array<RotationSimulation & { craneName: string; currentAngle: number }> = []

    for (const [craneId, simState] of this.activeSimulations) {
      const sim = this.getSimulation(simState.simulationId)
      if (!sim) continue
      const crane = craneRepository.findById(craneId)
      results.push({
        ...sim,
        craneName: crane?.name || '未知设备',
        currentAngle: simState.currentAngle,
      })
    }

    return results
  }

  getSimulationHistory(craneId: string, limit: number = 20): RotationSimulation[] {
    return this.db.prepare(
      'SELECT * FROM rotation_simulation WHERE crane_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(craneId, limit) as RotationSimulation[]
  }

  isRunning(craneId: string): boolean {
    return this.activeSimulations.has(craneId)
  }

  cleanupOldTrajectories(olderThanHours: number = 24): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString()
    const result = this.db.prepare(`
      DELETE FROM rotation_trajectory WHERE timestamp < ?
    `).run(cutoff)
    return result.changes
  }
}

export const rotationSimulatorService = new RotationSimulatorService()
