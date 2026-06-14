import crypto from 'crypto'
import * as repo from '../repositories/userRepository.js'

const PBKDF2_ITERATIONS = 10000
const PBKDF2_KEY_LENGTH = 64
const PBKDF2_DIGEST = 'sha512'
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION_MINUTES = 30

export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'disabled'

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(verifyHash), Buffer.from(hash))
}

export function validateUsername(username: string): string | null {
  if (!username || username.trim().length === 0) return '用户名不能为空'
  if (username.length < 3 || username.length > 20) return '用户名长度应在3-20个字符之间'
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return '用户名只能包含字母、数字和下划线'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password || password.length === 0) return '密码不能为空'
  if (password.length < 6 || password.length > 32) return '密码长度应在6-32个字符之间'
  if (!/[a-z]/.test(password)) return '密码需包含小写字母'
  if (!/[A-Z]/.test(password)) return '密码需包含大写字母'
  if (!/[0-9]/.test(password)) return '密码需包含数字'
  return null
}

export function validateDisplayName(displayName: string): string | null {
  if (!displayName || displayName.trim().length === 0) return '显示名称不能为空'
  if (displayName.length > 30) return '显示名称不能超过30个字符'
  return null
}

export function validateEmail(email: string | undefined): string | null {
  if (!email) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式不正确'
  return null
}

export function validatePhone(phone: string | undefined): string | null {
  if (!phone) return null
  if (!/^1[3-9]\d{9}$/.test(phone)) return '手机号格式不正确'
  return null
}

export function generateToken(userId: string, username: string, role: UserRole): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    username,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  })).toString('base64url')
  const secret = process.env.JWT_SECRET || 'tower-crane-monitor-secret-key-2026'
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

export function verifyToken(token: string): { userId: string; username: string; role: UserRole } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payload, signature] = parts
    const secret = process.env.JWT_SECRET || 'tower-crane-monitor-secret-key-2026'
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null
    return { userId: decoded.sub, username: decoded.username, role: decoded.role as UserRole }
  } catch {
    return null
  }
}

export interface SanitizedUser {
  id: string
  username: string
  displayName: string
  email: string | null
  phone: string | null
  role: string
  status: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  lastLoginIp: string | null
}

function sanitizeUser(row: repo.UserRow): SanitizedUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
  }
}

export function authenticateUser(username: string, password: string, ip: string | null): { user: SanitizedUser; token: string } {
  const row = repo.findUserByUsername(username)
  if (!row) {
    repo.insertLoginAudit({ username, ip, success: false })
    throw new Error('用户名或密码错误')
  }

  if (repo.isAccountLocked(row.id)) {
    repo.insertLoginAudit({ username, ip, success: false })
    const remaining = Math.ceil((new Date(row.locked_until!).getTime() - Date.now()) / 60000)
    throw new Error(`账号已锁定，请${remaining}分钟后再试`)
  }

  if (row.status === 'disabled') {
    repo.insertLoginAudit({ username, ip, success: false })
    throw new Error('该账号已被禁用，请联系管理员')
  }

  if (!verifyPassword(password, row.password, row.salt)) {
    const attempts = repo.incrementLoginAttempts(row.id)
    repo.insertLoginAudit({ username, ip, success: false })
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      repo.lockUserAccount(row.id, LOCK_DURATION_MINUTES)
      throw new Error(`密码错误次数过多，账号已锁定${LOCK_DURATION_MINUTES}分钟`)
    }
    throw new Error(`用户名或密码错误，还剩${MAX_LOGIN_ATTEMPTS - attempts}次尝试机会`)
  }

  repo.updateUserLogin(row.id, ip)
  repo.insertLoginAudit({ username, ip, success: true })
  const token = generateToken(row.id, row.username, row.role as UserRole)
  const updatedRow = repo.findUserById(row.id)!
  return { user: sanitizeUser(updatedRow), token }
}

export function registerUser(data: {
  username: string
  password: string
  displayName: string
  email?: string
  phone?: string
  role?: string
}, operatorId: string, operatorName: string, ip: string | null): SanitizedUser {
  const usernameError = validateUsername(data.username)
  if (usernameError) throw new Error(usernameError)

  const passwordError = validatePassword(data.password)
  if (passwordError) throw new Error(passwordError)

  const displayNameError = validateDisplayName(data.displayName)
  if (displayNameError) throw new Error(displayNameError)

  const emailError = validateEmail(data.email)
  if (emailError) throw new Error(emailError)

  const phoneError = validatePhone(data.phone)
  if (phoneError) throw new Error(phoneError)

  const existing = repo.findUserByUsername(data.username)
  if (existing) throw new Error('该用户名已存在')

  const role: UserRole = (data.role as UserRole) || 'user'
  if (!['admin', 'user'].includes(role)) throw new Error('无效的角色')

  const { hash, salt } = hashPassword(data.password)
  const row = repo.createUser({
    username: data.username,
    password: hash,
    salt,
    display_name: data.displayName,
    email: data.email,
    phone: data.phone,
    role,
    status: 'active',
  })

  repo.insertOperationLog({
    user_id: operatorId,
    username: operatorName,
    action: 'CREATE_USER',
    target_type: 'user',
    target_id: row.id,
    detail: `创建用户: ${data.username}`,
    ip: ip || undefined,
  })

  return sanitizeUser(row)
}

export function getUserById(id: string): SanitizedUser {
  const row = repo.findUserById(id)
  if (!row) throw new Error('用户不存在')
  return sanitizeUser(row)
}

export function getUserList(params: repo.UserListParams): repo.PaginatedResult<SanitizedUser> {
  const result = repo.listUsers(params)
  return {
    ...result,
    list: result.list.map((row) => sanitizeUser(row as repo.UserRow)),
  }
}

export function updateUserInfo(
  id: string,
  data: Partial<Pick<repo.UserRow, 'display_name' | 'email' | 'phone' | 'role' | 'status'>>,
  operatorId: string,
  operatorName: string,
  ip: string | null
): SanitizedUser {
  const existing = repo.findUserById(id)
  if (!existing) throw new Error('用户不存在')

  if (data.display_name !== undefined) {
    const err = validateDisplayName(data.display_name)
    if (err) throw new Error(err)
  }
  if (data.email !== undefined) {
    const err = validateEmail(data.email)
    if (err) throw new Error(err)
  }
  if (data.phone !== undefined) {
    const err = validatePhone(data.phone)
    if (err) throw new Error(err)
  }
  if (data.role !== undefined && !['admin', 'user'].includes(data.role)) {
    throw new Error('无效的角色')
  }
  if (data.status !== undefined && !['active', 'disabled'].includes(data.status)) {
    throw new Error('无效的状态')
  }

  const updated = repo.updateUser(id, data)
  if (!updated) throw new Error('更新失败')

  const changes = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')

  repo.insertOperationLog({
    user_id: operatorId,
    username: operatorName,
    action: 'UPDATE_USER',
    target_type: 'user',
    target_id: id,
    detail: `更新用户 ${existing.username}: ${changes}`,
    ip: ip || undefined,
  })

  return sanitizeUser(updated)
}

export function resetUserPassword(
  id: string,
  newPassword: string,
  operatorId: string,
  operatorName: string,
  ip: string | null
): void {
  const existing = repo.findUserById(id)
  if (!existing) throw new Error('用户不存在')

  const err = validatePassword(newPassword)
  if (err) throw new Error(err)

  const { hash, salt } = hashPassword(newPassword)
  repo.updateUserPassword(id, hash, salt)

  repo.insertOperationLog({
    user_id: operatorId,
    username: operatorName,
    action: 'RESET_PASSWORD',
    target_type: 'user',
    target_id: id,
    detail: `重置用户 ${existing.username} 的密码`,
    ip: ip || undefined,
  })
}

export function changePassword(
  id: string,
  oldPassword: string,
  newPassword: string,
  ip: string | null
): void {
  const existing = repo.findUserById(id)
  if (!existing) throw new Error('用户不存在')

  if (!verifyPassword(oldPassword, existing.password, existing.salt)) {
    throw new Error('原密码错误')
  }

  const err = validatePassword(newPassword)
  if (err) throw new Error(err)

  const { hash, salt } = hashPassword(newPassword)
  repo.updateUserPassword(id, hash, salt)

  repo.insertOperationLog({
    user_id: id,
    username: existing.username,
    action: 'CHANGE_PASSWORD',
    target_type: 'user',
    target_id: id,
    detail: '修改自身密码',
    ip: ip || undefined,
  })
}

export function deleteUsersByIds(
  ids: string[],
  operatorId: string,
  operatorName: string,
  ip: string | null
): number {
  if (ids.includes(operatorId)) throw new Error('不能删除自己的账号')

  const count = repo.deleteUsers(ids)

  repo.insertOperationLog({
    user_id: operatorId,
    username: operatorName,
    action: 'DELETE_USERS',
    target_type: 'user',
    target_id: ids.join(','),
    detail: `批量删除 ${count} 个用户`,
    ip: ip || undefined,
  })

  return count
}

export function batchSetStatus(
  ids: string[],
  status: UserStatus,
  operatorId: string,
  operatorName: string,
  ip: string | null
): number {
  if (ids.includes(operatorId)) throw new Error('不能修改自己的状态')

  const count = repo.batchUpdateStatus(ids, status)

  repo.insertOperationLog({
    user_id: operatorId,
    username: operatorName,
    action: 'BATCH_UPDATE_STATUS',
    target_type: 'user',
    target_id: ids.join(','),
    detail: `批量设置 ${count} 个用户状态为 ${status}`,
    ip: ip || undefined,
  })

  return count
}

export function batchSetRole(
  ids: string[],
  role: UserRole,
  operatorId: string,
  operatorName: string,
  ip: string | null
): number {
  if (ids.includes(operatorId)) throw new Error('不能修改自己的角色')

  const count = repo.batchUpdateRole(ids, role)

  repo.insertOperationLog({
    user_id: operatorId,
    username: operatorName,
    action: 'BATCH_UPDATE_ROLE',
    target_type: 'user',
    target_id: ids.join(','),
    detail: `批量设置 ${count} 个用户角色为 ${role}`,
    ip: ip || undefined,
  })

  return count
}

export function getOperationLogs(params: repo.OperationLogListParams) {
  return repo.listOperationLogs(params)
}

export function updateOwnProfile(
  userId: string,
  data: { displayName?: string; email?: string; phone?: string },
  ip: string | null
): SanitizedUser {
  const existing = repo.findUserById(userId)
  if (!existing) throw new Error('用户不存在')

  const updateData: Partial<Pick<repo.UserRow, 'display_name' | 'email' | 'phone'>> = {}

  if (data.displayName !== undefined) {
    const err = validateDisplayName(data.displayName)
    if (err) throw new Error(err)
    updateData.display_name = data.displayName
  }
  if (data.email !== undefined) {
    const err = validateEmail(data.email || undefined)
    if (err) throw new Error(err)
    updateData.email = data.email || null
  }
  if (data.phone !== undefined) {
    const err = validatePhone(data.phone || undefined)
    if (err) throw new Error(err)
    updateData.phone = data.phone || null
  }

  if (Object.keys(updateData).length === 0) {
    return sanitizeUser(existing)
  }

  const updated = repo.updateUser(userId, updateData)
  if (!updated) throw new Error('更新失败')

  const changes = Object.entries(updateData)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')

  repo.insertOperationLog({
    user_id: userId,
    username: existing.username,
    action: 'UPDATE_PROFILE',
    target_type: 'user',
    target_id: userId,
    detail: `更新个人资料: ${changes}`,
    ip: ip || undefined,
  })

  return sanitizeUser(updated)
}

export function getLoginAuditLogs(params: repo.LoginAuditListParams) {
  return repo.listLoginAudit(params)
}
