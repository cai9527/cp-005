import { Router, type Request, type Response } from 'express'
import { craneService, CraneValidationError } from '../services/craneService.js'
import type { CraneCreateInput } from '../repositories/craneRepository.js'
import { authMiddleware, requireRole, type AuthenticatedRequest, getClientIp } from '../middleware/auth.js'
import { operationLogRepository } from '../repositories/operationLogRepository.js'

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

router.post('/', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const input = req.body as Partial<CraneCreateInput>
    const crane = craneService.createCrane(input)

    operationLogRepository.logCraneCreate(
      req.user.userId,
      req.user.username,
      crane.id,
      crane as unknown as Record<string, unknown>,
      getClientIp(req),
      req.headers['user-agent'] || null,
      true
    )

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

    if (req.user) {
      operationLogRepository.logCraneCreate(
        req.user.userId,
        req.user.username,
        '',
        req.body as Record<string, unknown>,
        getClientIp(req),
        req.headers['user-agent'] || null,
        false,
        error instanceof Error ? error.message : '未知错误'
      )
    }

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

router.put('/:id/validate', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const input = req.body as Partial<CraneCreateInput>
    const errors = craneService.validateUpdateInput(req.params.id, input)
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

router.put('/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }

    const id = req.params.id
    const input = req.body as Partial<CraneCreateInput>

    const result = craneService.updateCrane(id, input, {
      userId: req.user.userId,
      username: req.user.username,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    })

    res.json({
      success: true,
      message: result.changedFields.length > 0 ? '设备信息更新成功' : '未检测到变化',
      data: result.crane,
      changedFields: result.changedFields,
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

    const errMsg = error instanceof Error ? error.message : '更新失败'
    if (errMsg === '设备不存在') {
      res.status(404).json({
        success: false,
        error: errMsg,
      })
      return
    }

    console.error('Update crane error:', error)

    if (req.user) {
      operationLogRepository.logCraneUpdate(
        req.user.userId,
        req.user.username,
        req.params.id,
        {},
        req.body as Record<string, unknown>,
        [],
        getClientIp(req),
        req.headers['user-agent'] || null,
        false,
        errMsg
      )
    }

    res.status(500).json({
      success: false,
      error: errMsg || '更新失败，请稍后重试',
    })
  }
})

export default router
