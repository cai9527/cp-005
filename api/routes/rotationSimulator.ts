import { Router, type Request, type Response } from 'express'
import { rotationSimulatorService, type RotationConfig } from '../services/rotationSimulatorService.js'

const router = Router()

router.post('/start', (req: Request, res: Response): void => {
  try {
    const { craneId, angularVelocity, direction, centerX, centerY, radius } = req.body as {
      craneId: string
      angularVelocity?: number
      direction?: 'cw' | 'ccw'
      centerX?: number
      centerY?: number
      radius?: number
    }

    if (!craneId) {
      res.status(400).json({ success: false, error: 'craneId is required' })
      return
    }

    const config: RotationConfig = {
      craneId,
      angularVelocity: angularVelocity ?? 0.6,
      direction: direction ?? 'cw',
      centerX: centerX ?? 50,
      centerY: centerY ?? 50,
      radius: radius ?? 30,
    }

    if (config.angularVelocity < 0.01 || config.angularVelocity > 5) {
      res.status(400).json({ success: false, error: 'angularVelocity must be between 0.01 and 5 r/min' })
      return
    }

    if (!['cw', 'ccw'].includes(config.direction)) {
      res.status(400).json({ success: false, error: 'direction must be cw or ccw' })
      return
    }

    const simulation = rotationSimulatorService.configureAndStart(config)
    res.json({ success: true, data: simulation })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start rotation simulation' })
  }
})

router.post('/stop/:craneId', (req: Request, res: Response): void => {
  try {
    const result = rotationSimulatorService.stop(req.params.craneId)
    if (!result) {
      res.status(404).json({ success: false, error: 'No active simulation for this crane' })
      return
    }
    res.json({ success: true, message: 'Simulation stopped' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to stop simulation' })
  }
})

router.post('/pause/:craneId', (req: Request, res: Response): void => {
  try {
    const result = rotationSimulatorService.pause(req.params.craneId)
    if (!result) {
      res.status(404).json({ success: false, error: 'No active simulation for this crane' })
      return
    }
    res.json({ success: true, message: 'Simulation paused' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to pause simulation' })
  }
})

router.post('/resume/:craneId', (req: Request, res: Response): void => {
  try {
    const result = rotationSimulatorService.resume(req.params.craneId)
    if (!result) {
      res.status(404).json({ success: false, error: 'No paused simulation for this crane' })
      return
    }
    res.json({ success: true, message: 'Simulation resumed' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to resume simulation' })
  }
})

router.get('/status/:craneId', (req: Request, res: Response): void => {
  try {
    const sim = rotationSimulatorService.getSimulationByCrane(req.params.craneId)
    const isRunning = rotationSimulatorService.isRunning(req.params.craneId)
    res.json({ success: true, data: { simulation: sim, isRunning } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get simulation status' })
  }
})

router.get('/active', (req: Request, res: Response): void => {
  try {
    const active = rotationSimulatorService.getActiveSimulations()
    res.json({ success: true, data: active })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get active simulations' })
  }
})

router.get('/trajectory/:simulationId', (req: Request, res: Response): void => {
  try {
    const { limit, fromMs, toMs } = req.query as { limit?: string; fromMs?: string; toMs?: string }

    let trajectory
    if (fromMs && toMs) {
      trajectory = rotationSimulatorService.getTrajectoryRange(
        req.params.simulationId,
        parseInt(fromMs, 10),
        parseInt(toMs, 10)
      )
    } else {
      trajectory = rotationSimulatorService.getTrajectory(
        req.params.simulationId,
        limit ? parseInt(limit, 10) : 500
      )
    }

    res.json({ success: true, data: trajectory })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get trajectory data' })
  }
})

router.get('/history/:craneId', (req: Request, res: Response): void => {
  try {
    const { limit } = req.query as { limit?: string }
    const history = rotationSimulatorService.getSimulationHistory(
      req.params.craneId,
      limit ? parseInt(limit, 10) : 20
    )
    res.json({ success: true, data: history })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get simulation history' })
  }
})

router.post('/cleanup', (req: Request, res: Response): void => {
  try {
    const { olderThanHours } = req.body as { olderThanHours?: number }
    const deleted = rotationSimulatorService.cleanupOldTrajectories(olderThanHours || 24)
    res.json({ success: true, data: { deletedTrajectories: deleted } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to cleanup trajectories' })
  }
})

export default router
