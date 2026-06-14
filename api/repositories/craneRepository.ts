import { getDatabase } from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

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
  manufacturer?: string
  serial_number?: string
  production_date?: string
  project_name?: string
  construction_unit?: string
  registration_number?: string
  min_radius?: number
  tip_load?: number
  hoist_speed?: number
  slewing_speed?: number
  trolley_speed?: number
  motor_power?: number
  total_weight?: number
  jib_weight?: number
  counterweight?: number
  free_standing_height?: number
  max_anchored_height?: number
  working_temp_min?: number
  working_temp_max?: number
  max_wind_operational?: number
  max_wind_nonoperational?: number
  power_supply?: string
}

export type CraneCreateInput = Omit<Crane, 'id'>

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

  findByName(name: string): Crane | undefined {
    return this.db.prepare('SELECT * FROM cranes WHERE name = ?').get(name) as Crane | undefined
  }

  findBySerialNumber(serialNumber: string): Crane | undefined {
    return this.db.prepare('SELECT * FROM cranes WHERE serial_number = ?').get(serialNumber) as Crane | undefined
  }

  findByRegistrationNumber(regNumber: string): Crane | undefined {
    return this.db.prepare('SELECT * FROM cranes WHERE registration_number = ?').get(regNumber) as Crane | undefined
  }

  updateStatus(id: string, status: Crane['status']): void {
    this.db.prepare('UPDATE cranes SET status = ? WHERE id = ?').run(status, id)
  }

  updateSensorStatus(sensorId: string, status: Sensor['status']): void {
    this.db.prepare('UPDATE sensors SET status = ? WHERE id = ?').run(status, sensorId)
  }

  create(data: CraneCreateInput): Crane {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO cranes (id, name, model, status, location_x, location_y, max_load, max_moment, max_radius, max_height, install_date, last_maintenance,
        manufacturer, serial_number, production_date, project_name, construction_unit, registration_number,
        min_radius, tip_load, hoist_speed, slewing_speed, trolley_speed, motor_power, total_weight, jib_weight, counterweight,
        free_standing_height, max_anchored_height, working_temp_min, working_temp_max, max_wind_operational, max_wind_nonoperational, power_supply)
      VALUES (@id, @name, @model, @status, @location_x, @location_y, @max_load, @max_moment, @max_radius, @max_height, @install_date, @last_maintenance,
        @manufacturer, @serial_number, @production_date, @project_name, @construction_unit, @registration_number,
        @min_radius, @tip_load, @hoist_speed, @slewing_speed, @trolley_speed, @motor_power, @total_weight, @jib_weight, @counterweight,
        @free_standing_height, @max_anchored_height, @working_temp_min, @working_temp_max, @max_wind_operational, @max_wind_nonoperational, @power_supply)
    `).run({
      id,
      manufacturer: null,
      serial_number: null,
      production_date: null,
      project_name: null,
      construction_unit: null,
      registration_number: null,
      min_radius: 2,
      tip_load: null,
      hoist_speed: null,
      slewing_speed: null,
      trolley_speed: null,
      motor_power: null,
      total_weight: null,
      jib_weight: null,
      counterweight: null,
      free_standing_height: null,
      max_anchored_height: null,
      working_temp_min: -20,
      working_temp_max: 40,
      max_wind_operational: 12,
      max_wind_nonoperational: 30,
      power_supply: '380V/50Hz',
      ...data,
    })
    return { id, ...data }
  }

  createSensorsForCrane(craneId: string, craneData: CraneCreateInput): void {
    const sensorTypes: { type: string; unit: string; min: number; max?: number; maxField?: keyof CraneCreateInput }[] = [
      { type: 'load', unit: 't', min: 0, maxField: 'max_load' },
      { type: 'moment', unit: 't·m', min: 0, maxField: 'max_moment' },
      { type: 'radius', unit: 'm', min: craneData.min_radius || 2, maxField: 'max_radius' },
      { type: 'height', unit: 'm', min: 0, maxField: 'max_height' },
      { type: 'rotation', unit: '°', min: 0, max: 360 },
      { type: 'wind', unit: 'm/s', min: 0, max: 40 },
    ]

    const insertSensor = this.db.prepare(`
      INSERT INTO sensors (id, crane_id, type, unit, min_value, max_value, status)
      VALUES (?, ?, ?, ?, ?, ?, 'normal')
    `)

    for (const st of sensorTypes) {
      const maxVal = st.max !== undefined ? st.max : (st.maxField ? (craneData[st.maxField] as number) : 0)
      insertSensor.run(uuidv4(), craneId, st.type, st.unit, st.min, maxVal)
    }
  }

  createDefaultRulesForCrane(craneId: string, craneData: CraneCreateInput): void {
    const ruleTemplates = [
      { name: '起重量警告', sensor_type: 'load', condition: 'gte' as const, level: 'warning' as const, multiplier: 0.85 },
      { name: '起重量临界', sensor_type: 'load', condition: 'gte' as const, level: 'critical' as const, multiplier: 0.95 },
      { name: '力矩警告', sensor_type: 'moment', condition: 'gte' as const, level: 'warning' as const, multiplier: 0.80 },
      { name: '力矩临界', sensor_type: 'moment', condition: 'gte' as const, level: 'critical' as const, multiplier: 0.95 },
      { name: '风速警告', sensor_type: 'wind', condition: 'gte' as const, level: 'warning' as const, fixed: craneData.max_wind_operational || 12 },
      { name: '风速临界', sensor_type: 'wind', condition: 'gte' as const, level: 'critical' as const, fixed: (craneData.max_wind_operational || 12) * 1.67 },
    ]

    const insertRule = this.db.prepare(`
      INSERT INTO alert_rules (id, name, crane_id, sensor_type, condition, threshold, level, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `)

    for (const rt of ruleTemplates) {
      let threshold: number
      if (rt.fixed !== undefined) {
        threshold = rt.fixed
      } else {
        const maxVal = rt.sensor_type === 'load' ? craneData.max_load : craneData.max_moment
        threshold = Number((maxVal * rt.multiplier).toFixed(2))
      }
      insertRule.run(uuidv4(), `${craneData.name.split(' ')[0]} ${rt.name}`, craneId, rt.sensor_type, rt.condition, threshold, rt.level)
    }
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM cranes WHERE id = ?').run(id)
  }
}

export const craneRepository = new CraneRepository()
