import { Router, type Request, type Response } from 'express'
import { craneService, CraneValidationError } from '../services/craneService.js'
import type { CraneCreateInput } from '../repositories/craneRepository.js'

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

router.post('/', (req: Request, res: Response): void => {
  try {
    const input = req.body as Partial<CraneCreateInput>
    const crane = craneService.createCrane(input)
    res.status(201).json({
      success: true,
      message: '塔机设备创建成功',
      data: crane,
    })
  } catch (error) {
    if (error instanceof CraneValidationError) {
      res.status(400).json({
        success: false,
        error: '数据校验失败',
        details: error.errors,
      })
      return
    }
    console.error('Create crane error:', error)
    res.status(500).json({
      success: false,
      error: '创建设备失败，请稍后重试',
    })
  }
})

router.post('/validate', (req: Request, res: Response): void => {
  try {
    const input = req.body as Partial<CraneCreateInput>
    const errors = craneService.validateCreateInput(input)
    res.json({
      success: errors.length === 0,
      data: { valid: errors.length === 0, errors },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '校验失败',
    })
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
