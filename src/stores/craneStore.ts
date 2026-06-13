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

  fetchCranes: () => Promise<void>
  fetchCraneStats: () => Promise<void>
  fetchLatestSensorData: () => Promise<void>
  fetchLatestByCrane: (craneId: string) => Promise<void>
  selectCrane: (id: string | null) => void
  updateSensorData: (craneId: string, sensorType: string, value: number, timestamp: string) => void
  updateCraneStatus: (craneId: string, status: string) => void
}

const API_BASE = '/api'

export const useCraneStore = create<CraneState>((set, get) => ({
  cranes: [],
  sensorData: {},
  stats: { total: 0, online: 0, offline: 0, alarm: 0 },
  selectedCraneId: null,
  loading: false,

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
}))
