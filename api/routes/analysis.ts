import { Router, type Request, type Response } from 'express'
import { analysisService } from '../services/analysisService.js'

const router = Router()

router.get('/summary', (req: Request, res: Response): void => {
  try {
    const summary = analysisService.getAllCranesSummary()
    res.json({ success: true, data: summary })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch summary' })
  }
})

router.get('/stats/:craneId', (req: Request, res: Response): void => {
  try {
    const stats = analysisService.getRunStats(req.params.craneId)
    if (!stats) {
      res.status(404).json({ success: false, error: 'Crane not found' })
      return
    }
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' })
  }
})

router.get('/daily/:craneId', (req: Request, res: Response): void => {
  try {
    const { days } = req.query
    const stats = analysisService.getDailyStats(req.params.craneId, days ? Number(days) : 7)
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch daily stats' })
  }
})

router.get('/trend/:craneId', (req: Request, res: Response): void => {
  try {
    const { sensorType, hours } = req.query
    if (!sensorType) {
      res.status(400).json({ success: false, error: 'sensorType is required' })
      return
    }
    const trend = analysisService.getTrendAnalysis(
      req.params.craneId,
      sensorType as string,
      hours ? Number(hours) : 24,
    )
    res.json({ success: true, data: trend })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trend' })
  }
})

router.get('/safety-score/:craneId', (req: Request, res: Response): void => {
  try {
    const score = analysisService.getSafetyScore(req.params.craneId)
    res.json({ success: true, data: { craneId: req.params.craneId, safetyScore: score } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch safety score' })
  }
})

export default router
