import { Router, type Request, type Response } from 'express'
import { sensorSimulatorService } from '../services/sensorSimulatorService.js'

const router = Router()

router.get('/status', (req: Request, res: Response): void => {
  try {
    const status = sensorSimulatorService.getSimStatus()
    res.json({ success: true, data: status })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get simulator status' })
  }
})

router.post('/start', (req: Request, res: Response): void => {
  try {
    sensorSimulatorService.start()
    res.json({ success: true, message: 'Simulator started' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start simulator' })
  }
})

router.post('/stop', (req: Request, res: Response): void => {
  try {
    sensorSimulatorService.stop()
    res.json({ success: true, message: 'Simulator stopped' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to stop simulator' })
  }
})

router.post('/trigger-anomaly/:craneId', (req: Request, res: Response): void => {
  try {
    const result = sensorSimulatorService.triggerManualAnomaly(req.params.craneId)
    if (!result) {
      res.status(404).json({ success: false, error: 'Crane not found in simulator' })
      return
    }
    res.json({ success: true, message: 'Anomaly triggered' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to trigger anomaly' })
  }
})

export default router
