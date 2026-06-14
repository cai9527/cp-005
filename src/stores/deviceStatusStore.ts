import { create } from 'zustand'

export interface DeviceHeartbeat {
  id: string
  crane_id: string
  last_heartbeat_at: string
  heartbeat_interval_ms: number
  status: 'online' | 'offline' | 'alarm'
  reconnect_count: number
  latency_ms: number
  created_at: string
  updated_at: string
}

export interface DeviceStatusLog {
  id: string
  crane_id: string
  old_status: string
  new_status: string
  reason: string
  timestamp: string
}

export interface HeartbeatProgress {
  elapsed: number
  threshold: number
  percentage: number
  isOverdue: boolean
}

export interface MonitoringStats {
  total: number
  online: number
  offline: number
  alarm: number
  avgLatency: number
  avgReconnects: number
}

interface DeviceStatusState {
  heartbeats: DeviceHeartbeat[]
  statusLogs: DeviceStatusLog[]
  stats: MonitoringStats
  progressMap: Record<string, HeartbeatProgress>
  loading: boolean
  selectedCraneId: string | null

  fetchHeartbeats: () => Promise<void>
  fetchStatusLogs: (craneId?: string, limit?: number) => Promise<void>
  fetchStats: () => Promise<void>
  fetchHeartbeatProgress: (craneId: string) => Promise<void>
  fetchAllProgress: () => Promise<void>
  attemptReconnect: (craneId: string) => Promise<{ success: boolean; attempts: number; message: string }>
  simulateOffline: (craneId: string) => Promise<void>
  sendHeartbeat: (craneId: string, latencyMs?: number) => Promise<void>
  selectCrane: (id: string | null) => void
  updateHeartbeatRealtime: (craneId: string, data: Partial<DeviceHeartbeat>) => void
}

const API_BASE = '/api/device-status'

export const useDeviceStatusStore = create<DeviceStatusState>((set, get) => ({
  heartbeats: [],
  statusLogs: [],
  stats: { total: 0, online: 0, offline: 0, alarm: 0, avgLatency: 0, avgReconnects: 0 },
  progressMap: {},
  loading: false,
  selectedCraneId: null,

  fetchHeartbeats: async () => {
    set({ loading: true })
    try {
      const res = await fetch(`${API_BASE}/heartbeats`)
      const json = await res.json()
      if (json.success) {
        set({ heartbeats: json.data })
      }
    } catch (e) {
      console.error('Failed to fetch heartbeats:', e)
    } finally {
      set({ loading: false })
    }
  },

  fetchStatusLogs: async (craneId?: string, limit?: number) => {
    try {
      const params = new URLSearchParams()
      if (craneId) params.set('craneId', craneId)
      if (limit) params.set('limit', String(limit))
      const res = await fetch(`${API_BASE}/status-logs?${params}`)
      const json = await res.json()
      if (json.success) {
        set({ statusLogs: json.data })
      }
    } catch (e) {
      console.error('Failed to fetch status logs:', e)
    }
  },

  fetchStats: async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`)
      const json = await res.json()
      if (json.success) {
        set({ stats: json.data })
      }
    } catch (e) {
      console.error('Failed to fetch monitoring stats:', e)
    }
  },

  fetchHeartbeatProgress: async (craneId: string) => {
    try {
      const res = await fetch(`${API_BASE}/heartbeat-progress/${craneId}`)
      const json = await res.json()
      if (json.success) {
        set((state) => ({
          progressMap: { ...state.progressMap, [craneId]: json.data },
        }))
      }
    } catch (e) {
      console.error('Failed to fetch heartbeat progress:', e)
    }
  },

  fetchAllProgress: async () => {
    const { heartbeats } = get()
    const newMap: Record<string, HeartbeatProgress> = {}
    await Promise.all(
      heartbeats.map(async (hb) => {
        try {
          const res = await fetch(`${API_BASE}/heartbeat-progress/${hb.crane_id}`)
          const json = await res.json()
          if (json.success) {
            newMap[hb.crane_id] = json.data
          }
        } catch {}
      })
    )
    set({ progressMap: newMap })
  },

  attemptReconnect: async (craneId: string) => {
    try {
      const res = await fetch(`${API_BASE}/reconnect/${craneId}`, { method: 'POST' })
      const json = await res.json()
      await get().fetchHeartbeats()
      await get().fetchStats()
      return json.data || json
    } catch (e) {
      console.error('Failed to attempt reconnect:', e)
      return { success: false, attempts: 0, message: '网络错误' }
    }
  },

  simulateOffline: async (craneId: string) => {
    try {
      await fetch(`${API_BASE}/simulate-offline/${craneId}`, { method: 'POST' })
      await get().fetchHeartbeats()
      await get().fetchStats()
    } catch (e) {
      console.error('Failed to simulate offline:', e)
    }
  },

  sendHeartbeat: async (craneId: string, latencyMs?: number) => {
    try {
      await fetch(`${API_BASE}/heartbeat/${craneId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latencyMs }),
      })
      await get().fetchHeartbeats()
    } catch (e) {
      console.error('Failed to send heartbeat:', e)
    }
  },

  selectCrane: (id) => set({ selectedCraneId: id }),

  updateHeartbeatRealtime: (craneId, data) => {
    set((state) => ({
      heartbeats: state.heartbeats.map((hb) =>
        hb.crane_id === craneId ? { ...hb, ...data } : hb
      ),
    }))
  },
}))
