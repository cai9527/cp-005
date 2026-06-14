import { Router, type Request, type Response } from 'express'

const router = Router()

type UserRole = 'admin' | 'user'

interface Account {
  password: string
  role: UserRole
  displayName: string
}

const DEFAULT_ACCOUNTS: Record<string, Account> = {
  admin: {
    password: 'admin123',
    role: 'admin',
    displayName: '系统管理员',
  },
  user: {
    password: 'user123',
    role: 'user',
    displayName: '普通用户',
  },
}

function generateToken(username: string, role: UserRole): string {
  const payload = {
    username,
    role,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

router.post('/register', async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ message: '暂不支持注册' })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    res.status(400).json({ message: '请输入用户名和密码' })
    return
  }

  const account = DEFAULT_ACCOUNTS[username]
  if (!account) {
    res.status(401).json({ message: '账号不存在，请使用 admin 或 user 登录' })
    return
  }

  if (account.password !== password) {
    res.status(401).json({ message: '密码错误，请重新输入' })
    return
  }

  const token = generateToken(username, account.role)

  res.json({
    token,
    role: account.role,
    displayName: account.displayName,
    username,
  })
})

router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: '已退出登录' })
})

export default router
