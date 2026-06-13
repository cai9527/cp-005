import { Router, type Request, type Response } from 'express'
import { alertService } from '../services/alertService.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { craneId } = req.query
    const rules = alertService.getAllRules(craneId as string | undefined)
    res.json({ success: true, data: rules })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch alert rules' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, craneId, sensorType, condition, threshold, level, enabled } = req.body

    if (!name || !sensorType || !condition || threshold === undefined || !level) {
      res.status(400).json({ success: false, error: 'Missing required fields' })
      return
    }

    const rule = alertService.createRule({
      name: name as string,
      crane_id: (craneId as string) || 'all',
      sensor_type: sensorType as string,
      condition: condition as any,
      threshold: Number(threshold),
      level: level as any,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    })

    res.json({ success: true, data: rule })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create alert rule' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { name, craneId, sensorType, condition, threshold, level, enabled } = req.body

    const update: any = {}
    if (name !== undefined) update.name = name
    if (craneId !== undefined) update.crane_id = craneId
    if (sensorType !== undefined) update.sensor_type = sensorType
    if (condition !== undefined) update.condition = condition
    if (threshold !== undefined) update.threshold = Number(threshold)
    if (level !== undefined) update.level = level
    if (enabled !== undefined) update.enabled = Boolean(enabled)

    const result = alertService.updateRule(req.params.id, update)
    if (!result) {
      res.status(404).json({ success: false, error: 'Alert rule not found' })
      return
    }
    res.json({ success: true, message: 'Alert rule updated' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update alert rule' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const result = alertService.deleteRule(req.params.id)
    if (!result) {
      res.status(404).json({ success: false, error: 'Alert rule not found' })
      return
    }
    res.json({ success: true, message: 'Alert rule deleted' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete alert rule' })
  }
})

export default router
