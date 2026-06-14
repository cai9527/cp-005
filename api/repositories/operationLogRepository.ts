import { getDatabase } from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

export type OperationType =
  | 'crane.create'
  | 'crane.update'
  | 'crane.delete'
  | 'crane.status_change'
  | 'sensor.update'
  | 'rule.create'
  | 'rule.update'
  | 'rule.delete'
  | 'alert.acknowledge'
  | 'user.login'
  | 'user.logout'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'system.config'

export interface OperationLog {
  id: string
  user_id: string
  username: string
  operation: OperationType
  target_type: string
  target_id: string
  old_value: string | null
  new_value: string | null
  ip_address: string | null
  user_agent: string | null
  timestamp: string
  success: number
  error_message: string | null
}

class OperationLogRepository {
  private db = getDatabase()

  create(data: Omit<OperationLog, 'id' | 'timestamp'>): OperationLog {
    const id = uuidv4()
    const timestamp = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO operation_logs (
        id, user_id, username, operation, target_type, target_id,
        old_value, new_value, ip_address, user_agent, timestamp, success, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.user_id,
      data.username,
      data.operation,
      data.target_type,
      data.target_id,
      data.old_value,
      data.new_value,
      data.ip_address,
      data.user_agent,
      timestamp,
      data.success,
      data.error_message,
    )
    return { id, timestamp, ...data }
  }

  logCraneUpdate(
    userId: string,
    username: string,
    craneId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    changedFields: string[],
    ip: string | null,
    userAgent: string | null,
    success: boolean,
    errorMessage?: string
  ): OperationLog {
    const oldValue = changedFields.length > 0
      ? JSON.stringify(Object.fromEntries(changedFields.map((f) => [f, oldData[f]])))
      : null
    const newValue = changedFields.length > 0
      ? JSON.stringify(Object.fromEntries(changedFields.map((f) => [f, newData[f]])))
      : null

    return this.create({
      user_id: userId,
      username,
      operation: 'crane.update',
      target_type: 'crane',
      target_id: craneId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ip,
      user_agent: userAgent,
      success: success ? 1 : 0,
      error_message: errorMessage || null,
    })
  }

  logCraneCreate(
    userId: string,
    username: string,
    craneId: string,
    newData: Record<string, unknown>,
    ip: string | null,
    userAgent: string | null,
    success: boolean,
    errorMessage?: string
  ): OperationLog {
    return this.create({
      user_id: userId,
      username,
      operation: 'crane.create',
      target_type: 'crane',
      target_id: craneId,
      old_value: null,
      new_value: JSON.stringify(newData),
      ip_address: ip,
      user_agent: userAgent,
      success: success ? 1 : 0,
      error_message: errorMessage || null,
    })
  }

  logCraneDelete(
    userId: string,
    username: string,
    craneId: string,
    oldData: Record<string, unknown>,
    ip: string | null,
    userAgent: string | null,
    success: boolean,
    errorMessage?: string
  ): OperationLog {
    return this.create({
      user_id: userId,
      username,
      operation: 'crane.delete',
      target_type: 'crane',
      target_id: craneId,
      old_value: JSON.stringify(oldData),
      new_value: null,
      ip_address: ip,
      user_agent: userAgent,
      success: success ? 1 : 0,
      error_message: errorMessage || null,
    })
  }

  findByTarget(targetType: string, targetId: string, limit = 50): OperationLog[] {
    return this.db.prepare(`
      SELECT * FROM operation_logs
      WHERE target_type = ? AND target_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(targetType, targetId, limit) as OperationLog[]
  }

  findByUser(userId: string, limit = 50): OperationLog[] {
    return this.db.prepare(`
      SELECT * FROM operation_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(userId, limit) as OperationLog[]
  }

  findRecent(limit = 100): OperationLog[] {
    return this.db.prepare(`
      SELECT * FROM operation_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as OperationLog[]
  }
}

export const operationLogRepository = new OperationLogRepository()
