import { useEffect, useRef, useCallback } from 'react'
import { useCraneStore } from '@/stores/craneStore'
import { useAlertStore } from '@/stores/alertStore'
import { useDeviceStatusStore } from '@/stores/deviceStatusStore'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const updateSensorData = useCraneStore((s) => s.updateSensorData)
  const updateCraneStatus = useCraneStore((s) => s.updateCraneStatus)
  const addRealtimeAlert = useAlertStore((s) => s.addRealtimeAlert)
  const updateAlertStatus = useAlertStore((s) => s.updateAlertStatus)
  const updateHeartbeatRealtime = useDeviceStatusStore((s) => s.updateHeartbeatRealtime)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'sensor_update':
            updateSensorData(
              msg.payload.craneId,
              msg.payload.sensorType,
              msg.payload.value,
              msg.payload.timestamp
            )
            break
          case 'alert':
            addRealtimeAlert(msg.payload)
            break
          case 'status_change':
            updateCraneStatus(msg.payload.craneId, msg.payload.status)
            break
          case 'alert_status':
            updateAlertStatus(msg.payload.id, msg.payload.status)
            break
          case 'device_offline':
            updateHeartbeatRealtime(msg.payload.craneId, {
              status: 'offline',
              updated_at: new Date().toISOString(),
            })
            break
        }
      } catch (e) {
        console.error('[WS] Message parse error:', e)
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 3s...')
      reconnectTimerRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [updateSensorData, updateCraneStatus, addRealtimeAlert, updateAlertStatus, updateHeartbeatRealtime])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])
}
