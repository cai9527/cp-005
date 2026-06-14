import { create } from 'zustand'

export interface CollisionRule {
  id: string
  name: string
  safe_distance: number
  risk_velocity: number
  warning_distance_ratio: number
  critical_distance_ratio: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CollisionAlert {
  id: string
  crane1_id: string
  crane2_id: string
  level: 'info' | 'warning' | 'critical'
  distance: number
  relative_velocity: number
  approach_angle?: number
  message: string
  timestamp: string
  status: 'active' | 'acknowledged' | 'resolved'
  resolved_by?: string
  resolved_at?: string
  crane1_pos_x?: number
  crane1_pos_y?: number
  crane2_pos_x?: number
  crane2_pos_y?: number
  crane1_name?: string
  crane2_name?: string
}

export interface CollisionRiskPair {
  crane1_id: string
  crane2_id: string
  distance: number
  relative_velocity: number
  risk_level: 'safe' | 'warning' | 'critical'
  approach_angle?: number
  crane1_pos_x: number
  crane1_pos_y: number
  crane2_pos_x: number
  crane2_pos_y: number
  crane1_name?: string
  crane2_name?: string
}

export interface CranePosition {
  craneId: string
  craneName: string
  baseX: number
  baseY: number
  rotation: number
  radius: number
  jibEndX: number
  jibEndY: number
  velocityX?: number
  velocityY?: number
  timestamp: string
}

interface CollisionState {
  riskPairs: CollisionRiskPair[]
  collisionAlerts: CollisionAlert[]
  activeCollisionAlerts: CollisionAlert[]
  collisionRules: CollisionRule[]
  activeRule: CollisionRule | null
  cranePositions: CranePosition[]
  overallRisk: 'safe' | 'warning' | 'critical'
  alertStats: { total: number; active: number; critical: number; warning: number; today: number }
  loading: boolean

  fetchRiskPairs: () => Promise<void>
  fetchOverallRisk: () => Promise<void>
  fetchCranePositions: () => Promise<void>
  fetchCollisionAlerts: (params?: { status?: string; craneId?: string; level?: string; startTime?: string; endTime?: string; limit?: number }) => Promise<void>
  fetchActiveCollisionAlerts: () => Promise<void>
  fetchCollisionAlertStats: () => Promise<void>
  fetchCollisionRules: () => Promise<void>
  fetchActiveRule: () => Promise<void>

  acknowledgeCollisionAlert: (id: string) => Promise<boolean>
  resolveCollisionAlert: (id: string) => Promise<boolean>

  createRule: (data: Partial<CollisionRule>) => Promise<boolean>
  updateRule: (id: string, data: Partial<CollisionRule>) => Promise<boolean>
  deleteRule: (id: string) => Promise<boolean>

  addRealtimeCollisionAlert: (alert: CollisionAlert) => void
  updateCollisionAlertStatus: (id: string, status: string) => void
  updateRiskPairs: (pairs: CollisionRiskPair[]) => void
}

const API_BASE = '/api'

export const useCollisionStore = create<CollisionState>((set, get) => ({
  riskPairs: [],
  collisionAlerts: [],
  activeCollisionAlerts: [],
  collisionRules: [],
  activeRule: null,
  cranePositions: [],
  overallRisk: 'safe',
  alertStats: { total: 0, active: 0, critical: 0, warning: 0, today: 0 },
  loading: false,

  fetchRiskPairs: async () => {
    try {
      const res = await fetch(`${API_BASE}/collision/risk-pairs`)
      const json = await res.json()
      if (json.success) {
        set({ riskPairs: json.data })
      }
    } catch (e) {
      console.error('Failed to fetch risk pairs:', e)
    }
  },

  fetchOverallRisk: async () => {
    try {
      const res = await fetch(`${API_BASE}/collision/overall-risk`)
      const json = await res.json()
      if (json.success) {
        set({ overallRisk: json.data.level })
      }
    } catch (e) {
      console.error('Failed to fetch overall risk:', e)
    }
  },

  fetchCranePositions: async () => {
    try {
      const res = await fetch(`${API_BASE}/collision/positions`)
      const json = await res.json()
      if (json.success) {
        set({ cranePositions: json.data })
      }
    } catch (e) {
      console.error('Failed to fetch crane positions:', e)
    }
  },

  fetchCollisionAlerts: async (params) => {
    set({ loading: true })
    try {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.craneId) query.set('craneId', params.craneId)
      if (params?.level) query.set('level', params.level)
      if (params?.startTime) query.set('startTime', params.startTime)
      if (params?.endTime) query.set('endTime', params.endTime)
      if (params?.limit) query.set('limit', String(params.limit))
      const res = await fetch(`${API_BASE}/collision/alerts?${query.toString()}`)
      const json = await res.json()
      if (json.success) set({ collisionAlerts: json.data })
    } catch (e) {
      console.error('Failed to fetch collision alerts:', e)
    } finally {
      set({ loading: false })
    }
  },

  fetchActiveCollisionAlerts: async () => {
    try {
      const res = await fetch(`${API_BASE}/collision/alerts/active`)
      const json = await res.json()
      if (json.success) set({ activeCollisionAlerts: json.data })
    } catch (e) {
      console.error('Failed to fetch active collision alerts:', e)
    }
  },

  fetchCollisionAlertStats: async () => {
    try {
      const res = await fetch(`${API_BASE}/collision/alerts/stats`)
      const json = await res.json()
      if (json.success) set({ alertStats: json.data })
    } catch (e) {
      console.error('Failed to fetch collision alert stats:', e)
    }
  },

  fetchCollisionRules: async () => {
    try {
      const res = await fetch(`${API_BASE}/collision/rules`)
      const json = await res.json()
      if (json.success) set({ collisionRules: json.data })
    } catch (e) {
      console.error('Failed to fetch collision rules:', e)
    }
  },

  fetchActiveRule: async () => {
    try {
      const res = await fetch(`${API_BASE}/collision/rules/active`)
      const json = await res.json()
      if (json.success) set({ activeRule: json.data })
    } catch (e) {
      console.error('Failed to fetch active collision rule:', e)
    }
  },

  acknowledgeCollisionAlert: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/collision/alerts/${id}/acknowledge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'admin' })
      })
      const json = await res.json()
      if (json.success) {
        set((state) => ({
          activeCollisionAlerts: state.activeCollisionAlerts.map((a) =>
            a.id === id ? { ...a, status: 'acknowledged' as const } : a
          ),
          collisionAlerts: state.collisionAlerts.map((a) =>
            a.id === id ? { ...a, status: 'acknowledged' as const } : a
          ),
        }))
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to acknowledge collision alert:', e)
      return false
    }
  },

  resolveCollisionAlert: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/collision/alerts/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'admin' })
      })
      const json = await res.json()
      if (json.success) {
        set((state) => ({
          activeCollisionAlerts: state.activeCollisionAlerts.filter((a) => a.id !== id),
          collisionAlerts: state.collisionAlerts.map((a) =>
            a.id === id ? { ...a, status: 'resolved' as const, resolved_by: 'admin', resolved_at: new Date().toISOString() } : a
          ),
        }))
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to resolve collision alert:', e)
      return false
    }
  },

  createRule: async (data) => {
    try {
      const res = await fetch(`${API_BASE}/collision/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      if (json.success) {
        get().fetchCollisionRules()
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to create collision rule:', e)
      return false
    }
  },

  updateRule: async (id, data) => {
    try {
      const res = await fetch(`${API_BASE}/collision/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      if (json.success) {
        get().fetchCollisionRules()
        get().fetchActiveRule()
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to update collision rule:', e)
      return false
    }
  },

  deleteRule: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/collision/rules/${id}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.success) {
        set((state) => ({ collisionRules: state.collisionRules.filter((r) => r.id !== id) }))
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to delete collision rule:', e)
      return false
    }
  },

  addRealtimeCollisionAlert: (alert) => {
    set((state) => ({
      activeCollisionAlerts: [alert, ...state.activeCollisionAlerts],
      collisionAlerts: [alert, ...state.collisionAlerts],
    }))
  },

  updateCollisionAlertStatus: (id, status) => {
    set((state) => ({
      activeCollisionAlerts: status === 'resolved' || status === 'acknowledged'
        ? state.activeCollisionAlerts.filter((a) => a.id !== id)
        : state.activeCollisionAlerts.map((a) => a.id === id ? { ...a, status: status as CollisionAlert['status'] } : a),
      collisionAlerts: state.collisionAlerts.map((a) => a.id === id ? { ...a, status: status as CollisionAlert['status'] } : a),
    }))
  },

  updateRiskPairs: (pairs) => {
    set({ riskPairs: pairs })
  },
}))
