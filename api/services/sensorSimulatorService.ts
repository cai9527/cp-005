import { craneRepository, type Crane } from '../repositories/craneRepository.js'
import { sensorDataService } from './sensorDataService.js'
import { alertService } from './alertService.js'
import { collisionService } from './collisionService.js'

interface SensorState {
  load: number
  moment: number
  radius: number
  height: number
  rotation: number
  wind: number
}

interface CraneSimState {
  crane: Crane
  sensors: SensorState
  targets: SensorState
  workCycle: 'idle' | 'lifting' | 'moving' | 'lowering' | 'rotating'
  cycleProgress: number
  nextCycleAt: number
  anomalyChance: number
  anomalyActive: boolean
  anomalyUntil: number
}

class SensorSimulatorService {
  private simStates: Map<string, CraneSimState> = new Map()
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private tickIntervalMs = 2000
  private anomalyTriggerAt: Map<string, number> = new Map()

  init(): void {
    if (this.isRunning) return

    const cranes = craneRepository.findAll().filter((c) => c.status !== 'offline')

    for (const crane of cranes) {
      this.simStates.set(crane.id, this.createInitialState(crane))
    }

    this.start()
    console.log(`[Simulator] Initialized with ${this.simStates.size} cranes, tick every ${this.tickIntervalMs}ms`)
  }

  private createInitialState(crane: Crane): CraneSimState {
    return {
      crane,
      sensors: {
        load: 0,
        moment: 0,
        radius: crane.max_radius * 0.4,
        height: crane.max_height * 0.3,
        rotation: Math.random() * 360,
        wind: 3 + Math.random() * 4,
      },
      targets: {
        load: 0,
        moment: 0,
        radius: crane.max_radius * 0.4,
        height: crane.max_height * 0.3,
        rotation: Math.random() * 360,
        wind: 5,
      },
      workCycle: 'idle',
      cycleProgress: 0,
      nextCycleAt: Date.now() + Math.random() * 10000,
      anomalyChance: 0.08,
      anomalyActive: false,
      anomalyUntil: 0,
    }
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true

    this.intervalId = setInterval(() => {
      this.tick()
    }, this.tickIntervalMs)
  }

  stop(): void {
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('[Simulator] Stopped')
  }

  private tick(): void {
    const now = Date.now()
    const batch: Array<{ craneId: string; sensorType: string; value: number }> = []
    const positionUpdates: Array<{ craneId: string; rotation: number; radius: number }> = []

    for (const [craneId, state] of this.simStates) {
      this.updateWorkCycle(state, now)
      this.updateSensorValues(state)

      batch.push({ craneId, sensorType: 'load', value: state.sensors.load })
      batch.push({ craneId, sensorType: 'moment', value: state.sensors.moment })
      batch.push({ craneId, sensorType: 'radius', value: state.sensors.radius })
      batch.push({ craneId, sensorType: 'height', value: state.sensors.height })
      batch.push({ craneId, sensorType: 'rotation', value: state.sensors.rotation })
      batch.push({ craneId, sensorType: 'wind', value: state.sensors.wind })

      positionUpdates.push({
        craneId,
        rotation: state.sensors.rotation,
        radius: state.sensors.radius,
      })
    }

    sensorDataService.ingestBatch(batch)
    collisionService.batchUpdatePositions(positionUpdates)
    collisionService.detectCollisions()
  }

  private updateWorkCycle(state: CraneSimState, now: number): void {
    const { crane } = state

    if (state.anomalyActive && now > state.anomalyUntil) {
      state.anomalyActive = false
      alertService.resolveAlertsForCrane(crane.id)
      if (craneRepository.findById(crane.id)?.status === 'alarm') {
        craneRepository.updateStatus(crane.id, 'online')
      }
    }

    if (!state.anomalyActive && Math.random() < state.anomalyChance * 0.02) {
      this.triggerAnomaly(state, now)
    }

    if (now >= state.nextCycleAt) {
      const cycles: CraneSimState['workCycle'][] = ['lifting', 'moving', 'rotating', 'lowering', 'idle']
      const weights = [0.2, 0.2, 0.25, 0.2, 0.15]
      const rand = Math.random()
      let cumulative = 0
      for (let i = 0; i < cycles.length; i++) {
        cumulative += weights[i]
        if (rand < cumulative) {
          state.workCycle = cycles[i]
          break
        }
      }
      state.cycleProgress = 0
      state.nextCycleAt = now + 5000 + Math.random() * 15000
      this.setTargetsForCycle(state)
    }

    state.cycleProgress += this.tickIntervalMs / (state.nextCycleAt - (state.nextCycleAt - (5000 + Math.random() * 15000)))
  }

  private setTargetsForCycle(state: CraneSimState): void {
    const { crane } = state
    const loadFactor = 0.3 + Math.random() * 0.5

    switch (state.workCycle) {
      case 'lifting':
        state.targets.load = crane.max_load * loadFactor
        state.targets.moment = crane.max_moment * (loadFactor * 0.7 + 0.1)
        state.targets.height = Math.min(crane.max_height, state.sensors.height + crane.max_height * (0.2 + Math.random() * 0.3))
        break
      case 'moving':
        state.targets.radius = crane.max_radius * (0.2 + Math.random() * 0.7)
        state.targets.load = crane.max_load * loadFactor * 0.9
        state.targets.moment = crane.max_moment * (loadFactor * 0.8)
        break
      case 'rotating':
        state.targets.rotation = (state.sensors.rotation + (Math.random() > 0.5 ? 1 : -1) * (90 + Math.random() * 180) + 360) % 360
        state.targets.load = crane.max_load * loadFactor * 0.8
        break
      case 'lowering':
        state.targets.load = Math.max(0, state.sensors.load * 0.1)
        state.targets.moment = state.sensors.moment * 0.1
        state.targets.height = Math.max(5, state.sensors.height * (0.3 + Math.random() * 0.3))
        break
      case 'idle':
        state.targets.load = 0
        state.targets.moment = 0
        break
    }

    state.targets.wind = 3 + Math.random() * 8
  }

  private updateSensorValues(state: CraneSimState): void {
    const { crane } = state

    state.sensors.load = this.approach(state.sensors.load, state.targets.load, crane.max_load * 0.08)
    state.sensors.moment = this.approach(state.sensors.moment, state.targets.moment, crane.max_moment * 0.06)
    state.sensors.radius = this.approach(state.sensors.radius, state.targets.radius, 1.5)
    state.sensors.height = this.approach(state.sensors.height, state.targets.height, 1.2)

    let rotationDiff = state.targets.rotation - state.sensors.rotation
    if (rotationDiff > 180) rotationDiff -= 360
    if (rotationDiff < -180) rotationDiff += 360
    state.sensors.rotation = (state.sensors.rotation + Math.sign(rotationDiff) * Math.min(Math.abs(rotationDiff), 4) + 360) % 360

    state.sensors.wind = this.approach(state.sensors.wind, state.targets.wind, 0.5)
    state.sensors.wind += (Math.random() - 0.5) * 0.8

    state.sensors.load += (Math.random() - 0.5) * crane.max_load * 0.02
    state.sensors.moment += (Math.random() - 0.5) * crane.max_moment * 0.02

    state.sensors.load = Math.max(0, state.sensors.load)
    state.sensors.moment = Math.max(0, state.sensors.moment)
    state.sensors.radius = Math.max(2, Math.min(crane.max_radius, state.sensors.radius))
    state.sensors.height = Math.max(0, Math.min(crane.max_height, state.sensors.height))
    state.sensors.wind = Math.max(0, state.sensors.wind)

    if (state.anomalyActive) {
      this.applyAnomaly(state)
    }
  }

  private approach(current: number, target: number, step: number): number {
    const diff = target - current
    if (Math.abs(diff) <= step) return target
    return current + Math.sign(diff) * step
  }

  private triggerAnomaly(state: CraneSimState, now: number): void {
    const anomalyTypes = ['overload', 'high_wind', 'over_moment', 'extreme_radius']
    const type = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)]

    const duration = 15000 + Math.random() * 25000
    state.anomalyActive = true
    state.anomalyUntil = now + duration

    this.anomalyTriggerAt.set(state.crane.id + '_' + type, now)
    console.log(`[Simulator] Anomaly '${type}' triggered on ${state.crane.name} for ${Math.round(duration / 1000)}s`)
  }

  private applyAnomaly(state: CraneSimState): void {
    const { crane } = state
    const remainingPct = (state.anomalyUntil - Date.now()) / 30000

    if (Math.random() < 0.4) {
      state.sensors.load = crane.max_load * (0.92 + Math.random() * 0.1)
    }
    if (Math.random() < 0.35) {
      state.sensors.moment = crane.max_moment * (0.88 + Math.random() * 0.12)
    }
    if (Math.random() < 0.25) {
      state.sensors.wind = 15 + Math.random() * 12
    }
    if (Math.random() < 0.2) {
      state.sensors.radius = crane.max_radius * (0.95 + Math.random() * 0.05)
    }
  }

  triggerManualAnomaly(craneId: string): boolean {
    const state = this.simStates.get(craneId)
    if (!state) return false
    this.triggerAnomaly(state, Date.now())
    return true
  }

  getSimStatus() {
    return {
      running: this.isRunning,
      tickIntervalMs: this.tickIntervalMs,
      craneCount: this.simStates.size,
      activeCranes: Array.from(this.simStates.entries()).map(([id, s]) => ({
        id,
        name: s.crane.name,
        cycle: s.workCycle,
        anomalyActive: s.anomalyActive,
        sensors: { ...s.sensors },
      })),
    }
  }

  addCraneToSimulation(crane: Crane): void {
    if (!this.simStates.has(crane.id)) {
      this.simStates.set(crane.id, this.createInitialState(crane))
    }
  }

  removeCraneFromSimulation(craneId: string): void {
    this.simStates.delete(craneId)
  }
}

export const sensorSimulatorService = new SensorSimulatorService()
