import { getDatabase } from '../db/database.js'
import { v4 as uuidv4 } from 'uuid'

export interface Driver {
  id: string
  name: string
  gender: 'male' | 'female'
  id_card: string
  phone: string
  emergency_contact?: string
  emergency_phone?: string
  address?: string
  photo?: string
  status: 'active' | 'leave' | 'resigned'
  hire_date: string
  leave_date?: string
  experience_years: number
  crane_id?: string
  created_at: string
  updated_at: string
}

export type DriverCreateInput = Omit<Driver, 'id'>

export interface DriverCertification {
  id: string
  driver_id: string
  cert_type: string
  cert_number: string
  issue_authority: string
  issue_date: string
  expiry_date: string
  status: 'valid' | 'expired' | 'revoked'
  remark?: string
  created_at: string
  updated_at: string
}

export interface DriverWorkRecord {
  id: string
  driver_id: string
  crane_id: string
  work_date: string
  start_time: string
  end_time: string
  work_type: 'normal' | 'overtime' | 'holiday'
  work_content?: string
  load_count: number
  max_load: number
  remark?: string
  created_at: string
}

export interface DriverSchedule {
  id: string
  driver_id: string
  crane_id: string
  schedule_date: string
  shift_type: 'day' | 'night' | 'split'
  start_time: string
  end_time: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  remark?: string
  created_at: string
  updated_at: string
}

export interface DriverTraining {
  id: string
  driver_id: string
  training_type: 'safety' | 'skill' | 'emergency' | 'special'
  training_name: string
  training_date: string
  duration_hours: number
  trainer?: string
  training_org?: string
  result: 'pending' | 'passed' | 'failed'
  score?: number
  remark?: string
  created_at: string
  updated_at: string
}

export interface DriverWithCraneName extends Driver {
  crane_name?: string
}

class DriverRepository {
  private db = getDatabase()

  findAll(): DriverWithCraneName[] {
    return this.db.prepare(`
      SELECT d.*, c.name AS crane_name
      FROM drivers d
      LEFT JOIN cranes c ON d.crane_id = c.id
      ORDER BY d.name
    `).all() as DriverWithCraneName[]
  }

  findById(id: string): Driver | undefined {
    return this.db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as Driver | undefined
  }

  findByIdCard(idCard: string): Driver | undefined {
    return this.db.prepare('SELECT * FROM drivers WHERE id_card = ?').get(idCard) as Driver | undefined
  }

  findByPhone(phone: string): Driver | undefined {
    return this.db.prepare('SELECT * FROM drivers WHERE phone = ?').get(phone) as Driver | undefined
  }

  create(data: DriverCreateInput): Driver {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO drivers (id, name, gender, id_card, phone, emergency_contact, emergency_phone, address, photo,
        status, hire_date, leave_date, experience_years, crane_id, created_at, updated_at)
      VALUES (@id, @name, @gender, @id_card, @phone, @emergency_contact, @emergency_phone, @address, @photo,
        @status, @hire_date, @leave_date, @experience_years, @crane_id, @created_at, @updated_at)
    `).run({
      id,
      emergency_contact: null,
      emergency_phone: null,
      address: null,
      photo: null,
      leave_date: null,
      crane_id: null,
      ...data,
    })
    return { id, ...data }
  }

  update(id: string, data: Partial<DriverCreateInput>): Driver | undefined {
    const existing = this.findById(id)
    if (!existing) return undefined

    const fields = Object.keys(data).filter((k) => data[k as keyof Partial<DriverCreateInput>] !== undefined)
    if (fields.length === 0) return existing

    const setClauses = fields.map((f) => `${f} = @${f}`).join(', ')
    const params: Record<string, unknown> = { id }
    for (const f of fields) {
      params[f] = data[f as keyof Partial<DriverCreateInput>]
    }

    this.db.prepare(`UPDATE drivers SET ${setClauses} WHERE id = @id`).run(params)
    return this.findById(id)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM drivers WHERE id = ?').run(id)
  }

  findCertificationsByDriverId(driverId: string): DriverCertification[] {
    return this.db.prepare('SELECT * FROM driver_certifications WHERE driver_id = ? ORDER BY issue_date DESC').all(driverId) as DriverCertification[]
  }

  findCertificationById(id: string): DriverCertification | undefined {
    return this.db.prepare('SELECT * FROM driver_certifications WHERE id = ?').get(id) as DriverCertification | undefined
  }

  createCertification(data: Omit<DriverCertification, 'id'>): DriverCertification {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO driver_certifications (id, driver_id, cert_type, cert_number, issue_authority, issue_date, expiry_date, status, remark, created_at, updated_at)
      VALUES (@id, @driver_id, @cert_type, @cert_number, @issue_authority, @issue_date, @expiry_date, @status, @remark, @created_at, @updated_at)
    `).run({
      id,
      remark: null,
      ...data,
    })
    return { id, ...data }
  }

  updateCertification(id: string, data: Partial<Omit<DriverCertification, 'id'>>): DriverCertification | undefined {
    const existing = this.findCertificationById(id)
    if (!existing) return undefined

    const fields = Object.keys(data).filter((k) => data[k as keyof Partial<Omit<DriverCertification, 'id'>>] !== undefined)
    if (fields.length === 0) return existing

    const setClauses = fields.map((f) => `${f} = @${f}`).join(', ')
    const params: Record<string, unknown> = { id }
    for (const f of fields) {
      params[f] = data[f as keyof Partial<Omit<DriverCertification, 'id'>>]
    }

    this.db.prepare(`UPDATE driver_certifications SET ${setClauses} WHERE id = @id`).run(params)
    return this.findCertificationById(id)
  }

  deleteCertification(id: string): void {
    this.db.prepare('DELETE FROM driver_certifications WHERE id = ?').run(id)
  }

  findExpiringCerts(daysBeforeExpiry: number): DriverCertification[] {
    return this.db.prepare(`
      SELECT * FROM driver_certifications
      WHERE status = 'valid' AND expiry_date <= date('now', '+' || ? || ' days')
      ORDER BY expiry_date ASC
    `).all(daysBeforeExpiry) as DriverCertification[]
  }

  findWorkRecordsByDriverId(driverId: string, limit?: number): DriverWorkRecord[] {
    const sql = limit
      ? 'SELECT * FROM driver_work_records WHERE driver_id = ? ORDER BY work_date DESC LIMIT ?'
      : 'SELECT * FROM driver_work_records WHERE driver_id = ? ORDER BY work_date DESC'
    const params = limit ? [driverId, limit] : [driverId]
    return this.db.prepare(sql).all(...params) as DriverWorkRecord[]
  }

  findWorkRecordsByCraneId(craneId: string, limit?: number): DriverWorkRecord[] {
    const sql = limit
      ? 'SELECT * FROM driver_work_records WHERE crane_id = ? ORDER BY work_date DESC LIMIT ?'
      : 'SELECT * FROM driver_work_records WHERE crane_id = ? ORDER BY work_date DESC'
    const params = limit ? [craneId, limit] : [craneId]
    return this.db.prepare(sql).all(...params) as DriverWorkRecord[]
  }

  createWorkRecord(data: Omit<DriverWorkRecord, 'id'>): DriverWorkRecord {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO driver_work_records (id, driver_id, crane_id, work_date, start_time, end_time, work_type, work_content, load_count, max_load, remark, created_at)
      VALUES (@id, @driver_id, @crane_id, @work_date, @start_time, @end_time, @work_type, @work_content, @load_count, @max_load, @remark, @created_at)
    `).run({
      id,
      work_content: null,
      remark: null,
      ...data,
    })
    return { id, ...data }
  }

  findWorkStatsByDriverId(driverId: string, startDate: string, endDate: string): { total_days: number; total_load_count: number; max_load: number; overtime_days: number; holiday_days: number } {
    const row = this.db.prepare(`
      SELECT
        COUNT(DISTINCT work_date) AS total_days,
        COALESCE(SUM(load_count), 0) AS total_load_count,
        COALESCE(MAX(max_load), 0) AS max_load,
        COUNT(CASE WHEN work_type = 'overtime' THEN 1 END) AS overtime_days,
        COUNT(CASE WHEN work_type = 'holiday' THEN 1 END) AS holiday_days
      FROM driver_work_records
      WHERE driver_id = ? AND work_date >= ? AND work_date <= ?
    `).get(driverId, startDate, endDate) as { total_days: number; total_load_count: number; max_load: number; overtime_days: number; holiday_days: number }
    return row
  }

  findSchedulesByDriverId(driverId: string, startDate?: string, endDate?: string): DriverSchedule[] {
    if (startDate && endDate) {
      return this.db.prepare(`
        SELECT * FROM driver_schedules
        WHERE driver_id = ? AND schedule_date >= ? AND schedule_date <= ?
        ORDER BY schedule_date ASC, start_time ASC
      `).all(driverId, startDate, endDate) as DriverSchedule[]
    }
    return this.db.prepare('SELECT * FROM driver_schedules WHERE driver_id = ? ORDER BY schedule_date ASC, start_time ASC').all(driverId) as DriverSchedule[]
  }

  findSchedulesByCraneId(craneId: string, date: string): DriverSchedule[] {
    return this.db.prepare(`
      SELECT * FROM driver_schedules
      WHERE crane_id = ? AND schedule_date = ?
      ORDER BY start_time ASC
    `).all(craneId, date) as DriverSchedule[]
  }

  findSchedulesByDate(date: string): DriverSchedule[] {
    return this.db.prepare(`
      SELECT * FROM driver_schedules
      WHERE schedule_date = ?
      ORDER BY start_time ASC
    `).all(date) as DriverSchedule[]
  }

  createSchedule(data: Omit<DriverSchedule, 'id'>): DriverSchedule {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO driver_schedules (id, driver_id, crane_id, schedule_date, shift_type, start_time, end_time, status, remark, created_at, updated_at)
      VALUES (@id, @driver_id, @crane_id, @schedule_date, @shift_type, @start_time, @end_time, @status, @remark, @created_at, @updated_at)
    `).run({
      id,
      remark: null,
      ...data,
    })
    return { id, ...data }
  }

  updateSchedule(id: string, data: Partial<Omit<DriverSchedule, 'id'>>): DriverSchedule | undefined {
    const stmt = this.db.prepare('SELECT * FROM driver_schedules WHERE id = ?')
    const existing = stmt.get(id) as DriverSchedule | undefined
    if (!existing) return undefined

    const fields = Object.keys(data).filter((k) => data[k as keyof Partial<Omit<DriverSchedule, 'id'>>] !== undefined)
    if (fields.length === 0) return existing

    const setClauses = fields.map((f) => `${f} = @${f}`).join(', ')
    const params: Record<string, unknown> = { id }
    for (const f of fields) {
      params[f] = data[f as keyof Partial<Omit<DriverSchedule, 'id'>>]
    }

    this.db.prepare(`UPDATE driver_schedules SET ${setClauses} WHERE id = @id`).run(params)
    return stmt.get(id) as DriverSchedule
  }

  deleteSchedule(id: string): void {
    this.db.prepare('DELETE FROM driver_schedules WHERE id = ?').run(id)
  }

  findScheduleConflicts(driverId: string, scheduleDate: string, shiftType: DriverSchedule['shift_type'], excludeId?: string): DriverSchedule[] {
    if (excludeId) {
      return this.db.prepare(`
        SELECT * FROM driver_schedules
        WHERE driver_id = ? AND schedule_date = ? AND shift_type = ? AND id != ? AND status != 'cancelled'
      `).all(driverId, scheduleDate, shiftType, excludeId) as DriverSchedule[]
    }
    return this.db.prepare(`
      SELECT * FROM driver_schedules
      WHERE driver_id = ? AND schedule_date = ? AND shift_type = ? AND status != 'cancelled'
    `).all(driverId, scheduleDate, shiftType) as DriverSchedule[]
  }

  findTrainingsByDriverId(driverId: string): DriverTraining[] {
    return this.db.prepare('SELECT * FROM driver_trainings WHERE driver_id = ? ORDER BY training_date DESC').all(driverId) as DriverTraining[]
  }

  createTraining(data: Omit<DriverTraining, 'id'>): DriverTraining {
    const id = uuidv4()
    this.db.prepare(`
      INSERT INTO driver_trainings (id, driver_id, training_type, training_name, training_date, duration_hours, trainer, training_org, result, score, remark, created_at, updated_at)
      VALUES (@id, @driver_id, @training_type, @training_name, @training_date, @duration_hours, @trainer, @training_org, @result, @score, @remark, @created_at, @updated_at)
    `).run({
      id,
      trainer: null,
      training_org: null,
      score: null,
      remark: null,
      ...data,
    })
    return { id, ...data }
  }

  updateTraining(id: string, data: Partial<Omit<DriverTraining, 'id'>>): DriverTraining | undefined {
    const stmt = this.db.prepare('SELECT * FROM driver_trainings WHERE id = ?')
    const existing = stmt.get(id) as DriverTraining | undefined
    if (!existing) return undefined

    const fields = Object.keys(data).filter((k) => data[k as keyof Partial<Omit<DriverTraining, 'id'>>] !== undefined)
    if (fields.length === 0) return existing

    const setClauses = fields.map((f) => `${f} = @${f}`).join(', ')
    const params: Record<string, unknown> = { id }
    for (const f of fields) {
      params[f] = data[f as keyof Partial<Omit<DriverTraining, 'id'>>]
    }

    this.db.prepare(`UPDATE driver_trainings SET ${setClauses} WHERE id = @id`).run(params)
    return stmt.get(id) as DriverTraining
  }

  deleteTraining(id: string): void {
    this.db.prepare('DELETE FROM driver_trainings WHERE id = ?').run(id)
  }

  findTrainingsByType(trainingType: DriverTraining['training_type']): DriverTraining[] {
    return this.db.prepare('SELECT * FROM driver_trainings WHERE training_type = ? ORDER BY training_date DESC').all(trainingType) as DriverTraining[]
  }
}

export const driverRepository = new DriverRepository()
