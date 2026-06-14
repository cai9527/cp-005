import { create } from 'zustand'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  username: string
  role: UserRole
}

interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
  loading: boolean
  error: string | null
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
  clearError: () => void
}

const DEFAULT_ACCOUNTS: Record<string, { password: string; role: UserRole }> = {
  admin: { password: 'admin123', role: 'admin' },
  user: { password: 'user123', role: 'user' },
}

function parseStoredUser(): AuthUser | null {
  const saved = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed.username === 'string') {
        return {
          username: parsed.username,
          role: parsed.role || 'user',
        }
      }
    } catch {
      return null
    }
  }
  return null
}

export const useAuthStore = create<AuthState>((set) => ({
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
      const role: UserRole = data.role || 'user'
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('auth_token', data.token)
      storage.setItem('auth_user', JSON.stringify({ username, role }))
      if (remember) {
        localStorage.setItem('remembered_username', username)
      } else {
        localStorage.removeItem('remembered_username')
      }
      set({
        isAuthenticated: true,
        user: { username, role },
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

  clearError: () => set({ error: null }),
}))

export { DEFAULT_ACCOUNTS }
