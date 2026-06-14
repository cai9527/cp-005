import { Router, type Request, type Response } from 'express'
import { deviceStatusService } from '../services/deviceStatusService.js'

const router = Router()

router.get('/heartbeats', (req: Request, res: Response): void => {
  try {
    const heartbeats = deviceStatusService.getAllHeartbeats()
    res.json({ success: true, data: heartbeats })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get heartbeats' })
  }
})

router.get('/heartbeat/:craneId', (req: Request, res: Response): void => {
  try {
    const hb = deviceStatusService.getHeartbeat(req.params.craneId)
    if (!hb) {
      res.status(404).json({ success: false, error: 'Device not registered' })
      return
    }
    res.json({ success: true, data: hb })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get heartbeat' })
  }
})

router.get('/heartbeat-progress/:craneId', (req: Request, res: Response): void => {
  try {
    const progress = deviceStatusService.getHeartbeatProgress(req.params.craneId)
    res.json({ success: true, data: progress })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get heartbeat progress' })
  }
})

router.post('/heartbeat/:craneId', (req: Request, res: Response): void => {
  try {
    const { latencyMs } = req.body as { latencyMs?: number }
    const hb = deviceStatusService.receiveHeartbeat(req.params.craneId, latencyMs || 0)
    res.json({ success: true, data: hb })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process heartbeat' })
  }
})

router.post('/register/:craneId', (req: Request, res: Response): void => {
  try {
    const { intervalMs } = req.body as { intervalMs?: number }
    const hb = deviceStatusService.registerDevice(req.params.craneId, intervalMs || 25000)
    res.json({ success: true, data: hb })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to register device' })
  }
})

router.post('/reconnect/:craneId', (req: Request, res: Response): void => {
  try {
    const result = deviceStatusService.attemptReconnect(req.params.craneId)
    if (result.success) {
      res.json({ success: true, data: result })
    } else {
      res.status(400).json({ success: false, data: result, error: result.message })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to attempt reconnect' })
  }
})

router.post('/simulate-offline/:craneId', (req: Request, res: Response): void => {
  try {
    deviceStatusService.simulateOffline(req.params.craneId)
    res.json({ success: true, message: 'Simulated offline - heartbeat stopped' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to simulate offline' })
  }
})

router.get('/status-logs', (req: Request, res: Response): void => {
  try {
    const { craneId, limit } = req.query as { craneId?: string; limit?: string }
    const limitNum = limit ? parseInt(limit, 10) : 100
    const logs = craneId
      ? deviceStatusService.getStatusLogs(craneId, limitNum)
      : deviceStatusService.getAllStatusLogs(limitNum)
    res.json({ success: true, data: logs })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get status logs' })
  }
})

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const stats = deviceStatusService.getMonitoringStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get monitoring stats' })
  }
})

export default router
