import { Router, type Request, type Response } from 'express'
import { sensorDataService } from '../services/sensorDataService.js'

const router = Router()

router.get('/latest/:craneId', (req: Request, res: Response): void => {
  try {
    const data = sensorDataService.getLatestSensorData(req.params.craneId)
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch latest sensor data' })
  }
})

router.get('/latest', (req: Request, res: Response): void => {
  try {
    const data = sensorDataService.getAllLatestSensorData()
    const grouped: Record<string, any[]> = {}
    for (const d of data) {
      if (!grouped[d.crane_id]) grouped[d.crane_id] = []
      grouped[d.crane_id].push(d)
    }
    res.json({ success: true, data: grouped })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch latest sensor data' })
  }
})

router.get('/history', (req: Request, res: Response): void => {
  try {
    const { craneId, sensorType, startTime, endTime, interval, aggregated } = req.query

    if (!startTime || !endTime) {
      res.status(400).json({ success: false, error: 'startTime and endTime are required' })
      return
    }

    const query = {
      craneId: craneId as string | undefined,
      sensorType: sensorType as string | undefined,
      startTime: startTime as string,
      endTime: endTime as string,
      interval: (interval as string | undefined) as any,
    }

    let data
    if (aggregated === 'true') {
      data = sensorDataService.getAggregatedHistory(query)
    } else {
      data = sensorDataService.getHistoryData(query)
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch history data' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { craneId, sensorType, value, timestamp } = req.body

    if (!craneId || !sensorType || value === undefined) {
      res.status(400).json({ success: false, error: 'craneId, sensorType and value are required' })
      return
    }

    sensorDataService.ingestSensorData({
      craneId,
      sensorType,
      value: Number(value),
      timestamp: timestamp as string | undefined,
    })

    res.json({ success: true, message: 'Data ingested successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to ingest sensor data' })
  }
})

router.post('/batch', (req: Request, res: Response): void => {
  try {
    const { data } = req.body

    if (!Array.isArray(data) || data.length === 0) {
      res.status(400).json({ success: false, error: 'data array is required' })
      return
    }

    sensorDataService.ingestBatch(data)
    res.json({ success: true, message: `Ingested ${data.length} records` })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to ingest batch data' })
  }
})

export default router
