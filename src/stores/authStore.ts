import { create } from 'zustand'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: string
  username: string
  displayName: string
  email: string | null
  phone: string | null
  role: UserRole
  status: string
}

interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
  loading: boolean
  error: string | null
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
  fetchCurrentUser: () => Promise<void>
  updateProfile: (data: { displayName?: string; email?: string; phone?: string }) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  clearError: () => void
}

function parseStoredUser(): AuthUser | null {
  const saved = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed.username === 'string') {
        return {
          id: parsed.id || '',
          username: parsed.username,
          displayName: parsed.displayName || parsed.username,
          email: parsed.email || null,
          phone: parsed.phone || null,
          role: parsed.role || 'user',
          status: parsed.status || 'active',
        }
      }
    } catch {
      return null
    }
  }
  return null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: (() => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    return !!token
  })(),
  user: parseStoredUser(),
  token: localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'),
  loading: false,
  error: null,

  login: async (username: string, password: string, remember: boolean) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '登录失败，请检查用户名和密码')
      }
      const data = await res.json()
      const role: UserRole = data.user?.role || 'user'
      const authUser: AuthUser = {
        id: data.user?.id || '',
        username: data.user?.username || username,
        displayName: data.user?.displayName || username,
        email: data.user?.email || null,
        phone: data.user?.phone || null,
        role,
        status: data.user?.status || 'active',
      }
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('auth_token', data.token)
      storage.setItem('auth_user', JSON.stringify(authUser))
      if (remember) {
        localStorage.setItem('remembered_username', username)
      } else {
        localStorage.removeItem('remembered_username')
      }
      set({
        isAuthenticated: true,
        user: authUser,
        token: data.token,
        loading: false,
        error: null,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '网络错误，请稍后重试'
      set({
        loading: false,
        error: message,
      })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      error: null,
    })
  },

  fetchCurrentUser: async () => {
    const token = get().token
    if (!token) return
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const user = await res.json()
        const authUser: AuthUser = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        }
        set({ user: authUser })
        const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage
        storage.setItem('auth_user', JSON.stringify(authUser))
      }
    } catch {
      // silently fail
    }
  },

  updateProfile: async (data) => {
    set({ loading: true, error: null })
    try {
      const token = get().token
      const res = await fetch('/api/auth/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '更新失败')
      }
      const updatedUser = await res.json()
      const authUser: AuthUser = {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
      }
      const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage
      storage.setItem('auth_user', JSON.stringify(authUser))
      set({ user: authUser, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '更新失败' })
      throw err
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    set({ loading: true, error: null })
    try {
      const token = get().token
      const res = await fetch('/api/auth/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '密码修改失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '密码修改失败' })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))
