import { getDatabase } from '../db/database.js'

export interface Crane {
  id: string
  name: string
  model: string
  status: 'online' | 'offline' | 'alarm'
  location_x: number
  location_y: number
  max_load: number
  max_moment: number
  max_radius: number
  max_height: number
  install_date: string
  last_maintenance: string
}

export interface Sensor {
  id: string
  crane_id: string
  type: string
  unit: string
  min_value: number
  max_value: number
  status: 'normal' | 'warning' | 'alarm'
}

export interface CraneWithSensors extends Crane {
  sensors: Sensor[]
}

class CraneRepository {
  private db = getDatabase()

  findAll(): Crane[] {
    return this.db.prepare('SELECT * FROM cranes ORDER BY name').all() as Crane[]
  }

  findById(id: string): Crane | undefined {
    return this.db.prepare('SELECT * FROM cranes WHERE id = ?').get(id) as Crane | undefined
  }

  findByIdWithSensors(id: string): CraneWithSensors | undefined {
    const crane = this.findById(id)
    if (!crane) return undefined
    const sensors = this.findSensorsByCraneId(id)
    return { ...crane, sensors }
  }

  findSensorsByCraneId(craneId: string): Sensor[] {
    return this.db.prepare('SELECT * FROM sensors WHERE crane_id = ? ORDER BY type').all(craneId) as Sensor[]
  }

  updateStatus(id: string, status: Crane['status']): void {
    this.db.prepare('UPDATE cranes SET status = ? WHERE id = ?').run(status, id)
  }

  updateSensorStatus(sensorId: string, status: Sensor['status']): void {
    this.db.prepare('UPDATE sensors SET status = ? WHERE id = ?').run(status, sensorId)
  }

  create(data: Omit<Crane, 'id'>): Crane {
    const { v4: uuidv4 } = require('uuid')
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO cranes (id, name, model, status, location_x, location_y, max_load, max_moment, max_radius, max_height, install_date, last_maintenance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.model, data.status, data.location_x, data.location_y, data.max_load, data.max_moment, data.max_radius, data.max_height, data.install_date, data.last_maintenance)
    return { id, ...data }
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM cranes WHERE id = ?').run(id)
  }
}

export const craneRepository = new CraneRepository()
