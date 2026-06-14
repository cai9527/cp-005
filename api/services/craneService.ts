import { craneRepository, type Crane, type CraneWithSensors, type CraneCreateInput } from '../repositories/craneRepository.js'
import { getDatabase } from '../db/database.js'

export interface ValidationError {
  field: string
  message: string
}

export class CraneValidationError extends Error {
  public errors: ValidationError[]
  constructor(errors: ValidationError[]) {
    super('Validation failed')
    this.errors = errors
    this.name = 'CraneValidationError'
  }
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const SERIAL_NUMBER_REGEX = /^[A-Za-z0-9-]{3,50}$/
const REGISTRATION_REGEX = /^[\u4e00-\u9fa5A-Za-z0-9-]{3,30}$/

class CraneService {
  getAllCranes(): Crane[] {
    return craneRepository.findAll()
  }

  getCraneById(id: string): Crane | undefined {
    return craneRepository.findById(id)
  }

  getCraneDetail(id: string): CraneWithSensors | undefined {
    return craneRepository.findByIdWithSensors(id)
  }

  getCraneStats(): { total: number; online: number; offline: number; alarm: number } {
    const cranes = this.getAllCranes()
    return {
      total: cranes.length,
      online: cranes.filter((c) => c.status === 'online').length,
      offline: cranes.filter((c) => c.status === 'offline').length,
      alarm: cranes.filter((c) => c.status === 'alarm').length,
    }
  }

  updateCraneStatus(id: string, status: Crane['status']): void {
    craneRepository.updateStatus(id, status)
  }

  validateCreateInput(data: Partial<CraneCreateInput>): ValidationError[] {
    const errors: ValidationError[] = []

    const requiredFields: Array<keyof CraneCreateInput> = [
      'name', 'model', 'location_x', 'location_y',
      'max_load', 'max_moment', 'max_radius', 'max_height',
      'install_date', 'last_maintenance',
    ]
    for (const field of requiredFields) {
      const val = data[field]
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
        errors.push({ field, message: '该字段为必填项' })
      }
    }

    if (data.name !== undefined && data.name !== null) {
      const name = String(data.name).trim()
      if (name.length < 2) errors.push({ field: 'name', message: '设备名称至少2个字符' })
      if (name.length > 50) errors.push({ field: 'name', message: '设备名称不超过50个字符' })
      const existing = craneRepository.findByName(name)
      if (existing) errors.push({ field: 'name', message: '设备名称已存在，请使用其他名称' })
    }

    if (data.model !== undefined && data.model !== null && String(data.model).trim() !== '') {
      const model = String(data.model).trim()
      if (model.length > 30) errors.push({ field: 'model', message: '型号不超过30个字符' })
    }

    if (data.status !== undefined && data.status !== null) {
      if (!['online', 'offline', 'alarm'].includes(data.status)) {
        errors.push({ field: 'status', message: '设备状态值无效' })
      }
    }

    const validateNumber = (
      field: keyof CraneCreateInput,
      label: string,
      min?: number,
      max?: number,
      allowZero = true
    ) => {
      const val = data[field]
      if (val === undefined || val === null) return
      const num = Number(val)
      if (isNaN(num)) {
        errors.push({ field, message: `${label}必须是有效数字` })
        return
      }
      if (min !== undefined && num < min && (!allowZero || num !== 0)) {
        errors.push({ field, message: `${label}不能小于${min}` })
      }
      if (max !== undefined && num > max) {
        errors.push({ field, message: `${label}不能大于${max}` })
      }
    }

    validateNumber('location_x', 'X坐标', 0, 100)
    validateNumber('location_y', 'Y坐标', 0, 100)
    validateNumber('max_load', '最大起重量', 0.5, 100, false)
    validateNumber('max_moment', '额定起重力矩', 5, 1000, false)
    validateNumber('max_radius', '最大工作幅度', 5, 150, false)
    validateNumber('max_height', '最大起升高度', 5, 500, false)
    validateNumber('min_radius', '最小工作幅度', 0.5, 20, false)
    validateNumber('tip_load', '臂端额定载荷', 0.1, 50, false)
    validateNumber('hoist_speed', '起升速度', 1, 200, false)
    validateNumber('slewing_speed', '回转速度', 0.1, 2, false)
    validateNumber('trolley_speed', '变幅速度', 5, 100, false)
    validateNumber('motor_power', '电机功率', 1, 500, false)
    validateNumber('total_weight', '整机自重', 1, 500, false)
    validateNumber('jib_weight', '起重臂自重', 0.5, 100, false)
    validateNumber('counterweight', '平衡重', 0.5, 200, false)
    validateNumber('free_standing_height', '独立高度', 5, 300, false)
    validateNumber('max_anchored_height', '最大附着高度', 5, 600, false)
    validateNumber('working_temp_min', '工作温度下限', -50, 10)
    validateNumber('working_temp_max', '工作温度上限', 0, 80)
    validateNumber('max_wind_operational', '工作风速', 1, 30, false)
    validateNumber('max_wind_nonoperational', '非工作风速', 5, 60, false)

    if (
      data.min_radius !== undefined && data.max_radius !== undefined &&
      !isNaN(Number(data.min_radius)) && !isNaN(Number(data.max_radius))
    ) {
      if (Number(data.min_radius) >= Number(data.max_radius)) {
        errors.push({ field: 'min_radius', message: '最小工作幅度必须小于最大工作幅度' })
      }
    }
    if (
      data.working_temp_min !== undefined && data.working_temp_max !== undefined &&
      !isNaN(Number(data.working_temp_min)) && !isNaN(Number(data.working_temp_max))
    ) {
      if (Number(data.working_temp_min) >= Number(data.working_temp_max)) {
        errors.push({ field: 'working_temp_min', message: '工作温度下限必须小于上限' })
      }
    }
    if (
      data.max_wind_operational !== undefined && data.max_wind_nonoperational !== undefined &&
      !isNaN(Number(data.max_wind_operational)) && !isNaN(Number(data.max_wind_nonoperational))
    ) {
      if (Number(data.max_wind_operational) >= Number(data.max_wind_nonoperational)) {
        errors.push({ field: 'max_wind_operational', message: '工作风速必须小于非工作风速' })
      }
    }

    const validateDate = (field: keyof CraneCreateInput, label: string, allowFuture = true) => {
      const val = data[field]
      if (val === undefined || val === null || String(val).trim() === '') return
      const dateStr = String(val).trim()
      if (!DATE_REGEX.test(dateStr)) {
        errors.push({ field, message: `${label}格式错误，请使用YYYY-MM-DD` })
        return
      }
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) {
        errors.push({ field, message: `${label}不是有效日期` })
        return
      }
      if (!allowFuture && d > new Date()) {
        errors.push({ field, message: `${label}不能晚于今天` })
      }
    }

    validateDate('install_date', '安装日期', true)
    validateDate('last_maintenance', '最近维保日期', true)
    validateDate('production_date', '出厂日期', false)

    if (
      data.production_date && data.install_date &&
      DATE_REGEX.test(String(data.production_date)) &&
      DATE_REGEX.test(String(data.install_date))
    ) {
      if (new Date(String(data.production_date)) > new Date(String(data.install_date))) {
        errors.push({ field: 'install_date', message: '安装日期不能早于出厂日期' })
      }
    }

    if (data.serial_number !== undefined && data.serial_number !== null && String(data.serial_number).trim() !== '') {
      const sn = String(data.serial_number).trim()
      if (!SERIAL_NUMBER_REGEX.test(sn)) {
        errors.push({ field: 'serial_number', message: '出厂编号仅支持字母、数字和连字符（3-50位）' })
      } else {
        const existing = craneRepository.findBySerialNumber(sn)
        if (existing) errors.push({ field: 'serial_number', message: '该出厂编号已登记' })
      }
    }

    if (data.registration_number !== undefined && data.registration_number !== null && String(data.registration_number).trim() !== '') {
      const rn = String(data.registration_number).trim()
      if (!REGISTRATION_REGEX.test(rn)) {
        errors.push({ field: 'registration_number', message: '备案登记号格式不合法（3-30位中文、字母、数字或连字符）' })
      } else {
        const existing = craneRepository.findByRegistrationNumber(rn)
        if (existing) errors.push({ field: 'registration_number', message: '该备案登记号已存在' })
      }
    }

    const validateText = (field: keyof CraneCreateInput, label: string, maxLen: number) => {
      const val = data[field]
      if (val === undefined || val === null || String(val).trim() === '') return
      if (String(val).length > maxLen) {
        errors.push({ field, message: `${label}不超过${maxLen}个字符` })
      }
    }

    validateText('manufacturer', '生产厂家', 50)
    validateText('project_name', '项目名称', 100)
    validateText('construction_unit', '施工单位', 100)
    validateText('power_supply', '电源要求', 30)

    return errors
  }

  createCrane(input: Partial<CraneCreateInput>): Crane {
    const validationErrors = this.validateCreateInput(input)
    if (validationErrors.length > 0) {
      throw new CraneValidationError(validationErrors)
    }

    const data: CraneCreateInput = {
      name: String(input.name!).trim(),
      model: String(input.model!).trim(),
      status: (input.status as Crane['status']) || 'offline',
      location_x: Number(input.location_x),
      location_y: Number(input.location_y),
      max_load: Number(input.max_load),
      max_moment: Number(input.max_moment),
      max_radius: Number(input.max_radius),
      max_height: Number(input.max_height),
      install_date: String(input.install_date!).trim(),
      last_maintenance: String(input.last_maintenance!).trim(),
    }

    const optionalFields: Array<keyof CraneCreateInput> = [
      'manufacturer', 'serial_number', 'production_date', 'project_name',
      'construction_unit', 'registration_number', 'min_radius', 'tip_load',
      'hoist_speed', 'slewing_speed', 'trolley_speed', 'motor_power',
      'total_weight', 'jib_weight', 'counterweight', 'free_standing_height',
      'max_anchored_height', 'working_temp_min', 'working_temp_max',
      'max_wind_operational', 'max_wind_nonoperational', 'power_supply',
    ]

    for (const key of optionalFields) {
      const val = input[key]
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        if (typeof val === 'number') {
          ;(data as Record<string, unknown>)[key] = Number(val)
        } else {
          ;(data as Record<string, unknown>)[key] = typeof val === 'string' ? val.trim() : val
        }
      }
    }

    const db = getDatabase()
    const tx = db.transaction(() => {
      const crane = craneRepository.create(data)
      craneRepository.createSensorsForCrane(crane.id, data)
      craneRepository.createDefaultRulesForCrane(crane.id, data)
      return crane
    })

    return tx()
  }
}

export const craneService = new CraneService()
