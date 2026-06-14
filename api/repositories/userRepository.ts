import getDatabase from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

export interface UserRow {
  id: string
  username: string
  password: string
  salt: string
  display_name: string
  email: string | null
  phone: string | null
  role: string
  status: string
  login_attempts: number
  locked_until: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
  last_login_ip: string | null
}

export interface OperationLogRow {
  id: string
  user_id: string
  username: string
  action: string
  target_type: string | null
  target_id: string | null
  detail: string | null
  ip: string | null
  timestamp: string
}

export interface UserListParams {
  page: number
  pageSize: number
  keyword?: string
  role?: string
  status?: string
}

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export function findUserByUsername(username: string): UserRow | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined
}

export function findUserById(id: string): UserRow | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function listUsers(params: UserListParams): PaginatedResult<Omit<UserRow, 'password' | 'salt'>> {
  const db = getDatabase()
  const { page, pageSize, keyword, role, status } = params

  let whereClause = 'WHERE 1=1'
  const sqlParams: (string | number)[] = []

  if (keyword) {
    whereClause += ' AND (username LIKE ? OR display_name LIKE ? OR email LIKE ? OR phone LIKE ?)'
    const likeKeyword = `%${keyword}%`
    sqlParams.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword)
  }
  if (role) {
    whereClause += ' AND role = ?'
    sqlParams.push(role)
  }
  if (status) {
    whereClause += ' AND status = ?'
    sqlParams.push(status)
  }

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...sqlParams) as { count: number }
  const total = countRow.count

  const offset = (page - 1) * pageSize
  const list = db.prepare(
    `SELECT id, username, display_name, email, phone, role, status, created_at, updated_at, last_login_at, last_login_ip FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...sqlParams, pageSize, offset) as Omit<UserRow, 'password' | 'salt'>[]

  return { list, total, page, pageSize }
}

export function createUser(data: {
  username: string
  password: string
  salt: string
  display_name: string
  email?: string
  phone?: string
  role: string
  status: string
}): UserRow {
  const db = getDatabase()
  const now = new Date().toISOString()
  const id = uuidv4()
  db.prepare(`
    INSERT INTO users (id, username, password, salt, display_name, email, phone, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.username, data.password, data.salt, data.display_name, data.email || null, data.phone || null, data.role, data.status, now, now)
  return findUserById(id)!
}

export function updateUser(id: string, data: Partial<Pick<UserRow, 'display_name' | 'email' | 'phone' | 'role' | 'status'>>): UserRow | undefined {
  const db = getDatabase()
  const fields: string[] = []
  const values: (string | null)[] = []

  if (data.display_name !== undefined) { fields.push('display_name = ?'); values.push(data.display_name) }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }

  if (fields.length === 0) return findUserById(id)

  fields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return findUserById(id)
}

export function updateUserPassword(id: string, password: string, salt: string): void {
  const db = getDatabase()
  db.prepare('UPDATE users SET password = ?, salt = ?, updated_at = ? WHERE id = ?').run(password, salt, new Date().toISOString(), id)
}

export function updateUserLogin(id: string, ip: string | null): void {
  const db = getDatabase()
  db.prepare('UPDATE users SET last_login_at = ?, last_login_ip = ?, login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?').run(new Date().toISOString(), ip, new Date().toISOString(), id)
}

export function incrementLoginAttempts(id: string): number {
  const db = getDatabase()
  const row = db.prepare('SELECT login_attempts FROM users WHERE id = ?').get(id) as { login_attempts: number } | undefined
  const attempts = (row?.login_attempts || 0) + 1
  db.prepare('UPDATE users SET login_attempts = ?, updated_at = ? WHERE id = ?').run(attempts, new Date().toISOString(), id)
  return attempts
}

export function lockUserAccount(id: string, lockMinutes: number): void {
  const db = getDatabase()
  const lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString()
  db.prepare('UPDATE users SET locked_until = ?, updated_at = ? WHERE id = ?').run(lockedUntil, new Date().toISOString(), id)
}

export function isAccountLocked(id: string): boolean {
  const db = getDatabase()
  const row = db.prepare('SELECT locked_until FROM users WHERE id = ?').get(id) as { locked_until: string | null } | undefined
  if (!row?.locked_until) return false
  if (new Date(row.locked_until) > new Date()) return true
  db.prepare('UPDATE users SET locked_until = NULL, login_attempts = 0 WHERE id = ?').run(id)
  return false
}

export function insertLoginAudit(data: {
  username: string
  ip?: string
  success: boolean
}): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO login_audit (id, username, ip, success, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), data.username, data.ip || null, data.success ? 1 : 0, new Date().toISOString())
}

export function deleteUsers(ids: string[]): number {
  const db = getDatabase()
  const placeholders = ids.map(() => '?').join(',')
  const result = db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...ids)
  return result.changes
}

export function batchUpdateStatus(ids: string[], status: string): number {
  const db = getDatabase()
  const placeholders = ids.map(() => '?').join(',')
  const result = db.prepare(`UPDATE users SET status = ?, updated_at = ? WHERE id IN (${placeholders})`).run(status, new Date().toISOString(), ...ids)
  return result.changes
}

export function batchUpdateRole(ids: string[], role: string): number {
  const db = getDatabase()
  const placeholders = ids.map(() => '?').join(',')
  const result = db.prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id IN (${placeholders})`).run(role, new Date().toISOString(), ...ids)
  return result.changes
}

export function insertOperationLog(data: {
  user_id: string
  username: string
  action: string
  target_type?: string
  target_id?: string
  detail?: string
  ip?: string
}): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO operation_logs (id, user_id, username, action, target_type, target_id, detail, ip, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), data.user_id, data.username, data.action, data.target_type || null, data.target_id || null, data.detail || null, data.ip || null, new Date().toISOString())
}

export interface OperationLogListParams {
  page: number
  pageSize: number
  userId?: string
  action?: string
  startDate?: string
  endDate?: string
}

export function listOperationLogs(params: OperationLogListParams): PaginatedResult<OperationLogRow> {
  const db = getDatabase()
  const { page, pageSize, userId, action, startDate, endDate } = params

  let whereClause = 'WHERE 1=1'
  const sqlParams: (string | number)[] = []

  if (userId) {
    whereClause += ' AND user_id = ?'
    sqlParams.push(userId)
  }
  if (action) {
    whereClause += ' AND action LIKE ?'
    sqlParams.push(`%${action}%`)
  }
  if (startDate) {
    whereClause += ' AND timestamp >= ?'
    sqlParams.push(startDate)
  }
  if (endDate) {
    whereClause += ' AND timestamp <= ?'
    sqlParams.push(endDate)
  }

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM operation_logs ${whereClause}`).get(...sqlParams) as { count: number }
  const total = countRow.count

  const offset = (page - 1) * pageSize
  const list = db.prepare(
    `SELECT * FROM operation_logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  ).all(...sqlParams, pageSize, offset) as OperationLogRow[]

  return { list, total, page, pageSize }
}

export interface LoginAuditRow {
  id: string
  username: string
  ip: string | null
  success: number
  timestamp: string
}

export interface LoginAuditListParams {
  page: number
  pageSize: number
  username?: string
  success?: boolean
  startDate?: string
  endDate?: string
}

export function listLoginAudit(params: LoginAuditListParams): PaginatedResult<LoginAuditRow> {
  const db = getDatabase()
  const { page, pageSize, username, success, startDate, endDate } = params

  let whereClause = 'WHERE 1=1'
  const sqlParams: (string | number)[] = []

  if (username) {
    whereClause += ' AND username LIKE ?'
    sqlParams.push(`%${username}%`)
  }
  if (success !== undefined) {
    whereClause += ' AND success = ?'
    sqlParams.push(success ? 1 : 0)
  }
  if (startDate) {
    whereClause += ' AND timestamp >= ?'
    sqlParams.push(startDate)
  }
  if (endDate) {
    whereClause += ' AND timestamp <= ?'
    sqlParams.push(endDate)
  }

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM login_audit ${whereClause}`).get(...sqlParams) as { count: number }
  const total = countRow.count

  const offset = (page - 1) * pageSize
  const list = db.prepare(
    `SELECT * FROM login_audit ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  ).all(...sqlParams, pageSize, offset) as LoginAuditRow[]

  return { list, total, page, pageSize }
}
