import { type Request, type Response, type NextFunction } from 'express'

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.removeHeader('X-Powered-By')
  next()
}

export function rateLimitMiddleware(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const record = requests.get(ip)

    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs })
      next()
      return
    }

    record.count++
    if (record.count > maxRequests) {
      res.status(429).json({ message: '请求过于频繁，请稍后再试' })
      return
    }

    next()
  }
}
