import { Router, type Response } from 'express'
import { authMiddleware, requireRole, getClientIp, type AuthenticatedRequest } from '../middleware/auth.js'
import * as userService from '../services/userService.js'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('admin'))

router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10))
    const keyword = req.query.keyword as string | undefined
    const role = req.query.role as string | undefined
    const status = req.query.status as string | undefined

    const result = userService.getUserList({ page, pageSize, keyword, role, status })
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询失败'
    res.status(500).json({ message })
  }
})

router.get('/logs', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10))
    const userId = req.query.userId as string | undefined
    const action = req.query.action as string | undefined
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    const result = userService.getOperationLogs({ page, pageSize, userId, action, startDate, endDate })
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询日志失败'
    res.status(500).json({ message })
  }
})

router.get('/login-logs', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10))
    const username = req.query.username as string | undefined
    const successParam = req.query.success as string | undefined
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    const success = successParam !== undefined ? successParam === 'true' : undefined

    const result = userService.getLoginAuditLogs({ page, pageSize, username, success, startDate, endDate })
    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询登录日志失败'
    res.status(500).json({ message })
  }
})

router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = userService.getUserById(req.params.id)
    res.json(user)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询失败'
    res.status(404).json({ message })
  }
})

router.post('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const ip = getClientIp(req)
    const user = userService.registerUser({
      username: req.body.username,
      password: req.body.password,
      displayName: req.body.displayName,
      email: req.body.email,
      phone: req.body.phone,
      role: req.body.role,
    }, req.user!.userId, req.user!.username, ip)
    res.status(201).json(user)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '创建用户失败'
    const status = message.includes('已存在') || message.includes('不能为空') || message.includes('不正确') || message.includes('应在') || message.includes('无效') ? 400 : 500
    res.status(status).json({ message })
  }
})

router.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const ip = getClientIp(req)
    const user = userService.updateUserInfo(req.params.id, {
      display_name: req.body.displayName,
      email: req.body.email,
      phone: req.body.phone,
      role: req.body.role,
      status: req.body.status,
    }, req.user!.userId, req.user!.username, ip)
    res.json(user)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新用户失败'
    const status = message.includes('不存在') ? 404 : message.includes('无效') || message.includes('不正确') ? 400 : 500
    res.status(status).json({ message })
  }
})

router.put('/:id/password/reset', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const ip = getClientIp(req)
    const { newPassword } = req.body || {}
    if (!newPassword) {
      res.status(400).json({ message: '新密码不能为空' })
      return
    }
    userService.resetUserPassword(req.params.id, newPassword, req.user!.userId, req.user!.username, ip)
    res.json({ message: '密码重置成功' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '密码重置失败'
    const status = message.includes('不存在') ? 404 : message.includes('不能为空') || message.includes('应在') ? 400 : 500
    res.status(status).json({ message })
  }
})

router.put('/:id/password/change', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const ip = getClientIp(req)
    const { oldPassword, newPassword } = req.body || {}
    if (!oldPassword || !newPassword) {
      res.status(400).json({ message: '请输入原密码和新密码' })
      return
    }
    userService.changePassword(req.params.id, oldPassword, newPassword, ip)
    res.json({ message: '密码修改成功' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '密码修改失败'
    const status = message.includes('不存在') ? 404 : message.includes('错误') || message.includes('不能为空') || message.includes('应在') ? 400 : 500
    res.status(status).json({ message })
  }
})

router.delete('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const ip = getClientIp(req)
    const { ids } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: '请选择要删除的用户' })
      return
    }
    const count = userService.deleteUsersByIds(ids, req.user!.userId, req.user!.username, ip)
    res.json({ message: `成功删除 ${count} 个用户`, count })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除用户失败'
    const status = message.includes('不能删除') ? 400 : 500
    res.status(status).json({ message })
  }
})

router.put('/batch/status', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const ip = getClientIp(req)
    const { ids, status } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: '请选择要操作的用户' })
      return
    }
    if (!['active', 'disabled'].includes(status)) {
      res.status(400).json({ message: '无效的状态值' })
      return
    }
    const count = userService.batchSetStatus(ids, status, req.user!.userId, req.user!.username, ip)
    res.json({ message: `成功更新 ${count} 个用户状态`, count })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '批量操作失败'
    const status = message.includes('不能修改') ? 400 : 500
    res.status(status).json({ message })
  }
})

router.put('/batch/role', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const ip = getClientIp(req)
    const { ids, role } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: '请选择要操作的用户' })
      return
    }
    if (!['admin', 'user'].includes(role)) {
      res.status(400).json({ message: '无效的角色值' })
      return
    }
    const count = userService.batchSetRole(ids, role, req.user!.userId, req.user!.username, ip)
    res.json({ message: `成功更新 ${count} 个用户角色`, count })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '批量操作失败'
    const status = message.includes('不能修改') ? 400 : 500
    res.status(status).json({ message })
  }
})

export default router
