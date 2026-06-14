import { type Request, type Response, type NextFunction } from 'express'
import { verifyToken, type UserRole } from '../services/userService.js'

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    username: string
    role: UserRole
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: '未提供认证令牌' })
    return
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ message: '认证令牌无效或已过期' })
    return
  }

  req.user = payload
  next()
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: '未认证' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: '权限不足' })
      return
    }
    next()
  }
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket.remoteAddress || null
}
