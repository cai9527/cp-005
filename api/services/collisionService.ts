import { collisionRepository, type CollisionAlert, type CollisionRule, type PositionSnapshot, type CollisionRiskPair } from '../repositories/collisionRepository.js'
import { craneRepository, type Crane } from '../repositories/craneRepository.js'
import { wsService } from './wsService.js'

export interface CranePosition {
  craneId: string
  craneName: string
  baseX: number
  baseY: number
  rotation: number
  radius: number
  jibEndX: number
  jibEndY: number
  velocityX?: number
  velocityY?: number
  timestamp: string
}

export interface CollisionDetectionResult {
  riskPairs: CollisionRiskPair[]
  alerts: CollisionAlert[]
  timestamp: string
}

class CollisionService {
  private lastPositions: Map<string, PositionSnapshot> = new Map()
  private minDetectionIntervalMs = 1000
  private lastDetectionAt = 0

  getActiveRule(): CollisionRule | undefined {
    return collisionRepository.getActiveRule()
  }

  getAllRules(): CollisionRule[] {
    return collisionRepository.getAllRules()
  }

  getRuleById(id: string): CollisionRule | undefined {
    return collisionRepository.getRuleById(id)
  }

  createRule(data: Omit<CollisionRule, 'id' | 'created_at' | 'updated_at'>): CollisionRule {
    return collisionRepository.createRule(data)
  }

  updateRule(id: string, data: Partial<Omit<CollisionRule, 'id' | 'created_at'>>): boolean {
    return collisionRepository.updateRule(id, data)
  }

  deleteRule(id: string): boolean {
    return collisionRepository.deleteRule(id)
  }

  calculateJibEndPosition(crane: Crane, rotation: number, radius: number): { x: number; y: number } {
    const rad = (rotation * Math.PI) / 180
    return {
      x: crane.location_x + radius * Math.cos(rad),
      y: crane.location_y + radius * Math.sin(rad),
    }
  }

  calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    return Math.sqrt(dx * dx + dy * dy)
  }

  calculateRelativeVelocity(
    pos1: CranePosition,
    pos2: CranePosition
  ): number {
    const v1x = pos1.velocityX ?? 0
    const v1y = pos1.velocityY ?? 0
    const v2x = pos2.velocityX ?? 0
    const v2y = pos2.velocityY ?? 0

    const relVx = v2x - v1x
    const relVy = v2y - v1y

    return Math.sqrt(relVx * relVx + relVy * relVy)
  }

  calculateApproachAngle(pos1: CranePosition, pos2: CranePosition): number {
    const dx = pos2.jibEndX - pos1.jibEndX
    const dy = pos2.jibEndY - pos1.jibEndY
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    return (angle + 360) % 360
  }

  estimateVelocity(
    currentPos: { x: number; y: number; timestamp: string },
    previousPos: { x: number; y: number; timestamp: string }
  ): { vx: number; vy: number } {
    const t1 = new Date(previousPos.timestamp).getTime()
    const t2 = new Date(currentPos.timestamp).getTime()
    const dt = (t2 - t1) / 1000

    if (dt <= 0) return { vx: 0, vy: 0 }

    return {
      vx: (currentPos.x - previousPos.x) / dt,
      vy: (currentPos.y - previousPos.y) / dt,
    }
  }

  assessRiskLevel(
    distance: number,
    relativeVelocity: number,
    rule: CollisionRule
  ): 'safe' | 'warning' | 'critical' {
    const safeDistance = rule.safe_distance
    const riskVelocity = rule.risk_velocity

    const warningDistance = safeDistance * rule.warning_distance_ratio
    const criticalDistance = safeDistance * rule.critical_distance_ratio

    if (distance <= criticalDistance && relativeVelocity > riskVelocity) {
      return 'critical'
    }

    if (distance <= warningDistance && relativeVelocity > riskVelocity * 0.7) {
      return 'warning'
    }

    if (distance <= safeDistance) {
      return 'warning'
    }

    return 'safe'
  }

  getCranePosition(craneId: string): CranePosition | null {
    const crane = craneRepository.findById(craneId)
    if (!crane) return null

    const latestSnapshot = collisionRepository.getLatestPositionSnapshot(craneId)
    const rotation = latestSnapshot?.rotation ?? 0
    const radius = latestSnapshot?.radius ?? crane.max_radius * 0.5

    const jibEnd = this.calculateJibEndPosition(crane, rotation, radius)

    return {
      craneId: crane.id,
      craneName: crane.name,
      baseX: crane.location_x,
      baseY: crane.location_y,
      rotation,
      radius,
      jibEndX: jibEnd.x,
      jibEndY: jibEnd.y,
      velocityX: latestSnapshot?.velocity_x ?? 0,
      velocityY: latestSnapshot?.velocity_y ?? 0,
      timestamp: latestSnapshot?.timestamp || new Date().toISOString(),
    }
  }

  getAllCranePositions(): CranePosition[] {
    const cranes = craneRepository.findAll().filter((c) => c.status !== 'offline')
    const snapshots = collisionRepository.getAllLatestPositionSnapshots()
    const snapshotMap = new Map(snapshots.map((s) => [s.crane_id, s]))

    return cranes.map((crane) => {
      const snapshot = snapshotMap.get(crane.id)
      const rotation = snapshot?.rotation ?? 0
      const radius = snapshot?.radius ?? crane.max_radius * 0.5
      const jibEnd = this.calculateJibEndPosition(crane, rotation, radius)

      return {
        craneId: crane.id,
        craneName: crane.name,
        baseX: crane.location_x,
        baseY: crane.location_y,
        rotation,
        radius,
        jibEndX: jibEnd.x,
        jibEndY: jibEnd.y,
        velocityX: snapshot?.velocity_x ?? 0,
        velocityY: snapshot?.velocity_y ?? 0,
        timestamp: snapshot?.timestamp || new Date().toISOString(),
      }
    })
  }

  detectCollisions(): CollisionDetectionResult {
    const now = Date.now()
    const timestamp = new Date().toISOString()
    const rule = this.getActiveRule()

    if (!rule) {
      return { riskPairs: [], alerts: [], timestamp }
    }

    const positions = this.getAllCranePositions()
    const riskPairs: CollisionRiskPair[] = []
    const alerts: CollisionAlert[] = []

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i]
        const pos2 = positions[j]

        const distance = this.calculateDistance(
          pos1.jibEndX, pos1.jibEndY,
          pos2.jibEndX, pos2.jibEndY
        )

        const relativeVelocity = this.calculateRelativeVelocity(pos1, pos2)
        const approachAngle = this.calculateApproachAngle(pos1, pos2)

        const riskLevel = this.assessRiskLevel(distance, relativeVelocity, rule)

        const riskPair: CollisionRiskPair = {
          crane1_id: pos1.craneId,
          crane2_id: pos2.craneId,
          distance,
          relative_velocity: relativeVelocity,
          risk_level: riskLevel,
          approach_angle: approachAngle,
          crane1_pos_x: pos1.jibEndX,
          crane1_pos_y: pos1.jibEndY,
          crane2_pos_x: pos2.jibEndX,
          crane2_pos_y: pos2.jibEndY,
        }

        riskPairs.push(riskPair)

        if (riskLevel === 'warning' || riskLevel === 'critical') {
          const existingAlert = collisionRepository.findActiveAlertForPair(
            pos1.craneId, pos2.craneId, riskLevel
          )

          if (!existingAlert) {
            const alert = this.triggerCollisionAlert(
              pos1, pos2, distance, relativeVelocity, approachAngle, riskLevel
            )
            alerts.push(alert)
          }
        }

        if (riskLevel === 'safe') {
          this.resolveSafePair(pos1.craneId, pos2.craneId)
        }
      }
    }

    if (alerts.length > 0) {
      wsService.broadcast('collision_alert', {
        alerts,
        riskPairs,
        timestamp,
      })
    }

    this.lastDetectionAt = now

    return { riskPairs, alerts, timestamp }
  }

  private triggerCollisionAlert(
    pos1: CranePosition,
    pos2: CranePosition,
    distance: number,
    relativeVelocity: number,
    approachAngle: number,
    level: 'warning' | 'critical'
  ): CollisionAlert {
    const levelText = level === 'critical' ? '碰撞临界预警' : '碰撞警告'
    const message = `[${levelText}] ${pos1.craneName} 与 ${pos2.craneName} 存在碰撞风险！距离: ${distance.toFixed(2)}m, 相对速度: ${relativeVelocity.toFixed(2)}m/s`

    const alert = collisionRepository.createCollisionAlert({
      crane1_id: pos1.craneId,
      crane2_id: pos2.craneId,
      level,
      distance,
      relative_velocity: relativeVelocity,
      approach_angle: approachAngle,
      message,
      timestamp: new Date().toISOString(),
      status: 'active',
      crane1_pos_x: pos1.jibEndX,
      crane1_pos_y: pos1.jibEndY,
      crane2_pos_x: pos2.jibEndX,
      crane2_pos_y: pos2.jibEndY,
    })

    const craneIds = [pos1.craneId, pos2.craneId]
    for (const craneId of craneIds) {
      const crane = craneRepository.findById(craneId)
      if (crane && crane.status !== 'alarm') {
        craneRepository.updateStatus(craneId, 'alarm')
        wsService.broadcast('status_change', { craneId, status: 'alarm' })
      }
    }

    return alert
  }

  private resolveSafePair(crane1Id: string, crane2Id: string): void {
    const activeAlerts = collisionRepository.findAllCollisionAlerts({
      status: 'active',
    }).filter((a) =>
      (a.crane1_id === crane1Id && a.crane2_id === crane2Id) ||
      (a.crane1_id === crane2Id && a.crane2_id === crane1Id)
    )

    for (const alert of activeAlerts) {
      collisionRepository.resolveCollisionAlert(alert.id, 'system')
      wsService.broadcast('collision_alert_status', { id: alert.id, status: 'resolved' })
    }
  }

  updatePosition(
    craneId: string,
    rotation: number,
    radius: number,
    timestamp?: string
  ): PositionSnapshot | null {
    const crane = craneRepository.findById(craneId)
    if (!crane) return null

    const ts = timestamp || new Date().toISOString()
    const jibEnd = this.calculateJibEndPosition(crane, rotation, radius)

    let velocityX = 0
    let velocityY = 0

    const lastPos = this.lastPositions.get(craneId)
    if (lastPos) {
      const lastJibEnd = this.calculateJibEndPosition(crane, lastPos.rotation, lastPos.radius)
      const velocity = this.estimateVelocity(
        { x: jibEnd.x, y: jibEnd.y, timestamp: ts },
        { x: lastJibEnd.x, y: lastJibEnd.y, timestamp: lastPos.timestamp }
      )
      velocityX = velocity.vx
      velocityY = velocity.vy
    }

    const snapshot = collisionRepository.createPositionSnapshot({
      crane_id: craneId,
      pos_x: jibEnd.x,
      pos_y: jibEnd.y,
      rotation,
      radius,
      velocity_x: velocityX,
      velocity_y: velocityY,
      timestamp: ts,
    })

    this.lastPositions.set(craneId, snapshot)

    return snapshot
  }

  batchUpdatePositions(updates: Array<{ craneId: string; rotation: number; radius: number; timestamp?: string }>): void {
    const timestamp = new Date().toISOString()
    const snapshots: Array<Omit<PositionSnapshot, 'id'>> = []

    for (const update of updates) {
      const crane = craneRepository.findById(update.craneId)
      if (!crane) continue

      const ts = update.timestamp || timestamp
      const jibEnd = this.calculateJibEndPosition(crane, update.rotation, update.radius)

      let velocityX = 0
      let velocityY = 0

      const lastPos = this.lastPositions.get(update.craneId)
      if (lastPos) {
        const lastJibEnd = this.calculateJibEndPosition(crane, lastPos.rotation, lastPos.radius)
        const velocity = this.estimateVelocity(
          { x: jibEnd.x, y: jibEnd.y, timestamp: ts },
          { x: lastJibEnd.x, y: lastJibEnd.y, timestamp: lastPos.timestamp }
        )
        velocityX = velocity.vx
        velocityY = velocity.vy
      }

      const snapshotData: Omit<PositionSnapshot, 'id'> = {
        crane_id: update.craneId,
        pos_x: jibEnd.x,
        pos_y: jibEnd.y,
        rotation: update.rotation,
        radius: update.radius,
        velocity_x: velocityX,
        velocity_y: velocityY,
        timestamp: ts,
      }

      snapshots.push(snapshotData)
      this.lastPositions.set(update.craneId, { id: '', ...snapshotData })
    }

    if (snapshots.length > 0) {
      collisionRepository.createManyPositionSnapshots(snapshots)
    }
  }

  getActiveCollisionAlerts(): CollisionAlert[] {
    return collisionRepository.findActiveCollisionAlerts()
  }

  getAllCollisionAlerts(params?: {
    status?: string
    craneId?: string
    level?: string
    startTime?: string
    endTime?: string
    limit?: number
  }): CollisionAlert[] {
    return collisionRepository.findAllCollisionAlerts(params)
  }

  getCollisionAlertById(id: string): CollisionAlert | undefined {
    return collisionRepository.getCollisionAlertById(id)
  }

  acknowledgeCollisionAlert(id: string, resolvedBy?: string): boolean {
    const alert = collisionRepository.getCollisionAlertById(id)
    if (!alert) return false
    collisionRepository.acknowledgeCollisionAlert(id, resolvedBy)
    wsService.broadcast('collision_alert_status', { id, status: 'acknowledged' })
    return true
  }

  resolveCollisionAlert(id: string, resolvedBy: string): boolean {
    const alert = collisionRepository.getCollisionAlertById(id)
    if (!alert) return false
    collisionRepository.resolveCollisionAlert(id, resolvedBy)
    wsService.broadcast('collision_alert_status', { id, status: 'resolved' })
    return true
  }

  getCollisionAlertStats() {
    return collisionRepository.getCollisionAlertStats()
  }

  getRiskPairs(): CollisionRiskPair[] {
    const rule = this.getActiveRule()
    if (!rule) return []

    const positions = this.getAllCranePositions()
    const riskPairs: CollisionRiskPair[] = []

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i]
        const pos2 = positions[j]

        const distance = this.calculateDistance(
          pos1.jibEndX, pos1.jibEndY,
          pos2.jibEndX, pos2.jibEndY
        )

        const relativeVelocity = this.calculateRelativeVelocity(pos1, pos2)
        const approachAngle = this.calculateApproachAngle(pos1, pos2)
        const riskLevel = this.assessRiskLevel(distance, relativeVelocity, rule)

        riskPairs.push({
          crane1_id: pos1.craneId,
          crane2_id: pos2.craneId,
          distance,
          relative_velocity: relativeVelocity,
          risk_level: riskLevel,
          approach_angle: approachAngle,
          crane1_pos_x: pos1.jibEndX,
          crane1_pos_y: pos1.jibEndY,
          crane2_pos_x: pos2.jibEndX,
          crane2_pos_y: pos2.jibEndY,
        })
      }
    }

    return riskPairs
  }

  getOverallRiskLevel(): 'safe' | 'warning' | 'critical' {
    const riskPairs = this.getRiskPairs()
    if (riskPairs.length === 0) return 'safe'

    if (riskPairs.some((p) => p.risk_level === 'critical')) return 'critical'
    if (riskPairs.some((p) => p.risk_level === 'warning')) return 'warning'
    return 'safe'
  }
}

export const collisionService = new CollisionService()
