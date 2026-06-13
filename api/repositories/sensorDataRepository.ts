import { getDatabase } from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

export interface SensorData {
  id: string
  crane_id: string
  sensor_type: string
  value: number
  timestamp: string
}

export interface LatestSensorData {
  crane_id: string
  sensor_type: string
  value: number
  timestamp: string
  unit: string
}

export interface SensorDataQuery {
  craneId?: string
  sensorType?: string
  startTime: string
  endTime: string
  interval?: '1m' | '5m' | '15m' | '1h' | '1d'
}

class SensorDataRepository {
  private db = getDatabase()

  create(data: Omit<SensorData, 'id'>): SensorData {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO sensor_data (id, crane_id, sensor_type, value, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.crane_id, data.sensor_type, data.value, data.timestamp)
    return { id, ...data }
  }

  createMany(dataList: Array<Omit<SensorData, 'id'>>): void {
    const stmt = this.db.prepare(`
      INSERT INTO sensor_data (id, crane_id, sensor_type, value, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `)
    const tx = this.db.transaction((items: typeof dataList) => {
      for (const d of items) {
        stmt.run(uuidv4(), d.crane_id, d.sensor_type, d.value, d.timestamp)
      }
    })
    tx(dataList)
  }

  findLatestByCraneId(craneId: string): LatestSensorData[] {
    return this.db.prepare(`
      SELECT sd.crane_id, sd.sensor_type, sd.value, sd.timestamp, s.unit
      FROM sensor_data sd
      INNER JOIN sensors s ON s.crane_id = sd.crane_id AND s.type = sd.sensor_type
      INNER JOIN (
        SELECT crane_id, sensor_type, MAX(timestamp) as max_ts
        FROM sensor_data
        WHERE crane_id = ?
        GROUP BY crane_id, sensor_type
      ) latest ON sd.crane_id = latest.crane_id AND sd.sensor_type = latest.sensor_type AND sd.timestamp = latest.max_ts
      WHERE sd.crane_id = ?
      ORDER BY sd.sensor_type
    `).all(craneId, craneId) as LatestSensorData[]
  }

  findLatestAll(): LatestSensorData[] {
    return this.db.prepare(`
      SELECT sd.crane_id, sd.sensor_type, sd.value, sd.timestamp, s.unit
      FROM sensor_data sd
      INNER JOIN sensors s ON s.crane_id = sd.crane_id AND s.type = sd.sensor_type
      INNER JOIN (
        SELECT crane_id, sensor_type, MAX(timestamp) as max_ts
        FROM sensor_data
        GROUP BY crane_id, sensor_type
      ) latest ON sd.crane_id = latest.crane_id AND sd.sensor_type = latest.sensor_type AND sd.timestamp = latest.max_ts
      ORDER BY sd.crane_id, sd.sensor_type
    `).all() as LatestSensorData[]
  }

  findByQuery(query: SensorDataQuery): SensorData[] {
    const conditions: string[] = ['timestamp >= ?', 'timestamp <= ?']
    const params: any[] = [query.startTime, query.endTime]

    if (query.craneId) {
      conditions.push('crane_id = ?')
      params.push(query.craneId)
    }
    if (query.sensorType) {
      conditions.push('sensor_type = ?')
      params.push(query.sensorType)
    }

    const sql = `
      SELECT * FROM sensor_data
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp ASC
    `

    return this.db.prepare(sql).all(...params) as SensorData[]
  }

  findAggregatedByQuery(query: SensorDataQuery): Array<{ timestamp: string; sensor_type: string; avg_value: number; max_value: number; min_value: number }> {
    const dateFormat = this.getDateFormat(query.interval || '5m')
    const conditions: string[] = ['timestamp >= ?', 'timestamp <= ?']
    const params: any[] = [query.startTime, query.endTime]

    if (query.craneId) {
      conditions.push('crane_id = ?')
      params.push(query.craneId)
    }
    if (query.sensorType) {
      conditions.push('sensor_type = ?')
      params.push(query.sensorType)
    }

    const sql = `
      SELECT
        strftime('${dateFormat}', timestamp) as timestamp,
        sensor_type,
        AVG(value) as avg_value,
        MAX(value) as max_value,
        MIN(value) as min_value
      FROM sensor_data
      WHERE ${conditions.join(' AND ')}
      GROUP BY strftime('${dateFormat}', timestamp), sensor_type
      ORDER BY timestamp ASC
    `

    return this.db.prepare(sql).all(...params) as any[]
  }

  private getDateFormat(interval: string): string {
    switch (interval) {
      case '1m': return '%Y-%m-%d %H:%M:00'
      case '5m': return '%Y-%m-%d %H:%M'
      case '15m': return '%Y-%m-%d %H:%M'
      case '1h': return '%Y-%m-%d %H:00:00'
      case '1d': return '%Y-%m-%d'
      default: return '%Y-%m-%d %H:%M'
    }
  }

  deleteOldData(beforeDate: string): number {
    const result = this.db.prepare('DELETE FROM sensor_data WHERE timestamp < ?').run(beforeDate)
    return result.changes
  }
}

export const sensorDataRepository = new SensorDataRepository()
