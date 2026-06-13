import { Router, type Request, type Response } from 'express'
import { craneService } from '../services/craneService.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const cranes = craneService.getAllCranes()
    res.json({ success: true, data: cranes })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch cranes' })
  }
})

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const stats = craneService.getCraneStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch crane stats' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const crane = craneService.getCraneDetail(req.params.id)
    if (!crane) {
      res.status(404).json({ success: false, error: 'Crane not found' })
      return
    }
    res.json({ success: true, data: crane })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch crane' })
  }
})

router.get('/:id/status', (req: Request, res: Response): void => {
  try {
    const crane = craneService.getCraneById(req.params.id)
    if (!crane) {
      res.status(404).json({ success: false, error: 'Crane not found' })
      return
    }
    res.json({
      success: true,
      data: {
        craneId: crane.id,
        status: crane.status,
        name: crane.name,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch crane status' })
  }
})

export default router
