import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  user: { username: string } | null
  token: string | null
  loading: boolean
  error: string | null
  login: (username: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: (() => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    return !!token
  })(),
  user: (() => {
    const saved = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user')
    if (saved) {
      try { return JSON.parse(saved) } catch { return null }
    }
    return null
  })(),
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
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('auth_token', data.token)
      storage.setItem('auth_user', JSON.stringify({ username }))
      if (remember) {
        localStorage.setItem('remembered_username', username)
      } else {
        localStorage.removeItem('remembered_username')
      }
      set({
        isAuthenticated: true,
        user: { username },
        token: data.token,
        loading: false,
        error: null,
      })
    } catch (err: any) {
      set({
        loading: false,
        error: err.message || '网络错误，请稍后重试',
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
