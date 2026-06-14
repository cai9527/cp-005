import { getDatabase } from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

export interface CollisionRule {
  id: string
  name: string
  safe_distance: number
  risk_velocity: number
  warning_distance_ratio: number
  critical_distance_ratio: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CollisionAlert {
  id: string
  crane1_id: string
  crane2_id: string
  level: 'info' | 'warning' | 'critical'
  distance: number
  relative_velocity: number
  approach_angle?: number
  message: string
  timestamp: string
  status: 'active' | 'acknowledged' | 'resolved'
  resolved_by?: string
  resolved_at?: string
  crane1_pos_x?: number
  crane1_pos_y?: number
  crane2_pos_x?: number
  crane2_pos_y?: number
}

export interface PositionSnapshot {
  id: string
  crane_id: string
  pos_x: number
  pos_y: number
  rotation: number
  radius: number
  velocity_x?: number
  velocity_y?: number
  timestamp: string
}

export interface CollisionRiskPair {
  crane1_id: string
  crane2_id: string
  distance: number
  relative_velocity: number
  risk_level: 'safe' | 'warning' | 'critical'
  approach_angle?: number
  crane1_pos_x: number
  crane1_pos_y: number
  crane2_pos_x: number
  crane2_pos_y: number
}

class CollisionRepository {
  private db = getDatabase()

  getActiveRule(): CollisionRule | undefined {
    return this.db.prepare(`
      SELECT * FROM collision_rules
      WHERE enabled = 1
      ORDER BY created_at DESC
      LIMIT 1
    `).get() as CollisionRule | undefined
  }

  getAllRules(): CollisionRule[] {
    return this.db.prepare(`
      SELECT * FROM collision_rules
      ORDER BY created_at DESC
    `).all() as CollisionRule[]
  }

  getRuleById(id: string): CollisionRule | undefined {
    return this.db.prepare('SELECT * FROM collision_rules WHERE id = ?').get(id) as CollisionRule | undefined
  }

  createRule(data: Omit<CollisionRule, 'id' | 'created_at' | 'updated_at'>): CollisionRule {
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO collision_rules (id, name, safe_distance, risk_velocity, warning_distance_ratio, critical_distance_ratio, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.safe_distance, data.risk_velocity, data.warning_distance_ratio, data.critical_distance_ratio, data.enabled ? 1 : 0, now, now)
    return { id, ...data, created_at: now, updated_at: now }
  }

  updateRule(id: string, data: Partial<Omit<CollisionRule, 'id' | 'created_at'>>): boolean {
    const rule = this.getRuleById(id)
    if (!rule) return false

    const fields: string[] = []
    const params: any[] = []

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        params.push(key === 'enabled' ? (value ? 1 : 0) : value)
      }
    }

    if (fields.length === 0) return true

    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    this.db.prepare(`UPDATE collision_rules SET ${fields.join(', ')} WHERE id = ?`).run(...params)
    return true
  }

  deleteRule(id: string): boolean {
    const rule = this.getRuleById(id)
    if (!rule) return false
    this.db.prepare('DELETE FROM collision_rules WHERE id = ?').run(id)
    return true
  }

  createCollisionAlert(data: Omit<CollisionAlert, 'id'>): CollisionAlert {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO collision_alerts (
        id, crane1_id, crane2_id, level, distance, relative_velocity, approach_angle,
        message, timestamp, status, resolved_by, resolved_at,
        crane1_pos_x, crane1_pos_y, crane2_pos_x, crane2_pos_y
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.crane1_id, data.crane2_id, data.level, data.distance, data.relative_velocity,
      data.approach_angle ?? null, data.message, data.timestamp, data.status,
      data.resolved_by || null, data.resolved_at || null,
      data.crane1_pos_x ?? null, data.crane1_pos_y ?? null,
      data.crane2_pos_x ?? null, data.crane2_pos_y ?? null
    )
    return { id, ...data }
  }

  findActiveCollisionAlerts(): CollisionAlert[] {
    return this.db.prepare(`
      SELECT * FROM collision_alerts
      WHERE status = 'active'
      ORDER BY
        CASE level
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'info' THEN 3
        END,
        timestamp DESC
    `).all() as CollisionAlert[]
  }

  findActiveAlertForPair(crane1Id: string, crane2Id: string, level: string): CollisionAlert | undefined {
    return this.db.prepare(`
      SELECT * FROM collision_alerts
      WHERE status = 'active'
        AND level = ?
        AND ((crane1_id = ? AND crane2_id = ?) OR (crane1_id = ? AND crane2_id = ?))
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(level, crane1Id, crane2Id, crane2Id, crane1Id) as CollisionAlert | undefined
  }

  findAllCollisionAlerts(params?: {
    status?: string
    craneId?: string
    level?: string
    startTime?: string
    endTime?: string
    limit?: number
  }): CollisionAlert[] {
    const conditions: string[] = []
    const sqlParams: any[] = []

    if (params?.status) {
      conditions.push('status = ?')
      sqlParams.push(params.status)
    }
    if (params?.craneId) {
      conditions.push('(crane1_id = ? OR crane2_id = ?)')
      sqlParams.push(params.craneId, params.craneId)
    }
    if (params?.level) {
      conditions.push('level = ?')
      sqlParams.push(params.level)
    }
    if (params?.startTime) {
      conditions.push('timestamp >= ?')
      sqlParams.push(params.startTime)
    }
    if (params?.endTime) {
      conditions.push('timestamp <= ?')
      sqlParams.push(params.endTime)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = params?.limit ? `LIMIT ${params.limit}` : ''

    const sql = `
      SELECT * FROM collision_alerts
      ${where}
      ORDER BY timestamp DESC
      ${limit}
    `

    return this.db.prepare(sql).all(...sqlParams) as CollisionAlert[]
  }

  getCollisionAlertById(id: string): CollisionAlert | undefined {
    return this.db.prepare('SELECT * FROM collision_alerts WHERE id = ?').get(id) as CollisionAlert | undefined
  }

  acknowledgeCollisionAlert(id: string, resolvedBy?: string): void {
    this.db.prepare(`
      UPDATE collision_alerts SET status = 'acknowledged', resolved_by = COALESCE(?, resolved_by)
      WHERE id = ?
    `).run(resolvedBy || null, id)
  }

  resolveCollisionAlert(id: string, resolvedBy: string): void {
    const now = new Date().toISOString()
    this.db.prepare(`
      UPDATE collision_alerts SET status = 'resolved', resolved_by = ?, resolved_at = ?
      WHERE id = ?
    `).run(resolvedBy, now, id)
  }

  resolveAllActiveAlertsForCrane(craneId: string): void {
    const now = new Date().toISOString()
    this.db.prepare(`
      UPDATE collision_alerts
      SET status = 'resolved', resolved_by = 'system', resolved_at = ?
      WHERE status = 'active' AND (crane1_id = ? OR crane2_id = ?)
    `).run(now, craneId, craneId)
  }

  getCollisionAlertStats() {
    const today = new Date().toISOString().split('T')[0]
    const result = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN level = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) as today
      FROM collision_alerts
    `).get(`${today}T00:00:00.000Z`) as any

    return {
      total: result.total || 0,
      active: result.active || 0,
      critical: result.critical || 0,
      warning: result.warning || 0,
      today: result.today || 0,
    }
  }

  createPositionSnapshot(data: Omit<PositionSnapshot, 'id'>): PositionSnapshot {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO device_position_snapshots (id, crane_id, pos_x, pos_y, rotation, radius, velocity_x, velocity_y, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.crane_id, data.pos_x, data.pos_y, data.rotation, data.radius, data.velocity_x ?? null, data.velocity_y ?? null, data.timestamp)
    return { id, ...data }
  }

  createManyPositionSnapshots(dataList: Array<Omit<PositionSnapshot, 'id'>>): void {
    const stmt = this.db.prepare(`
      INSERT INTO device_position_snapshots (id, crane_id, pos_x, pos_y, rotation, radius, velocity_x, velocity_y, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const tx = this.db.transaction((items: typeof dataList) => {
      for (const d of items) {
        stmt.run(uuidv4(), d.crane_id, d.pos_x, d.pos_y, d.rotation, d.radius, d.velocity_x ?? null, d.velocity_y ?? null, d.timestamp)
      }
    })
    tx(dataList)
  }

  getLatestPositionSnapshot(craneId: string): PositionSnapshot | undefined {
    return this.db.prepare(`
      SELECT * FROM device_position_snapshots
      WHERE crane_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(craneId) as PositionSnapshot | undefined
  }

  getAllLatestPositionSnapshots(): PositionSnapshot[] {
    return this.db.prepare(`
      SELECT dps.*
      FROM device_position_snapshots dps
      INNER JOIN (
        SELECT crane_id, MAX(timestamp) as max_ts
        FROM device_position_snapshots
        GROUP BY crane_id
      ) latest ON dps.crane_id = latest.crane_id AND dps.timestamp = latest.max_ts
      ORDER BY dps.crane_id
    `).all() as PositionSnapshot[]
  }

  getPositionHistory(craneId: string, startTime: string, endTime: string): PositionSnapshot[] {
    return this.db.prepare(`
      SELECT * FROM device_position_snapshots
      WHERE crane_id = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `).all(craneId, startTime, endTime) as PositionSnapshot[]
  }

  deleteOldPositionSnapshots(beforeDate: string): number {
    const result = this.db.prepare('DELETE FROM device_position_snapshots WHERE timestamp < ?').run(beforeDate)
    return result.changes
  }
}

export const collisionRepository = new CollisionRepository()
