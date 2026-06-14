/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import craneRoutes from './routes/cranes.js'
import sensorDataRoutes from './routes/sensorData.js'
import alertRoutes from './routes/alerts.js'
import alertRuleRoutes from './routes/alertRules.js'
import analysisRoutes from './routes/analysis.js'
import simulatorRoutes from './routes/simulator.js'
import deviceStatusRoutes from './routes/deviceStatus.js'
import rotationSimulatorRoutes from './routes/rotationSimulator.js'
import userRoutes from './routes/users.js'
import collisionRoutes from './routes/collision.js'
import { sanitizeMiddleware } from './middleware/sanitize.js'
import { securityHeaders, rateLimitMiddleware } from './middleware/security.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(securityHeaders)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(sanitizeMiddleware)
app.use('/api/auth/login', rateLimitMiddleware(10, 15 * 60 * 1000))
app.use('/api/auth/register', rateLimitMiddleware(5, 60 * 60 * 1000))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/cranes', craneRoutes)
app.use('/api/sensor-data', sensorDataRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/alert-rules', alertRuleRoutes)
app.use('/api/analysis', analysisRoutes)
app.use('/api/simulator', simulatorRoutes)
app.use('/api/device-status', deviceStatusRoutes)
app.use('/api/rotation-simulator', rotationSimulatorRoutes)
app.use('/api/collision', collisionRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
