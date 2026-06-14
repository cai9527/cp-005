import { Router, type Request, type Response } from 'express'
import * as userService from '../services/userService.js'
import { authMiddleware, type AuthenticatedRequest, getClientIp } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body || {}

    if (!username || !password) {
      res.status(400).json({ message: '请输入用户名和密码' })
      return
    }

    const ip = getClientIp(req)
    const result = userService.authenticateUser(username, password, ip)

    res.json({
      token: result.token,
      user: result.user,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '登录失败'
    const status = message.includes('不存在') || message.includes('错误') || message.includes('禁用') ? 401 : 500
    res.status(status).json({ message })
  }
})

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, displayName, email, phone } = req.body || {}

    if (!username || !password || !displayName) {
      res.status(400).json({ message: '用户名、密码和显示名称不能为空' })
      return
    }

    const ip = getClientIp(req)
    const user = userService.registerUser({
      username,
      password,
      displayName,
      email,
      phone,
      role: 'user',
    }, 'system', '系统注册', ip)

    const token = userService.generateToken(user.id, user.username, 'user')

    res.status(201).json({
      token,
      user,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '注册失败'
    const status = message.includes('已存在') || message.includes('不能为空') || message.includes('不正确') || message.includes('应在') ? 400 : 500
    res.status(status).json({ message })
  }
})

router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: '已退出登录' })
})

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = userService.getUserById(req.user!.userId)
    res.json(user)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询失败'
    res.status(404).json({ message })
  }
})

router.put('/me/password', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body || {}
    if (!oldPassword || !newPassword) {
      res.status(400).json({ message: '请输入原密码和新密码' })
      return
    }
    const ip = getClientIp(req)
    userService.changePassword(req.user!.userId, oldPassword, newPassword, ip)
    res.json({ message: '密码修改成功' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '密码修改失败'
    const status = message.includes('错误') || message.includes('不能为空') || message.includes('应在') ? 400 : 500
    res.status(status).json({ message })
  }
})

router.put('/me/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { displayName, email, phone } = req.body || {}
    const ip = getClientIp(req)
    const user = userService.updateOwnProfile(req.user!.userId, {
      displayName,
      email,
      phone,
    }, ip)
    res.json(user)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '更新失败'
    const status = message.includes('不存在') ? 404 : message.includes('无效') || message.includes('不正确') ? 400 : 500
    res.status(status).json({ message })
  }
})

export default router
