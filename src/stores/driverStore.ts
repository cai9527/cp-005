import { create } from 'zustand'
import { useAuthStore } from './authStore'

export interface Driver {
  id: string
  name: string
  gender: 'male' | 'female'
  id_card: string
  phone: string
  emergency_contact: string | null
  emergency_phone: string | null
  address: string | null
  photo: string | null
  status: 'active' | 'leave' | 'resigned'
  hire_date: string
  leave_date: string | null
  experience_years: number
  crane_id: string | null
  crane_name?: string
  created_at: string
  updated_at: string
}

export interface DriverCertification {
  id: string
  driver_id: string
  cert_type: string
  cert_number: string
  issue_authority: string
  issue_date: string
  expiry_date: string
  status: 'valid' | 'expired' | 'revoked'
  remark: string | null
  created_at: string
  updated_at: string
}

export interface DriverWorkRecord {
  id: string
  driver_id: string
  crane_id: string
  work_date: string
  start_time: string
  end_time: string
  work_type: 'normal' | 'overtime' | 'holiday'
  work_content: string | null
  load_count: number
  max_load: number
  remark: string | null
  created_at: string
}

export interface DriverSchedule {
  id: string
  driver_id: string
  crane_id: string
  schedule_date: string
  shift_type: 'day' | 'night' | 'split'
  start_time: string
  end_time: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  remark: string | null
  created_at: string
  updated_at: string
}

export interface DriverTraining {
  id: string
  driver_id: string
  training_type: 'safety' | 'skill' | 'emergency' | 'special'
  training_name: string
  training_date: string
  duration_hours: number
  trainer: string | null
  training_org: string | null
  result: 'pending' | 'passed' | 'failed'
  score: number | null
  remark: string | null
  created_at: string
  updated_at: string
}

export interface DriverWorkStats {
  total_days: number
  total_load_count: number
  max_load: number
  overtime_days: number
  holiday_days: number
}

const API_BASE = '/api'

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

interface DriverStoreState {
  drivers: Driver[]
  loading: boolean
  error: string | null
  certifications: DriverCertification[]
  workRecords: DriverWorkRecord[]
  schedules: DriverSchedule[]
  trainings: DriverTraining[]
  workStats: DriverWorkStats | null
  expiringCerts: DriverCertification[]

  fetchDrivers: () => Promise<void>
  createDriver: (data: Partial<Driver>) => Promise<void>
  updateDriver: (id: string, data: Partial<Driver>) => Promise<void>
  deleteDriver: (id: string) => Promise<void>
  fetchCertifications: (driverId: string) => Promise<void>
  createCertification: (driverId: string, data: Partial<DriverCertification>) => Promise<void>
  updateCertification: (id: string, data: Partial<DriverCertification>) => Promise<void>
  deleteCertification: (id: string) => Promise<void>
  fetchExpiringCerts: (days?: number) => Promise<void>
  fetchWorkRecords: (driverId: string, limit?: number) => Promise<void>
  createWorkRecord: (driverId: string, data: Partial<DriverWorkRecord>) => Promise<void>
  fetchWorkStats: (driverId: string, startDate: string, endDate: string) => Promise<void>
  fetchSchedules: (driverId: string, startDate?: string, endDate?: string) => Promise<void>
  fetchSchedulesByDate: (date: string) => Promise<void>
  createSchedule: (driverId: string, data: Partial<DriverSchedule>) => Promise<void>
  updateSchedule: (id: string, data: Partial<DriverSchedule>) => Promise<void>
  deleteSchedule: (id: string) => Promise<void>
  fetchTrainings: (driverId: string) => Promise<void>
  createTraining: (driverId: string, data: Partial<DriverTraining>) => Promise<void>
  updateTraining: (id: string, data: Partial<DriverTraining>) => Promise<void>
  deleteTraining: (id: string) => Promise<void>
  clearError: () => void
}

export const useDriverStore = create<DriverStoreState>((set) => ({
  drivers: [],
  loading: false,
  error: null,
  certifications: [],
  workRecords: [],
  schedules: [],
  trainings: [],
  workStats: null,
  expiringCerts: [],

  fetchDrivers: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取驾驶员列表失败')
      }
      const data = await res.json()
      set({ drivers: data, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取驾驶员列表失败' })
    }
  },

  createDriver: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '创建驾驶员失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '创建驾驶员失败' })
      throw err
    }
  },

  updateDriver: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '更新驾驶员失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '更新驾驶员失败' })
      throw err
    }
  },

  deleteDriver: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '删除驾驶员失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '删除驾驶员失败' })
      throw err
    }
  },

  fetchCertifications: async (driverId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/${driverId}/certifications`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取证书列表失败')
      }
      const data = await res.json()
      set({ certifications: data, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取证书列表失败' })
    }
  },

  createCertification: async (driverId, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/${driverId}/certifications`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '创建证书失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '创建证书失败' })
      throw err
    }
  },

  updateCertification: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/certifications/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '更新证书失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '更新证书失败' })
      throw err
    }
  },

  deleteCertification: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/certifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '删除证书失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '删除证书失败' })
      throw err
    }
  },

  fetchExpiringCerts: async (days = 30) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/certifications/expiring?days=${days}`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取即将过期证书失败')
      }
      const data = await res.json()
      set({ expiringCerts: data, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取即将过期证书失败' })
    }
  },

  fetchWorkRecords: async (driverId, limit?) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams()
      if (limit) query.set('limit', String(limit))
      const qs = query.toString()
      const url = qs ? `${API_BASE}/drivers/${driverId}/work-records?${qs}` : `${API_BASE}/drivers/${driverId}/work-records`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取工作记录失败')
      }
      const data = await res.json()
      set({ workRecords: data, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取工作记录失败' })
    }
  },

  createWorkRecord: async (driverId, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/${driverId}/work-records`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '创建工作记录失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '创建工作记录失败' })
      throw err
    }
  },

  fetchWorkStats: async (driverId, startDate, endDate) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams()
      query.set('startDate', startDate)
      query.set('endDate', endDate)
      const res = await fetch(`${API_BASE}/drivers/${driverId}/work-stats?${query.toString()}`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取工作统计失败')
      }
      const data = await res.json()
      set({ workStats: data, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取工作统计失败' })
    }
  },

  fetchSchedules: async (driverId, startDate?, endDate?) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams()
      if (startDate) query.set('startDate', startDate)
      if (endDate) query.set('endDate', endDate)
      const qs = query.toString()
      const url = qs ? `${API_BASE}/drivers/${driverId}/schedules?${qs}` : `${API_BASE}/drivers/${driverId}/schedules`
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取排班记录失败')
      }
      const data = await res.json()
      set({ schedules: data, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取排班记录失败' })
    }
  },

  fetchSchedulesByDate: async (date) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/schedules/by-date?date=${date}`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取排班记录失败')
      }
      const data = await res.json()
      set({ schedules: data, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取排班记录失败' })
    }
  },

  createSchedule: async (driverId, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/${driverId}/schedules`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '创建排班记录失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '创建排班记录失败' })
      throw err
    }
  },

  updateSchedule: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/schedules/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '更新排班记录失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '更新排班记录失败' })
      throw err
    }
  },

  deleteSchedule: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/schedules/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '删除排班记录失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '删除排班记录失败' })
      throw err
    }
  },

  fetchTrainings: async (driverId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/${driverId}/trainings`, { headers: getAuthHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || '获取培训记录失败')
      }
      const data = await res.json()
      set({ trainings: data, loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '获取培训记录失败' })
    }
  },

  createTraining: async (driverId, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/${driverId}/trainings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '创建培训记录失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '创建培训记录失败' })
      throw err
    }
  },

  updateTraining: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/trainings/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '更新培训记录失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '更新培训记录失败' })
      throw err
    }
  },

  deleteTraining: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/drivers/trainings/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        throw new Error(result.message || '删除培训记录失败')
      }
      set({ loading: false })
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : '删除培训记录失败' })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))
