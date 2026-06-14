import { create } from 'zustand'
import { useAuthStore } from './authStore'

export interface UserItem {
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

export interface OperationLog {
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

export interface LoginLog {
  id: string
  username: string
  ip: string | null
  success: boolean
  timestamp: string
}

interface UserListResult {
  list: UserItem[]
  total: number
  page: number
  pageSize: number
}

interface LogListResult {
  list: OperationLog[]
  total: number
  page: number
  pageSize: number
}

interface UserStoreState {
  users: UserItem[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null

  logs: OperationLog[]
  logTotal: number
  logPage: number
  logPageSize: number
  logLoading: boolean

  loginLogs: LoginLog[]
  loginLogTotal: number
  loginLogPage: number
  loginLogPageSize: number
  loginLogLoading: boolean

  fetchUsers: (params?: { page?: number; pageSize?: number; keyword?: string; role?: string; status?: string }) => Promise<void>
  createUser: (data: { username: string; password: string; displayName: string; email?: string; phone?: string; role?: string }) => Promise<void>
  updateUser: (id: string, data: Partial<Pick<UserItem, 'displayName' | 'email' | 'phone' | 'role' | 'status'>>) => Promise<void>
  resetPassword: (id: string, newPassword: string) => Promise<void>
  deleteUsers: (ids: string[]) => Promise<void>
  batchSetStatus: (ids: string[], status: string) => Promise<void>
  batchSetRole: (ids: string[], role: string) => Promise<void>
  fetchLogs: (params?: { page?: number; pageSize?: number; userId?: string; action?: string; startDate?: string; endDate?: string }) => Promise<void>
  fetchLoginLogs: (params?: { page?: number; pageSize?: number; username?: string; success?: boolean; startDate?: string; endDate?: string }) => Promise<void>
  clearError: () => void
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const useUserStore = create<UserStoreState>((set) => ({
  users: [],
  total: 0,
  page: 1,
  pageSize: 10,
  loading: false,
  error: null,

  logs: [],
  logTotal: 0,
  logPage: 1,
  logPageSize: 10,
  logLoading: false,

  loginLogs: [],
  loginLogTotal: 0,
  loginLogPage: 1,
  loginLogPageSize: 10,
  loginLogLoading: false,

  fetchUsers: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const page = params.page || 1
      const pageSize = params.pageSize || 10
      const query = new URLSearchParams()
      query.set('page', String(page))
      query.set('pageSize', String(pageSize))
      if (params.keyword) query.set('keyword', params.keyword)
      if (params.role) query.set('role', params.role)
      if (params.status) query.set('status', params.status)

      const res = await fetch(`/api/users?${query.toString()}`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取用户列表失败')
      }
      const data: UserListResult = await res.json()
      set({ users: data.list, total: data.total, page: data.page, pageSize: data.pageSize, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取用户列表失败' })
    }
  },

  createUser: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '创建用户失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '创建用户失败' })
      throw err
    }
  },

  updateUser: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '更新用户失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '更新用户失败' })
      throw err
    }
  },

  resetPassword: async (id, newPassword) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/users/${id}/password/reset`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword }),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '重置密码失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '重置密码失败' })
      throw err
    }
  },

  deleteUsers: async (ids) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '删除用户失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '删除用户失败' })
      throw err
    }
  },

  batchSetStatus: async (ids, status) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/users/batch/status', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids, status }),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '批量操作失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '批量操作失败' })
      throw err
    }
  },

  batchSetRole: async (ids, role) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/users/batch/role', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids, role }),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '批量操作失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '批量操作失败' })
      throw err
    }
  },

  fetchLogs: async (params = {}) => {
    set({ logLoading: true })
    try {
      const page = params.page || 1
      const pageSize = params.pageSize || 10
      const query = new URLSearchParams()
      query.set('page', String(page))
      query.set('pageSize', String(pageSize))
      if (params.userId) query.set('userId', params.userId)
      if (params.action) query.set('action', params.action)
      if (params.startDate) query.set('startDate', params.startDate)
      if (params.endDate) query.set('endDate', params.endDate)

      const res = await fetch(`/api/users/logs?${query.toString()}`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取日志失败')
      }
      const data: LogListResult = await res.json()
      set({ logs: data.list, logTotal: data.total, logPage: data.page, logPageSize: data.pageSize, logLoading: false })
    } catch {
      set({ logLoading: false })
    }
  },

  fetchLoginLogs: async (params = {}) => {
    set({ loginLogLoading: true })
    try {
      const page = params.page || 1
      const pageSize = params.pageSize || 10
      const query = new URLSearchParams()
      query.set('page', String(page))
      query.set('pageSize', String(pageSize))
      if (params.username) query.set('username', params.username)
      if (params.success !== undefined) query.set('success', String(params.success))
      if (params.startDate) query.set('startDate', params.startDate)
      if (params.endDate) query.set('endDate', params.endDate)

      const res = await fetch(`/api/users/login-logs?${query.toString()}`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取登录日志失败')
      }
      const data = await res.json()
      const list = data.list.map((item: { id: string; username: string; ip: string | null; success: number; timestamp: string }) => ({
        ...item,
        success: item.success === 1,
      }))
      set({ loginLogs: list, loginLogTotal: data.total, loginLogPage: data.page, loginLogPageSize: data.pageSize, loginLogLoading: false })
    } catch {
      set({ loginLogLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
