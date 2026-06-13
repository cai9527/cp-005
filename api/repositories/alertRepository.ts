import { getDatabase } from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

export interface Alert {
  id: string
  crane_id: string
  rule_id?: string
  sensor_type: string
  level: 'info' | 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: string
  status: 'active' | 'acknowledged' | 'resolved'
  resolved_by?: string
  resolved_at?: string
}

export interface AlertRule {
  id: string
  name: string
  crane_id: string
  sensor_type: string
  condition: 'gt' | 'lt' | 'gte' | 'lte'
  threshold: number
  level: 'info' | 'warning' | 'critical'
  enabled: boolean
}

class AlertRepository {
  private db = getDatabase()

  findAllAlerts(params?: { status?: string; craneId?: string; level?: string; startTime?: string; endTime?: string; limit?: number }): Alert[] {
    const conditions: string[] = []
    const sqlParams: any[] = []

    if (params?.status) {
      conditions.push('status = ?')
      sqlParams.push(params.status)
    }
    if (params?.craneId) {
      conditions.push('crane_id = ?')
      sqlParams.push(params.craneId)
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
      SELECT * FROM alerts
      ${where}
      ORDER BY timestamp DESC
      ${limit}
    `

    return this.db.prepare(sql).all(...sqlParams) as Alert[]
  }

  findActiveAlerts(): Alert[] {
    return this.db.prepare(`
      SELECT * FROM alerts
      WHERE status = 'active'
      ORDER BY
        CASE level
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          WHEN 'info' THEN 3
        END,
        timestamp DESC
    `).all() as Alert[]
  }

  findAlertById(id: string): Alert | undefined {
    return this.db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as Alert | undefined
  }

  createAlert(data: Omit<Alert, 'id'>): Alert {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO alerts (id, crane_id, rule_id, sensor_type, level, message, value, threshold, timestamp, status, resolved_by, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.crane_id, data.rule_id || null, data.sensor_type, data.level, data.message, data.value, data.threshold, data.timestamp, data.status, data.resolved_by || null, data.resolved_at || null)
    return { id, ...data }
  }

  acknowledgeAlert(id: string, resolvedBy?: string): void {
    this.db.prepare(`
      UPDATE alerts SET status = 'acknowledged', resolved_by = COALESCE(?, resolved_by)
      WHERE id = ?
    `).run(resolvedBy || null, id)
  }

  resolveAlert(id: string, resolvedBy: string): void {
    const now = new Date().toISOString()
    this.db.prepare(`
      UPDATE alerts SET status = 'resolved', resolved_by = ?, resolved_at = ?
      WHERE id = ?
    `).run(resolvedBy, now, id)
  }

  findAllRules(craneId?: string): AlertRule[] {
    if (craneId) {
      return this.db.prepare(`
        SELECT * FROM alert_rules
        WHERE crane_id = 'all' OR crane_id = ?
        ORDER BY sensor_type, level
      `).all(craneId) as AlertRule[]
    }
    return this.db.prepare('SELECT * FROM alert_rules ORDER BY crane_id, sensor_type, level').all() as AlertRule[]
  }

  findRuleById(id: string): AlertRule | undefined {
    return this.db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id) as AlertRule | undefined
  }

  createRule(data: Omit<AlertRule, 'id'>): AlertRule {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO alert_rules (id, name, crane_id, sensor_type, condition, threshold, level, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.crane_id, data.sensor_type, data.condition, data.threshold, data.level, data.enabled ? 1 : 0)
    return { id, ...data }
  }

  updateRule(id: string, data: Partial<Omit<AlertRule, 'id'>>): void {
    const fields: string[] = []
    const params: any[] = []

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`)
        params.push(key === 'enabled' ? (value ? 1 : 0) : value)
      }
    }
    params.push(id)

    this.db.prepare(`UPDATE alert_rules SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  }

  deleteRule(id: string): void {
    this.db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id)
  }

  findMatchingRules(craneId: string, sensorType: string, value: number): AlertRule[] {
    const rules = this.db.prepare(`
      SELECT * FROM alert_rules
      WHERE enabled = 1
        AND (crane_id = 'all' OR crane_id = ?)
        AND sensor_type = ?
    `).all(craneId, sensorType) as AlertRule[]

    return rules.filter((rule) => {
      switch (rule.condition) {
        case 'gt': return value > rule.threshold
        case 'lt': return value < rule.threshold
        case 'gte': return value >= rule.threshold
        case 'lte': return value <= rule.threshold
        default: return false
      }
    })
  }

  getAlertStats(): { total: number; active: number; critical: number; warning: number; today: number } {
    const today = new Date().toISOString().split('T')[0]
    const result = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN level = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) as today
      FROM alerts
    `).get(`${today}T00:00:00.000Z`) as any

    return {
      total: result.total || 0,
      active: result.active || 0,
      critical: result.critical || 0,
      warning: result.warning || 0,
      today: result.today || 0,
    }
  }
}

export const alertRepository = new AlertRepository()
