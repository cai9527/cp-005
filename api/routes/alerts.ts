import { Router, type Request, type Response } from 'express'
import { alertService } from '../services/alertService.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status, craneId, level, startTime, endTime, limit } = req.query

    const alerts = alertService.getAllAlerts({
      status: status as string | undefined,
      craneId: craneId as string | undefined,
      level: level as string | undefined,
      startTime: startTime as string | undefined,
      endTime: endTime as string | undefined,
      limit: limit ? Number(limit) : undefined,
    })

    res.json({ success: true, data: alerts })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' })
  }
})

router.get('/active', (req: Request, res: Response): void => {
  try {
    const alerts = alertService.getActiveAlerts()
    res.json({ success: true, data: alerts })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch active alerts' })
  }
})

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const stats = alertService.getAlertStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch alert stats' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const alert = alertService.getAlertById(req.params.id)
    if (!alert) {
      res.status(404).json({ success: false, error: 'Alert not found' })
      return
    }
    res.json({ success: true, data: alert })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch alert' })
  }
})

router.put('/:id/acknowledge', (req: Request, res: Response): void => {
  try {
    const { resolvedBy } = req.body
    const result = alertService.acknowledgeAlert(req.params.id, resolvedBy as string | undefined)
    if (!result) {
      res.status(404).json({ success: false, error: 'Alert not found' })
      return
    }
    res.json({ success: true, message: 'Alert acknowledged' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' })
  }
})

router.put('/:id/resolve', (req: Request, res: Response): void => {
  try {
    const { resolvedBy } = req.body
    const result = alertService.resolveAlert(req.params.id, (resolvedBy as string) || 'admin')
    if (!result) {
      res.status(404).json({ success: false, error: 'Alert not found' })
      return
    }
    res.json({ success: true, message: 'Alert resolved' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to resolve alert' })
  }
})

export default router
