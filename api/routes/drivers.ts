import { Router, type Request, type Response } from 'express'
import { driverService, DriverValidationError } from '../services/driverService.js'
import { authMiddleware, requireRole, type AuthenticatedRequest, getClientIp } from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const drivers = driverService.getAllDrivers()
    res.json({ success: true, data: drivers })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const driver = driverService.getDriverById(req.params.id)
    if (!driver) {
      res.status(404).json({ success: false, error: 'Driver not found' })
      return
    }
    res.json({ success: true, data: driver })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch driver' })
  }
})

router.post('/', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const driver = driverService.createDriver(req.body)
    res.status(201).json({ success: true, data: driver })
  } catch (error) {
    if (error instanceof DriverValidationError) {
      res.status(400).json({ success: false, error: '数据校验失败', details: error.errors })
      return
    }
    res.status(500).json({ success: false, error: 'Failed to create driver' })
  }
})

router.put('/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const driver = driverService.updateDriver(req.params.id, req.body)
    res.json({ success: true, data: driver })
  } catch (error) {
    if (error instanceof DriverValidationError) {
      res.status(400).json({ success: false, error: '数据校验失败', details: error.errors })
      return
    }
    res.status(500).json({ success: false, error: 'Failed to update driver' })
  }
})

router.delete('/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    driverService.deleteDriver(req.params.id)
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete driver' })
  }
})

router.get('/:driverId/certifications', (req: Request, res: Response): void => {
  try {
    const certifications = driverService.getCertificationsByDriverId(req.params.driverId)
    res.json({ success: true, data: certifications })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch certifications' })
  }
})

router.post('/:driverId/certifications', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const certification = driverService.createCertification({ ...req.body, driver_id: req.params.driverId })
    res.status(201).json({ success: true, data: certification })
  } catch (error) {
    if (error instanceof DriverValidationError) {
      res.status(400).json({ success: false, error: '数据校验失败', details: error.errors })
      return
    }
    res.status(500).json({ success: false, error: 'Failed to create certification' })
  }
})

router.put('/certifications/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const certification = driverService.updateCertification(req.params.id, req.body)
    res.json({ success: true, data: certification })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update certification' })
  }
})

router.delete('/certifications/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    driverService.deleteCertification(req.params.id)
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete certification' })
  }
})

router.get('/certifications/expiring', (req: Request, res: Response): void => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30
    const certifications = driverService.getExpiringCerts(days)
    res.json({ success: true, data: certifications })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch expiring certifications' })
  }
})

router.get('/:driverId/work-records', (req: Request, res: Response): void => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const records = driverService.getWorkRecordsByDriverId(req.params.driverId, limit)
    res.json({ success: true, data: records })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch work records' })
  }
})

router.post('/:driverId/work-records', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const record = driverService.createWorkRecord({ ...req.body, driver_id: req.params.driverId })
    res.status(201).json({ success: true, data: record })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create work record' })
  }
})

router.get('/:driverId/work-stats', (req: Request, res: Response): void => {
  try {
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: '缺少开始或结束日期' })
      return
    }
    const stats = driverService.getWorkStats(req.params.driverId, startDate, endDate)
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch work stats' })
  }
})

router.get('/schedules/by-date', (req: Request, res: Response): void => {
  try {
    const date = req.query.date as string
    if (!date) {
      res.status(400).json({ success: false, error: '缺少日期参数' })
      return
    }
    const schedules = driverService.getSchedulesByDate(date)
    res.json({ success: true, data: schedules })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch schedules' })
  }
})

router.get('/:driverId/schedules', (req: Request, res: Response): void => {
  try {
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const schedules = driverService.getSchedulesByDriverId(req.params.driverId, startDate, endDate)
    res.json({ success: true, data: schedules })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch schedules' })
  }
})

router.post('/:driverId/schedules', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const schedule = driverService.createSchedule({ ...req.body, driver_id: req.params.driverId })
    res.status(201).json({ success: true, data: schedule })
  } catch (error) {
    if (error instanceof DriverValidationError) {
      res.status(400).json({ success: false, error: '数据校验失败', details: error.errors })
      return
    }
    res.status(500).json({ success: false, error: 'Failed to create schedule' })
  }
})

router.put('/schedules/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const schedule = driverService.updateSchedule(req.params.id, req.body)
    res.json({ success: true, data: schedule })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update schedule' })
  }
})

router.delete('/schedules/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    driverService.deleteSchedule(req.params.id)
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete schedule' })
  }
})

router.get('/:driverId/trainings', (req: Request, res: Response): void => {
  try {
    const trainings = driverService.getTrainingsByDriverId(req.params.driverId)
    res.json({ success: true, data: trainings })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch trainings' })
  }
})

router.post('/:driverId/trainings', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const training = driverService.createTraining({ ...req.body, driver_id: req.params.driverId })
    res.status(201).json({ success: true, data: training })
  } catch (error) {
    if (error instanceof DriverValidationError) {
      res.status(400).json({ success: false, error: '数据校验失败', details: error.errors })
      return
    }
    res.status(500).json({ success: false, error: 'Failed to create training' })
  }
})

router.put('/trainings/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    const training = driverService.updateTraining(req.params.id, req.body)
    res.json({ success: true, data: training })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update training' })
  }
})

router.delete('/trainings/:id', authMiddleware, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' })
      return
    }
    driverService.deleteTraining(req.params.id)
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete training' })
  }
})

export default router
