import { Router, type Request, type Response } from 'express'
import { collisionService } from '../services/collisionService.js'

const router = Router()

router.get('/risk-pairs', (req: Request, res: Response): void => {
  try {
    const riskPairs = collisionService.getRiskPairs()
    res.json({ success: true, data: riskPairs })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch risk pairs' })
  }
})

router.get('/overall-risk', (req: Request, res: Response): void => {
  try {
    const overallRisk = collisionService.getOverallRiskLevel()
    res.json({ success: true, data: { level: overallRisk } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch overall risk' })
  }
})

router.get('/positions', (req: Request, res: Response): void => {
  try {
    const positions = collisionService.getAllCranePositions()
    res.json({ success: true, data: positions })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch crane positions' })
  }
})

router.get('/positions/:craneId', (req: Request, res: Response): void => {
  try {
    const position = collisionService.getCranePosition(req.params.craneId)
    if (!position) {
      res.status(404).json({ success: false, error: 'Crane not found' })
      return
    }
    res.json({ success: true, data: position })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch crane position' })
  }
})

router.get('/alerts', (req: Request, res: Response): void => {
  try {
    const { status, craneId, level, startTime, endTime, limit } = req.query

    const alerts = collisionService.getAllCollisionAlerts({
      status: status as string | undefined,
      craneId: craneId as string | undefined,
      level: level as string | undefined,
      startTime: startTime as string | undefined,
      endTime: endTime as string | undefined,
      limit: limit ? Number(limit) : undefined,
    })

    res.json({ success: true, data: alerts })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch collision alerts' })
  }
})

router.get('/alerts/active', (req: Request, res: Response): void => {
  try {
    const alerts = collisionService.getActiveCollisionAlerts()
    res.json({ success: true, data: alerts })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch active collision alerts' })
  }
})

router.get('/alerts/stats', (req: Request, res: Response): void => {
  try {
    const stats = collisionService.getCollisionAlertStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch collision alert stats' })
  }
})

router.get('/alerts/:id', (req: Request, res: Response): void => {
  try {
    const alert = collisionService.getCollisionAlertById(req.params.id)
    if (!alert) {
      res.status(404).json({ success: false, error: 'Alert not found' })
      return
    }
    res.json({ success: true, data: alert })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch collision alert' })
  }
})

router.put('/alerts/:id/acknowledge', (req: Request, res: Response): void => {
  try {
    const { resolvedBy } = req.body
    const result = collisionService.acknowledgeCollisionAlert(req.params.id, resolvedBy as string | undefined)
    if (!result) {
      res.status(404).json({ success: false, error: 'Alert not found' })
      return
    }
    res.json({ success: true, message: 'Alert acknowledged' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' })
  }
})

router.put('/alerts/:id/resolve', (req: Request, res: Response): void => {
  try {
    const { resolvedBy } = req.body
    const result = collisionService.resolveCollisionAlert(req.params.id, (resolvedBy as string) || 'admin')
    if (!result) {
      res.status(404).json({ success: false, error: 'Alert not found' })
      return
    }
    res.json({ success: true, message: 'Alert resolved' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to resolve alert' })
  }
})

router.get('/rules', (req: Request, res: Response): void => {
  try {
    const rules = collisionService.getAllRules()
    res.json({ success: true, data: rules })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch collision rules' })
  }
})

router.get('/rules/active', (req: Request, res: Response): void => {
  try {
    const rule = collisionService.getActiveRule()
    res.json({ success: true, data: rule || null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch active collision rule' })
  }
})

router.post('/rules', (req: Request, res: Response): void => {
  try {
    const { name, safe_distance, risk_velocity, warning_distance_ratio, critical_distance_ratio, enabled } = req.body

    if (!name) {
      res.status(400).json({ success: false, error: 'Rule name is required' })
      return
    }

    const rule = collisionService.createRule({
      name,
      safe_distance: Number(safe_distance) ?? 5,
      risk_velocity: Number(risk_velocity) ?? 1,
      warning_distance_ratio: Number(warning_distance_ratio) ?? 1.5,
      critical_distance_ratio: Number(critical_distance_ratio) ?? 1.2,
      enabled: enabled !== false,
    })

    res.json({ success: true, data: rule })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create collision rule' })
  }
})

router.put('/rules/:id', (req: Request, res: Response): void => {
  try {
    const result = collisionService.updateRule(req.params.id, req.body)
    if (!result) {
      res.status(404).json({ success: false, error: 'Rule not found' })
      return
    }

    const updatedRule = collisionService.getRuleById(req.params.id)
    res.json({ success: true, data: updatedRule })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update collision rule' })
  }
})

router.delete('/rules/:id', (req: Request, res: Response): void => {
  try {
    const result = collisionService.deleteRule(req.params.id)
    if (!result) {
      res.status(404).json({ success: false, error: 'Rule not found' })
      return
    }
    res.json({ success: true, message: 'Rule deleted' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete collision rule' })
  }
})

router.post('/detect', (req: Request, res: Response): void => {
  try {
    const result = collisionService.detectCollisions()
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to run collision detection' })
  }
})

export default router
