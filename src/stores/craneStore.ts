import { create } from 'zustand'

export interface Crane {
  id: string
  name: string
  model: string
  status: 'online' | 'offline' | 'alarm'
  location_x: number
  location_y: number
  max_load: number
  max_moment: number
  max_radius: number
  max_height: number
  install_date: string
  last_maintenance: string
  manufacturer?: string
  serial_number?: string
  production_date?: string
  project_name?: string
  construction_unit?: string
  registration_number?: string
  min_radius?: number
  tip_load?: number
  hoist_speed?: number
  slewing_speed?: number
  trolley_speed?: number
  motor_power?: number
  total_weight?: number
  jib_weight?: number
  counterweight?: number
  free_standing_height?: number
  max_anchored_height?: number
  working_temp_min?: number
  working_temp_max?: number
  max_wind_operational?: number
  max_wind_nonoperational?: number
  power_supply?: string
}

export type CraneCreateInput = Omit<Crane, 'id'>

export interface ValidationFieldError {
  field: string
  message: string
}

export interface CreateCraneResult {
  success: boolean
  crane?: Crane
  error?: string
  fieldErrors?: ValidationFieldError[]
  changedFields?: string[]
}

export interface UpdateCraneResult extends CreateCraneResult {
  changedFields?: string[]
}

export interface SensorData {
  crane_id: string
  sensor_type: string
  value: number
  timestamp: string
  unit: string
}

interface CraneState {
  cranes: Crane[]
  sensorData: Record<string, SensorData[]>
  stats: { total: number; online: number; offline: number; alarm: number }
  selectedCraneId: string | null
  loading: boolean
  creating: boolean
  updating: boolean

  fetchCranes: () => Promise<void>
  fetchCraneStats: () => Promise<void>
  fetchLatestSensorData: () => Promise<void>
  fetchLatestByCrane: (craneId: string) => Promise<void>
  selectCrane: (id: string | null) => void
  updateSensorData: (craneId: string, sensorType: string, value: number, timestamp: string) => void
  updateCraneStatus: (craneId: string, status: string) => void
  createCrane: (input: Partial<CraneCreateInput>) => Promise<CreateCraneResult>
  updateCrane: (id: string, input: Partial<CraneCreateInput>) => Promise<UpdateCraneResult>
}

const API_BASE = '/api'

export const useCraneStore = create<CraneState>((set, get) => ({
  cranes: [],
  sensorData: {},
  stats: { total: 0, online: 0, offline: 0, alarm: 0 },
  selectedCraneId: null,
  loading: false,
  creating: false,
  updating: false,

  fetchCranes: async () => {
    set({ loading: true })
    try {
      const res = await fetch(`${API_BASE}/cranes`)
      const json = await res.json()
      if (json.success) {
        set({ cranes: json.data })
      }
    } catch (e) {
      console.error('Failed to fetch cranes:', e)
    } finally {
      set({ loading: false })
    }
  },

  fetchCraneStats: async () => {
    try {
      const res = await fetch(`${API_BASE}/cranes/stats`)
      const json = await res.json()
      if (json.success) {
        set({ stats: json.data })
      }
    } catch (e) {
      console.error('Failed to fetch crane stats:', e)
    }
  },

  fetchLatestSensorData: async () => {
    try {
      const res = await fetch(`${API_BASE}/sensor-data/latest`)
      const json = await res.json()
      if (json.success) {
        set({ sensorData: json.data })
      }
    } catch (e) {
      console.error('Failed to fetch latest sensor data:', e)
    }
  },

  fetchLatestByCrane: async (craneId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sensor-data/latest/${craneId}`)
      const json = await res.json()
      if (json.success) {
        set((state) => ({
          sensorData: { ...state.sensorData, [craneId]: json.data },
        }))
      }
    } catch (e) {
      console.error('Failed to fetch latest sensor data for crane:', e)
    }
  },

  selectCrane: (id) => set({ selectedCraneId: id }),

  updateSensorData: (craneId, sensorType, value, timestamp) => {
    set((state) => {
      const existing = state.sensorData[craneId] || []
      const updated = existing.map((s) =>
        s.sensor_type === sensorType ? { ...s, value, timestamp } : s
      )
      if (!updated.find((s) => s.sensor_type === sensorType)) {
        const unitMap: Record<string, string> = {
          load: 't', moment: 't·m', radius: 'm', height: 'm', rotation: '°', wind: 'm/s',
        }
        updated.push({ crane_id: craneId, sensor_type: sensorType, value, timestamp, unit: unitMap[sensorType] || '' })
      }
      return { sensorData: { ...state.sensorData, [craneId]: updated } }
    })
  },

  updateCraneStatus: (craneId, status) => {
    set((state) => ({
      cranes: state.cranes.map((c) =>
        c.id === craneId ? { ...c, status: status as Crane['status'] } : c
      ),
    }))
  },

  createCrane: async (input: Partial<CraneCreateInput>): Promise<CreateCraneResult> => {
    set({ creating: true })
    try {
      const res = await fetch(`${API_BASE}/cranes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        const newCrane = json.data as Crane
        set((state) => ({
          cranes: [...state.cranes, newCrane].sort((a, b) => a.name.localeCompare(b.name)),
        }))
        get().fetchCraneStats()
        return { success: true, crane: newCrane }
      }

      if (res.status === 400 && json.details) {
        return {
          success: false,
          error: json.error || '数据校验失败',
          fieldErrors: json.details as ValidationFieldError[],
        }
      }

      return {
        success: false,
        error: json.error || '创建设备失败，请稍后重试',
      }
    } catch (e) {
      console.error('Failed to create crane:', e)
      return {
        success: false,
        error: '网络错误，请稍后重试',
      }
    } finally {
      set({ creating: false })
    }
  },

  updateCrane: async (id: string, input: Partial<CraneCreateInput>): Promise<UpdateCraneResult> => {
    set({ updating: true })
    try {
      const res = await fetch(`${API_BASE}/cranes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        const updatedCrane = json.data as Crane
        set((state) => ({
          cranes: state.cranes
            .map((c) => (c.id === id ? updatedCrane : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        get().fetchCraneStats()
        return {
          success: true,
          crane: updatedCrane,
          changedFields: json.changedFields as string[],
        }
      }

      if (res.status === 401) {
        return {
          success: false,
          error: '未授权，请重新登录',
        }
      }

      if (res.status === 403) {
        return {
          success: false,
          error: '权限不足，仅管理员可编辑设备',
        }
      }

      if (res.status === 404) {
        return {
          success: false,
          error: json.error || '设备不存在',
        }
      }

      if (res.status === 400 && json.details) {
        return {
          success: false,
          error: json.error || '数据校验失败',
          fieldErrors: json.details as ValidationFieldError[],
        }
      }

      return {
        success: false,
        error: json.error || '更新失败，请稍后重试',
      }
    } catch (e) {
      console.error('Failed to update crane:', e)
      return {
        success: false,
        error: '网络错误，请稍后重试',
      }
    } finally {
      set({ updating: false })
    }
  },
}))
