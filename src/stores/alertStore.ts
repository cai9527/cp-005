import { create } from 'zustand'

export interface Alert {
  id: string
  crane_id: string
  crane_name?: string
  rule_id?: string
  sensor_type: string
  level: 'info' | 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: string
  status: 'active' | 'acknowledged' | 'resolved'
  resolved_by?: string
  resolved_at?: string
}

export interface AlertRule {
  id: string
  name: string
  crane_id: string
  sensor_type: string
  condition: 'gt' | 'lt' | 'gte' | 'lte'
  threshold: number
  level: 'info' | 'warning' | 'critical'
  enabled: boolean
}

interface AlertState {
  alerts: Alert[]
  activeAlerts: Alert[]
  alertRules: AlertRule[]
  alertStats: { total: number; active: number; critical: number; warning: number; today: number }
  loading: boolean

  fetchAlerts: (params?: { status?: string; craneId?: string; level?: string; startTime?: string; endTime?: string; limit?: number }) => Promise<void>
  fetchActiveAlerts: () => Promise<void>
  fetchAlertStats: () => Promise<void>
  fetchAlertRules: (craneId?: string) => Promise<void>
  acknowledgeAlert: (id: string) => Promise<void>
  resolveAlert: (id: string) => Promise<void>
  createRule: (data: Partial<AlertRule>) => Promise<void>
  updateRule: (id: string, data: Partial<AlertRule>) => Promise<void>
  deleteRule: (id: string) => Promise<void>
  addRealtimeAlert: (alert: Alert) => void
  updateAlertStatus: (id: string, status: string) => void
}

const API_BASE = '/api'

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  activeAlerts: [],
  alertRules: [],
  alertStats: { total: 0, active: 0, critical: 0, warning: 0, today: 0 },
  loading: false,

  fetchAlerts: async (params) => {
    set({ loading: true })
    try {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.craneId) query.set('craneId', params.craneId)
      if (params?.level) query.set('level', params.level)
      if (params?.startTime) query.set('startTime', params.startTime)
      if (params?.endTime) query.set('endTime', params.endTime)
      if (params?.limit) query.set('limit', String(params.limit))
      const res = await fetch(`${API_BASE}/alerts?${query.toString()}`)
      const json = await res.json()
      if (json.success) set({ alerts: json.data })
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    } finally {
      set({ loading: false })
    }
  },

  fetchActiveAlerts: async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts/active`)
      const json = await res.json()
      if (json.success) set({ activeAlerts: json.data })
    } catch (e) {
      console.error('Failed to fetch active alerts:', e)
    }
  },

  fetchAlertStats: async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts/stats`)
      const json = await res.json()
      if (json.success) set({ alertStats: json.data })
    } catch (e) {
      console.error('Failed to fetch alert stats:', e)
    }
  },

  fetchAlertRules: async (craneId) => {
    try {
      const query = craneId ? `?craneId=${craneId}` : ''
      const res = await fetch(`${API_BASE}/alert-rules${query}`)
      const json = await res.json()
      if (json.success) set({ alertRules: json.data })
    } catch (e) {
      console.error('Failed to fetch alert rules:', e)
    }
  },

  acknowledgeAlert: async (id) => {
    try {
      await fetch(`${API_BASE}/alerts/${id}/acknowledge`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolvedBy: 'admin' }) })
      set((state) => ({
        activeAlerts: state.activeAlerts.map((a) => a.id === id ? { ...a, status: 'acknowledged' as const } : a),
        alerts: state.alerts.map((a) => a.id === id ? { ...a, status: 'acknowledged' as const } : a),
      }))
    } catch (e) {
      console.error('Failed to acknowledge alert:', e)
    }
  },

  resolveAlert: async (id) => {
    try {
      await fetch(`${API_BASE}/alerts/${id}/resolve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolvedBy: 'admin' }) })
      set((state) => ({
        activeAlerts: state.activeAlerts.filter((a) => a.id !== id),
        alerts: state.alerts.map((a) => a.id === id ? { ...a, status: 'resolved' as const, resolved_by: 'admin', resolved_at: new Date().toISOString() } : a),
      }))
    } catch (e) {
      console.error('Failed to resolve alert:', e)
    }
  },

  createRule: async (data) => {
    try {
      await fetch(`${API_BASE}/alert-rules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      get().fetchAlertRules()
    } catch (e) {
      console.error('Failed to create alert rule:', e)
    }
  },

  updateRule: async (id, data) => {
    try {
      await fetch(`${API_BASE}/alert-rules/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      get().fetchAlertRules()
    } catch (e) {
      console.error('Failed to update alert rule:', e)
    }
  },

  deleteRule: async (id) => {
    try {
      await fetch(`${API_BASE}/alert-rules/${id}`, { method: 'DELETE' })
      set((state) => ({ alertRules: state.alertRules.filter((r) => r.id !== id) }))
    } catch (e) {
      console.error('Failed to delete alert rule:', e)
    }
  },

  addRealtimeAlert: (alert) => {
    set((state) => ({
      activeAlerts: [alert, ...state.activeAlerts],
      alerts: [alert, ...state.alerts],
    }))
  },

  updateAlertStatus: (id, status) => {
    set((state) => ({
      activeAlerts: status === 'resolved' || status === 'acknowledged'
        ? state.activeAlerts.filter((a) => a.id !== id)
        : state.activeAlerts.map((a) => a.id === id ? { ...a, status: status as Alert['status'] } : a),
      alerts: state.alerts.map((a) => a.id === id ? { ...a, status: status as Alert['status'] } : a),
    }))
  },
}))
