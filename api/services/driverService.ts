import { driverRepository, type Driver, type DriverCreateInput, type DriverCertification, type DriverWorkRecord, type DriverSchedule, type DriverTraining, type DriverWithCraneName } from '../repositories/driverRepository.js'
import { craneRepository } from '../repositories/craneRepository.js'

export interface ValidationError {
  field: string
  message: string
}

export class DriverValidationError extends Error {
  public errors: ValidationError[]
  constructor(errors: ValidationError[]) {
    super('Validation failed')
    this.errors = errors
    this.name = 'DriverValidationError'
  }
}

const ID_CARD_REGEX = /^\d{17}[\dXx]$/
const PHONE_REGEX = /^1[3-9]\d{9}$/
const VALID_CERT_TYPES = ['tower_crane_operator', 'safety_training', 'special_operation', 'aerial_work']
const VALID_TRAINING_RESULTS = ['pending', 'passed', 'failed']
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

class DriverService {
  getAllDrivers(): DriverWithCraneName[] {
    return driverRepository.findAll()
  }

  getDriverById(id: string): Driver | undefined {
    return driverRepository.findById(id)
  }

  private validateCreateInput(data: Partial<DriverCreateInput>): ValidationError[] {
    const errors: ValidationError[] = []

    const requiredFields: Array<keyof DriverCreateInput> = ['name', 'id_card', 'phone', 'hire_date']
    for (const field of requiredFields) {
      const val = data[field]
      if (val === undefined || val === null || val === '') {
        errors.push({ field, message: '该字段为必填项' })
      }
    }

    if (data.name !== undefined && data.name !== null && String(data.name).trim() !== '') {
      const name = String(data.name).trim()
      if (name.length < 2 || name.length > 20) {
        errors.push({ field: 'name', message: '姓名长度应为2-20个字符' })
      }
    }

    if (data.id_card !== undefined && data.id_card !== null && String(data.id_card).trim() !== '') {
      const idCard = String(data.id_card).trim()
      if (!ID_CARD_REGEX.test(idCard)) {
        errors.push({ field: 'id_card', message: '身份证号格式不正确，应为18位' })
      } else {
        const existing = driverRepository.findByIdCard(idCard)
        if (existing) {
          errors.push({ field: 'id_card', message: '该身份证号已存在' })
        }
      }
    }

    if (data.phone !== undefined && data.phone !== null && String(data.phone).trim() !== '') {
      const phone = String(data.phone).trim()
      if (!PHONE_REGEX.test(phone)) {
        errors.push({ field: 'phone', message: '手机号格式不正确' })
      }
    }

    if (data.gender !== undefined && data.gender !== null) {
      if (!['male', 'female'].includes(data.gender)) {
        errors.push({ field: 'gender', message: '性别值无效，应为male或female' })
      }
    }

    if (data.status !== undefined && data.status !== null) {
      if (!['active', 'leave', 'resigned'].includes(data.status)) {
        errors.push({ field: 'status', message: '状态值无效，应为active/leave/resigned' })
      }
    }

    if (data.experience_years !== undefined && data.experience_years !== null) {
      const num = Number(data.experience_years)
      if (isNaN(num) || num < 0) {
        errors.push({ field: 'experience_years', message: '工作经验年限不能小于0' })
      }
    }

    if (data.crane_id !== undefined && data.crane_id !== null && String(data.crane_id).trim() !== '') {
      const crane = craneRepository.findById(String(data.crane_id).trim())
      if (!crane) {
        errors.push({ field: 'crane_id', message: '指定的塔吊不存在' })
      }
    }

    return errors
  }

  createDriver(input: Partial<DriverCreateInput>): Driver {
    const validationErrors = this.validateCreateInput(input)
    if (validationErrors.length > 0) {
      throw new DriverValidationError(validationErrors)
    }

    const now = new Date().toISOString()
    const data: DriverCreateInput = {
      name: String(input.name!).trim(),
      gender: input.gender || 'male',
      id_card: String(input.id_card!).trim(),
      phone: String(input.phone!).trim(),
      emergency_contact: input.emergency_contact ? String(input.emergency_contact).trim() : undefined,
      emergency_phone: input.emergency_phone ? String(input.emergency_phone).trim() : undefined,
      address: input.address ? String(input.address).trim() : undefined,
      photo: input.photo ? String(input.photo).trim() : undefined,
      status: input.status || 'active',
      hire_date: String(input.hire_date!).trim(),
      leave_date: input.leave_date ? String(input.leave_date).trim() : undefined,
      experience_years: input.experience_years !== undefined ? Number(input.experience_years) : 0,
      crane_id: input.crane_id ? String(input.crane_id).trim() : undefined,
      created_at: now,
      updated_at: now,
    }

    return driverRepository.create(data)
  }

  private validateUpdateInput(id: string, data: Partial<DriverCreateInput>): ValidationError[] {
    const errors: ValidationError[] = []
    const existing = driverRepository.findById(id)

    if (!existing) {
      errors.push({ field: 'id', message: '驾驶员不存在' })
      return errors
    }

    if (data.name !== undefined && data.name !== null && String(data.name).trim() !== '') {
      const name = String(data.name).trim()
      if (name.length < 2 || name.length > 20) {
        errors.push({ field: 'name', message: '姓名长度应为2-20个字符' })
      }
    }

    if (data.id_card !== undefined && data.id_card !== null && String(data.id_card).trim() !== '') {
      const idCard = String(data.id_card).trim()
      if (!ID_CARD_REGEX.test(idCard)) {
        errors.push({ field: 'id_card', message: '身份证号格式不正确，应为18位' })
      } else {
        const duplicate = driverRepository.findByIdCard(idCard)
        if (duplicate && duplicate.id !== id) {
          errors.push({ field: 'id_card', message: '该身份证号已存在' })
        }
      }
    }

    if (data.phone !== undefined && data.phone !== null && String(data.phone).trim() !== '') {
      const phone = String(data.phone).trim()
      if (!PHONE_REGEX.test(phone)) {
        errors.push({ field: 'phone', message: '手机号格式不正确' })
      }
    }

    if (data.gender !== undefined && data.gender !== null) {
      if (!['male', 'female'].includes(data.gender)) {
        errors.push({ field: 'gender', message: '性别值无效，应为male或female' })
      }
    }

    if (data.status !== undefined && data.status !== null) {
      if (!['active', 'leave', 'resigned'].includes(data.status)) {
        errors.push({ field: 'status', message: '状态值无效，应为active/leave/resigned' })
      }
    }

    if (data.experience_years !== undefined && data.experience_years !== null) {
      const num = Number(data.experience_years)
      if (isNaN(num) || num < 0) {
        errors.push({ field: 'experience_years', message: '工作经验年限不能小于0' })
      }
    }

    if (data.crane_id !== undefined && data.crane_id !== null && String(data.crane_id).trim() !== '') {
      const crane = craneRepository.findById(String(data.crane_id).trim())
      if (!crane) {
        errors.push({ field: 'crane_id', message: '指定的塔吊不存在' })
      }
    }

    return errors
  }

  updateDriver(id: string, input: Partial<DriverCreateInput>): Driver {
    const validationErrors = this.validateUpdateInput(id, input)
    if (validationErrors.length > 0) {
      throw new DriverValidationError(validationErrors)
    }

    const existing = driverRepository.findById(id)
    if (!existing) {
      throw new DriverValidationError([{ field: 'id', message: '驾驶员不存在' }])
    }

    const updateData: Partial<DriverCreateInput> = {}
    const fields: Array<keyof DriverCreateInput> = [
      'name', 'gender', 'id_card', 'phone', 'emergency_contact', 'emergency_phone',
      'address', 'photo', 'status', 'hire_date', 'leave_date', 'experience_years', 'crane_id',
    ]

    for (const key of fields) {
      const val = input[key]
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val.trim() === '') continue
        if (typeof val === 'number') {
          ;(updateData as Record<string, unknown>)[key] = Number(val)
        } else {
          ;(updateData as Record<string, unknown>)[key] = typeof val === 'string' ? val.trim() : val
        }
      }
    }

    updateData.updated_at = new Date().toISOString()

    const updated = driverRepository.update(id, updateData)
    if (!updated) throw new Error('更新失败')
    return updated
  }

  deleteDriver(id: string): void {
    driverRepository.delete(id)
  }

  getCertificationsByDriverId(driverId: string): DriverCertification[] {
    return driverRepository.findCertificationsByDriverId(driverId)
  }

  private validateCertificationCreate(data: Partial<Omit<DriverCertification, 'id'>>): ValidationError[] {
    const errors: ValidationError[] = []

    const requiredFields: Array<keyof Omit<DriverCertification, 'id' | 'created_at' | 'updated_at' | 'status' | 'remark'>> = [
      'cert_type', 'cert_number', 'issue_authority', 'issue_date', 'expiry_date', 'driver_id',
    ]
    for (const field of requiredFields) {
      const val = data[field]
      if (val === undefined || val === null || val === '') {
        errors.push({ field, message: '该字段为必填项' })
      }
    }

    if (data.cert_type !== undefined && data.cert_type !== null && String(data.cert_type).trim() !== '') {
      if (!VALID_CERT_TYPES.includes(data.cert_type)) {
        errors.push({ field: 'cert_type', message: '证书类型无效，应为tower_crane_operator/safety_training/special_operation/aerial_work' })
      }
    }

    if (data.issue_date && data.expiry_date) {
      const issueDate = new Date(String(data.issue_date))
      const expiryDate = new Date(String(data.expiry_date))
      if (!isNaN(issueDate.getTime()) && !isNaN(expiryDate.getTime()) && expiryDate <= issueDate) {
        errors.push({ field: 'expiry_date', message: '有效期必须晚于发证日期' })
      }
    }

    return errors
  }

  createCertification(data: Partial<Omit<DriverCertification, 'id'>>): DriverCertification {
    const validationErrors = this.validateCertificationCreate(data)
    if (validationErrors.length > 0) {
      throw new DriverValidationError(validationErrors)
    }

    const now = new Date().toISOString()
    const certData: Omit<DriverCertification, 'id'> = {
      driver_id: String(data.driver_id!).trim(),
      cert_type: String(data.cert_type!).trim(),
      cert_number: String(data.cert_number!).trim(),
      issue_authority: String(data.issue_authority!).trim(),
      issue_date: String(data.issue_date!).trim(),
      expiry_date: String(data.expiry_date!).trim(),
      status: data.status || 'valid',
      remark: data.remark ? String(data.remark).trim() : undefined,
      created_at: now,
      updated_at: now,
    }

    return driverRepository.createCertification(certData)
  }

  updateCertification(id: string, data: Partial<Omit<DriverCertification, 'id'>>): DriverCertification {
    const existing = driverRepository.findCertificationById(id)
    if (!existing) {
      throw new DriverValidationError([{ field: 'id', message: '证书不存在' }])
    }

    if (data.cert_type !== undefined && data.cert_type !== null && String(data.cert_type).trim() !== '') {
      if (!VALID_CERT_TYPES.includes(data.cert_type)) {
        throw new DriverValidationError([{ field: 'cert_type', message: '证书类型无效' }])
      }
    }

    if (data.issue_date || data.expiry_date) {
      const issueDate = data.issue_date ? String(data.issue_date) : existing.issue_date
      const expiryDate = data.expiry_date ? String(data.expiry_date) : existing.expiry_date
      const issue = new Date(issueDate)
      const expiry = new Date(expiryDate)
      if (!isNaN(issue.getTime()) && !isNaN(expiry.getTime()) && expiry <= issue) {
        throw new DriverValidationError([{ field: 'expiry_date', message: '有效期必须晚于发证日期' }])
      }
    }

    const updateData: Partial<Omit<DriverCertification, 'id'>> = { ...data, updated_at: new Date().toISOString() }
    const updated = driverRepository.updateCertification(id, updateData)
    if (!updated) throw new Error('更新失败')
    return updated
  }

  deleteCertification(id: string): void {
    driverRepository.deleteCertification(id)
  }

  getExpiringCerts(daysBeforeExpiry = 30): DriverCertification[] {
    return driverRepository.findExpiringCerts(daysBeforeExpiry)
  }

  getWorkRecordsByDriverId(driverId: string, limit?: number): DriverWorkRecord[] {
    return driverRepository.findWorkRecordsByDriverId(driverId, limit)
  }

  createWorkRecord(data: Partial<Omit<DriverWorkRecord, 'id'>>): DriverWorkRecord {
    const errors: ValidationError[] = []
    const requiredFields: Array<keyof Omit<DriverWorkRecord, 'id' | 'created_at' | 'work_content' | 'remark'>> = [
      'driver_id', 'crane_id', 'work_date', 'start_time', 'end_time', 'work_type', 'load_count', 'max_load',
    ]
    for (const field of requiredFields) {
      const val = data[field]
      if (val === undefined || val === null || val === '') {
        errors.push({ field, message: '该字段为必填项' })
      }
    }
    if (errors.length > 0) {
      throw new DriverValidationError(errors)
    }

    const workData: Omit<DriverWorkRecord, 'id'> = {
      driver_id: String(data.driver_id!).trim(),
      crane_id: String(data.crane_id!).trim(),
      work_date: String(data.work_date!).trim(),
      start_time: String(data.start_time!).trim(),
      end_time: String(data.end_time!).trim(),
      work_type: data.work_type!,
      work_content: data.work_content ? String(data.work_content).trim() : undefined,
      load_count: Number(data.load_count),
      max_load: Number(data.max_load),
      remark: data.remark ? String(data.remark).trim() : undefined,
      created_at: new Date().toISOString(),
    }

    return driverRepository.createWorkRecord(workData)
  }

  getWorkStats(driverId: string, startDate: string, endDate: string): { total_days: number; total_load_count: number; max_load: number; overtime_days: number; holiday_days: number } {
    return driverRepository.findWorkStatsByDriverId(driverId, startDate, endDate)
  }

  getSchedulesByDriverId(driverId: string, startDate?: string, endDate?: string): DriverSchedule[] {
    return driverRepository.findSchedulesByDriverId(driverId, startDate, endDate)
  }

  getSchedulesByDate(date: string): DriverSchedule[] {
    return driverRepository.findSchedulesByDate(date)
  }

  createSchedule(data: Partial<Omit<DriverSchedule, 'id'>>): DriverSchedule {
    const errors: ValidationError[] = []
    const requiredFields: Array<keyof Omit<DriverSchedule, 'id' | 'created_at' | 'updated_at' | 'remark' | 'status'>> = [
      'driver_id', 'crane_id', 'schedule_date', 'shift_type', 'start_time', 'end_time',
    ]
    for (const field of requiredFields) {
      const val = data[field]
      if (val === undefined || val === null || val === '') {
        errors.push({ field, message: '该字段为必填项' })
      }
    }
    if (errors.length > 0) {
      throw new DriverValidationError(errors)
    }

    const conflicts = driverRepository.findScheduleConflicts(
      String(data.driver_id!).trim(),
      String(data.schedule_date!).trim(),
      data.shift_type!,
    )
    if (conflicts.length > 0) {
      throw new DriverValidationError([{ field: 'schedule_date', message: '该驾驶员在此日期和班次已有排班' }])
    }

    const now = new Date().toISOString()
    const scheduleData: Omit<DriverSchedule, 'id'> = {
      driver_id: String(data.driver_id!).trim(),
      crane_id: String(data.crane_id!).trim(),
      schedule_date: String(data.schedule_date!).trim(),
      shift_type: data.shift_type!,
      start_time: String(data.start_time!).trim(),
      end_time: String(data.end_time!).trim(),
      status: data.status || 'scheduled',
      remark: data.remark ? String(data.remark).trim() : undefined,
      created_at: now,
      updated_at: now,
    }

    return driverRepository.createSchedule(scheduleData)
  }

  updateSchedule(id: string, data: Partial<Omit<DriverSchedule, 'id'>>): DriverSchedule {
    const updated = driverRepository.updateSchedule(id, { ...data, updated_at: new Date().toISOString() })
    if (!updated) throw new DriverValidationError([{ field: 'id', message: '排班不存在' }])
    return updated
  }

  deleteSchedule(id: string): void {
    driverRepository.deleteSchedule(id)
  }

  getTrainingsByDriverId(driverId: string): DriverTraining[] {
    return driverRepository.findTrainingsByDriverId(driverId)
  }

  createTraining(data: Partial<Omit<DriverTraining, 'id'>>): DriverTraining {
    const errors: ValidationError[] = []
    const requiredFields: Array<keyof Omit<DriverTraining, 'id' | 'created_at' | 'updated_at' | 'trainer' | 'training_org' | 'score' | 'remark'>> = [
      'driver_id', 'training_type', 'training_name', 'training_date', 'duration_hours', 'result',
    ]
    for (const field of requiredFields) {
      const val = data[field]
      if (val === undefined || val === null || val === '') {
        errors.push({ field, message: '该字段为必填项' })
      }
    }

    if (data.result !== undefined && data.result !== null) {
      if (!VALID_TRAINING_RESULTS.includes(data.result)) {
        errors.push({ field: 'result', message: '培训结果无效，应为pending/passed/failed' })
      }
    }

    if (errors.length > 0) {
      throw new DriverValidationError(errors)
    }

    const now = new Date().toISOString()
    const trainingData: Omit<DriverTraining, 'id'> = {
      driver_id: String(data.driver_id!).trim(),
      training_type: data.training_type!,
      training_name: String(data.training_name!).trim(),
      training_date: String(data.training_date!).trim(),
      duration_hours: Number(data.duration_hours),
      trainer: data.trainer ? String(data.trainer).trim() : undefined,
      training_org: data.training_org ? String(data.training_org).trim() : undefined,
      result: data.result!,
      score: data.score !== undefined ? Number(data.score) : undefined,
      remark: data.remark ? String(data.remark).trim() : undefined,
      created_at: now,
      updated_at: now,
    }

    return driverRepository.createTraining(trainingData)
  }

  updateTraining(id: string, data: Partial<Omit<DriverTraining, 'id'>>): DriverTraining {
    if (data.result !== undefined && data.result !== null) {
      if (!VALID_TRAINING_RESULTS.includes(data.result)) {
        throw new DriverValidationError([{ field: 'result', message: '培训结果无效' }])
      }
    }

    const updated = driverRepository.updateTraining(id, { ...data, updated_at: new Date().toISOString() })
    if (!updated) throw new DriverValidationError([{ field: 'id', message: '培训记录不存在' }])
    return updated
  }

  deleteTraining(id: string): void {
    driverRepository.deleteTraining(id)
  }
}

export const driverService = new DriverService()
