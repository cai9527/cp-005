import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import { useCraneStore, type CraneCreateInput, type ValidationFieldError } from '@/stores/craneStore'
import {
  Building2, Factory, Hash, Calendar, MapPin, Weight, Ruler, Gauge,
  Thermometer, Wind, Zap, AlertTriangle, CheckCircle, X,
  Info, Package, ArrowRight, CircleDot
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddCraneModalProps {
  isOpen: boolean
  onClose: () => void
}

type FormState = Partial<CraneCreateInput>
type FormErrors = Record<string, string>
type TouchedState = Record<string, boolean>

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const validateField = (name: string, value: unknown, form: FormState): string => {
  const strVal = typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value)
  const numVal = typeof value === 'number' ? value : (strVal === '' ? NaN : Number(strVal))

  const requiredFields: Record<string, string> = {
    name: '设备名称',
    model: '型号规格',
    location_x: 'X坐标',
    location_y: 'Y坐标',
    max_load: '最大起重量',
    max_moment: '额定起重力矩',
    max_radius: '最大工作幅度',
    max_height: '最大起升高度',
    install_date: '安装日期',
    last_maintenance: '最近维保日期',
  }

  if (name in requiredFields) {
    if (strVal === '' || (typeof value === 'number' && isNaN(value))) {
      return `${requiredFields[name]}为必填项`
    }
  }

  switch (name) {
    case 'name': {
      const v = strVal.trim()
      if (v.length < 2) return '设备名称至少2个字符'
      if (v.length > 50) return '设备名称不超过50个字符'
      return ''
    }
    case 'model': {
      const v = strVal.trim()
      if (v && v.length > 30) return '型号不超过30个字符'
      return ''
    }
    case 'serial_number': {
      const v = strVal.trim()
      if (!v) return ''
      if (v.length < 3) return '出厂编号至少3个字符'
      if (v.length > 50) return '出厂编号不超过50个字符'
      if (!/^[A-Za-z0-9-]+$/.test(v)) return '仅支持字母、数字和连字符'
      return ''
    }
    case 'registration_number': {
      const v = strVal.trim()
      if (!v) return ''
      if (v.length < 3) return '备案登记号至少3个字符'
      if (v.length > 30) return '备案登记号不超过30个字符'
      if (!/^[\u4e00-\u9fa5A-Za-z0-9-]+$/.test(v)) return '仅支持中文、字母、数字和连字符'
      return ''
    }
    case 'location_x':
    case 'location_y':
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 0) return '坐标不能小于0'
      if (numVal > 100) return '坐标不能大于100'
      return ''
    case 'max_load':
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 0.5) return '至少0.5吨'
      if (numVal > 100) return '不超过100吨'
      return ''
    case 'max_moment':
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 5) return '至少5 t·m'
      if (numVal > 1000) return '不超过1000 t·m'
      return ''
    case 'max_radius':
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 5) return '至少5米'
      if (numVal > 150) return '不超过150米'
      return ''
    case 'min_radius': {
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 0.5) return '至少0.5米'
      if (numVal > 20) return '不超过20米'
      const maxR = Number(form.max_radius)
      if (!isNaN(maxR) && numVal >= maxR) return '必须小于最大工作幅度'
      return ''
    }
    case 'tip_load':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 0.1) return '至少0.1吨'
      if (numVal > 50) return '不超过50吨'
      return ''
    case 'max_height':
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 5) return '至少5米'
      if (numVal > 500) return '不超过500米'
      return ''
    case 'free_standing_height':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 5) return '至少5米'
      if (numVal > 300) return '不超过300米'
      return ''
    case 'max_anchored_height':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 5) return '至少5米'
      if (numVal > 600) return '不超过600米'
      return ''
    case 'hoist_speed':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 1) return '至少1 m/min'
      if (numVal > 200) return '不超过200 m/min'
      return ''
    case 'slewing_speed':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 0.1) return '至少0.1 r/min'
      if (numVal > 2) return '不超过2 r/min'
      return ''
    case 'trolley_speed':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 5) return '至少5 m/min'
      if (numVal > 100) return '不超过100 m/min'
      return ''
    case 'motor_power':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 1) return '至少1 kW'
      if (numVal > 500) return '不超过500 kW'
      return ''
    case 'total_weight':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 1) return '至少1吨'
      if (numVal > 500) return '不超过500吨'
      return ''
    case 'jib_weight':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 0.5) return '至少0.5吨'
      if (numVal > 100) return '不超过100吨'
      return ''
    case 'counterweight':
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 0.5) return '至少0.5吨'
      if (numVal > 200) return '不超过200吨'
      return ''
    case 'working_temp_min': {
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < -50) return '不能低于-50°C'
      if (numVal > 10) return '不能高于10°C'
      const maxT = Number(form.working_temp_max)
      if (!isNaN(maxT) && numVal >= maxT) return '必须低于温度上限'
      return ''
    }
    case 'working_temp_max': {
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 0) return '不能低于0°C'
      if (numVal > 80) return '不能高于80°C'
      const minT = Number(form.working_temp_min)
      if (!isNaN(minT) && numVal <= minT) return '必须高于温度下限'
      return ''
    }
    case 'max_wind_operational': {
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 1) return '至少1 m/s'
      if (numVal > 30) return '不超过30 m/s'
      const nonOp = Number(form.max_wind_nonoperational)
      if (!isNaN(nonOp) && numVal >= nonOp) return '必须小于非工作风速'
      return ''
    }
    case 'max_wind_nonoperational': {
      if (!strVal) return ''
      if (isNaN(numVal)) return '请输入有效数字'
      if (numVal < 5) return '至少5 m/s'
      if (numVal > 60) return '不超过60 m/s'
      const op = Number(form.max_wind_operational)
      if (!isNaN(op) && numVal <= op) return '必须大于工作风速'
      return ''
    }
    case 'install_date':
    case 'last_maintenance':
    case 'production_date': {
      if (!strVal) {
        if (name === 'production_date') return ''
        return requiredFields[name] ? `${requiredFields[name]}为必填项` : ''
      }
      if (!DATE_REGEX.test(strVal)) return '请使用YYYY-MM-DD格式'
      const d = new Date(strVal)
      if (isNaN(d.getTime())) return '不是有效日期'
      if (name === 'production_date' && d > new Date()) return '不能晚于今天'
      if (name === 'install_date') {
        const prod = String(form.production_date || '')
        if (DATE_REGEX.test(prod) && new Date(prod) > d) return '不能早于出厂日期'
      }
      return ''
    }
    case 'manufacturer':
      return strVal.length > 50 ? '不超过50个字符' : ''
    case 'project_name':
      return strVal.length > 100 ? '不超过100个字符' : ''
    case 'construction_unit':
      return strVal.length > 100 ? '不超过100个字符' : ''
    case 'power_supply':
      return strVal.length > 30 ? '不超过30个字符' : ''
    default:
      return ''
  }
}

interface FieldProps {
  label: string
  name: string
  type?: string
  placeholder?: string
  icon?: React.ReactNode
  unit?: string
  required?: boolean
  hint?: string
  value: string | number | undefined
  onChange: (name: string, value: string) => void
  onBlur: (name: string) => void
  error: string
  touched: boolean
  inputClassName?: string
}

const FormField = ({
  label, name, type = 'text', placeholder, icon, unit, required, hint,
  value, onChange, onBlur, error, touched, inputClassName = ''
}: FieldProps) => {
  const hasError = touched && error
  const inputValue = value === undefined || value === null ? '' : value
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">
        {label} {required && <span className="text-accent-danger">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={inputValue}
          placeholder={placeholder}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value)}
          onBlur={() => onBlur(name)}
          className={cn(
            'w-full h-10 rounded-lg bg-bg-tertiary/50 border transition-all outline-none text-sm text-text-primary placeholder:text-text-muted/60',
            icon ? 'pl-9' : 'pl-3',
            unit ? 'pr-12' : 'pr-3',
            hasError
              ? 'border-accent-danger focus:border-accent-danger focus:ring-2 focus:ring-accent-danger/20'
              : 'border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20',
            inputClassName
          )}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-medium">
            {unit}
          </span>
        )}
      </div>
      {hint && !hasError && (
        <p className="mt-1 text-xs text-text-muted flex items-center gap-1">
          <Info className="w-3 h-3" />
          {hint}
        </p>
      )}
      {hasError && (
        <p className="mt-1 text-xs text-accent-danger flex items-center gap-1 animate-in fade-in">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

const SectionTitle = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) => (
  <div className="flex items-start gap-3 pb-3 mb-4 border-b border-border-primary">
    <div className="p-1.5 rounded-lg bg-accent-primary/10 text-accent-primary">
      {icon}
    </div>
    <div>
      <h4 className="font-semibold text-text-primary text-sm">{title}</h4>
      {desc && <p className="text-xs text-text-muted mt-0.5">{desc}</p>}
    </div>
  </div>
)

export default function AddCraneModal({ isOpen, onClose }: AddCraneModalProps) {
  const createCrane = useCraneStore((s) => s.createCrane)
  const creating = useCraneStore((s) => s.creating)

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<FormState>({
    name: '',
    model: '',
    status: 'offline',
    location_x: 50,
    location_y: 50,
    max_load: undefined,
    max_moment: undefined,
    max_radius: undefined,
    max_height: undefined,
    install_date: today,
    last_maintenance: today,
    manufacturer: '',
    serial_number: '',
    production_date: '',
    project_name: '',
    construction_unit: '',
    registration_number: '',
    min_radius: 2.5,
    tip_load: undefined,
    hoist_speed: undefined,
    slewing_speed: undefined,
    trolley_speed: undefined,
    motor_power: undefined,
    total_weight: undefined,
    jib_weight: undefined,
    counterweight: undefined,
    free_standing_height: undefined,
    max_anchored_height: undefined,
    working_temp_min: -20,
    working_temp_max: 40,
    max_wind_operational: 12,
    max_wind_nonoperational: 30,
    power_supply: '380V/50Hz',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<TouchedState>({})
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState<0 | 1 | 2>(0)

  const handleChange = useCallback((name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setSubmitError('')
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value, form) }))
    }
    const crossFields = [
      { field: 'min_radius', depends: 'max_radius' },
      { field: 'max_radius', depends: 'min_radius' },
      { field: 'working_temp_min', depends: 'working_temp_max' },
      { field: 'working_temp_max', depends: 'working_temp_min' },
      { field: 'max_wind_operational', depends: 'max_wind_nonoperational' },
      { field: 'max_wind_nonoperational', depends: 'max_wind_operational' },
      { field: 'install_date', depends: 'production_date' },
      { field: 'production_date', depends: 'install_date' },
    ]
    const cross = crossFields.find((c) => c.field === name || c.depends === name)
    if (cross) {
      const other = cross.field === name ? cross.depends : cross.field
      if (touched[other]) {
        setErrors((prev) => ({
          ...prev,
          [other]: validateField(other, form[other as keyof FormState], { ...form, [name]: value }),
        }))
      }
    }
  }, [form, touched])

  const handleBlur = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, form[name as keyof FormState], form) }))
  }, [form])

  const validateSection = (section: 0 | 1 | 2): boolean => {
    const sections: Record<0 | 1 | 2, string[]> = {
      0: ['name', 'model', 'manufacturer', 'serial_number', 'production_date',
        'registration_number', 'project_name', 'construction_unit',
        'install_date', 'last_maintenance', 'location_x', 'location_y'],
      1: ['max_load', 'max_moment', 'max_radius', 'min_radius', 'max_height',
        'tip_load', 'free_standing_height', 'max_anchored_height',
        'hoist_speed', 'slewing_speed', 'trolley_speed', 'motor_power'],
      2: ['total_weight', 'jib_weight', 'counterweight',
        'working_temp_min', 'working_temp_max',
        'max_wind_operational', 'max_wind_nonoperational', 'power_supply'],
    }
    const fields = sections[section]
    const newErrors: FormErrors = {}
    fields.forEach((f) => {
      newErrors[f] = validateField(f, form[f as keyof FormState], form)
    })
    setErrors((prev) => ({ ...prev, ...newErrors }))
    setTouched((prev) => fields.reduce((acc, f) => ({ ...acc, [f]: true }), prev))
    return !fields.some((f) => newErrors[f])
  }

  const validateAll = (): boolean => {
    const allFields = [
      'name', 'model', 'manufacturer', 'serial_number', 'production_date',
      'registration_number', 'project_name', 'construction_unit',
      'install_date', 'last_maintenance', 'location_x', 'location_y',
      'max_load', 'max_moment', 'max_radius', 'min_radius', 'max_height',
      'tip_load', 'free_standing_height', 'max_anchored_height',
      'hoist_speed', 'slewing_speed', 'trolley_speed', 'motor_power',
      'total_weight', 'jib_weight', 'counterweight',
      'working_temp_min', 'working_temp_max',
      'max_wind_operational', 'max_wind_nonoperational', 'power_supply',
    ]
    const newErrors: FormErrors = {}
    allFields.forEach((f) => {
      newErrors[f] = validateField(f, form[f as keyof FormState], form)
    })
    setErrors(newErrors)
    setTouched(allFields.reduce((acc, f) => ({ ...acc, [f]: true }), {}))
    return !allFields.some((f) => newErrors[f])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    if (!validateAll()) {
      const firstErr = Object.entries(errors).find(([k, v]) => v && touched[k])
      if (firstErr) {
        const sections: Record<number, string[]> = {
          0: ['name', 'model', 'manufacturer', 'serial_number', 'production_date',
            'registration_number', 'project_name', 'construction_unit',
            'install_date', 'last_maintenance', 'location_x', 'location_y'],
          1: ['max_load', 'max_moment', 'max_radius', 'min_radius', 'max_height',
            'tip_load', 'free_standing_height', 'max_anchored_height',
            'hoist_speed', 'slewing_speed', 'trolley_speed', 'motor_power'],
          2: ['total_weight', 'jib_weight', 'counterweight',
            'working_temp_min', 'working_temp_max',
            'max_wind_operational', 'max_wind_nonoperational', 'power_supply'],
        }
        for (let i = 0; i < 3; i++) {
          if (sections[i].includes(firstErr[0])) {
            setActiveSection(i as 0 | 1 | 2)
            break
          }
        }
      }
      return
    }

    const submitData: Partial<CraneCreateInput> = {}
    for (const key of Object.keys(form) as Array<keyof FormState>) {
      const val = form[key]
      if (val === undefined || val === null) continue
      if (typeof val === 'string') {
        const trimmed = val.trim()
        if (trimmed === '') continue
        ;(submitData as Record<string, unknown>)[key] = trimmed
      } else {
        ;(submitData as Record<string, unknown>)[key] = val
      }
    }

    const result = await createCrane(submitData)

    if (result.success) {
      setSubmitSuccess(true)
      setTimeout(() => {
        handleReset()
        onClose()
      }, 1500)
    } else {
      if (result.fieldErrors && result.fieldErrors.length > 0) {
        const fieldErrMap: FormErrors = {}
        result.fieldErrors.forEach((e: ValidationFieldError) => {
          fieldErrMap[e.field] = e.message
        })
        setErrors((prev) => ({ ...prev, ...fieldErrMap }))
        setTouched((prev) => result.fieldErrors!.reduce((acc, e) => ({ ...acc, [e.field]: true }), prev))
      }
      setSubmitError(result.error || '创建设备失败，请检查输入')
    }
  }

  const handleReset = () => {
    const td = new Date().toISOString().split('T')[0]
    setForm({
      name: '', model: '', status: 'offline',
      location_x: 50, location_y: 50,
      max_load: undefined, max_moment: undefined, max_radius: undefined, max_height: undefined,
      install_date: td, last_maintenance: td,
      manufacturer: '', serial_number: '', production_date: '',
      project_name: '', construction_unit: '', registration_number: '',
      min_radius: 2.5, tip_load: undefined, hoist_speed: undefined, slewing_speed: undefined,
      trolley_speed: undefined, motor_power: undefined, total_weight: undefined, jib_weight: undefined,
      counterweight: undefined, free_standing_height: undefined, max_anchored_height: undefined,
      working_temp_min: -20, working_temp_max: 40,
      max_wind_operational: 12, max_wind_nonoperational: 30,
      power_supply: '380V/50Hz',
    })
    setErrors({})
    setTouched({})
    setSubmitError('')
    setSubmitSuccess(false)
    setActiveSection(0)
  }

  const sectionTabs = [
    { key: 'basic', label: '基本信息', icon: <Building2 className="w-4 h-4" /> },
    { key: 'tech', label: '性能参数', icon: <Gauge className="w-4 h-4" /> },
    { key: 'env', label: '环境与重量', icon: <Wind className="w-4 h-4" /> },
  ] as const

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!creating) {
          handleReset()
          onClose()
        }
      }}
      title="添加塔机设备"
      maxWidth="max-w-3xl"
    >
      {submitSuccess && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-accent-secondary/10 border border-accent-secondary/30 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-accent-secondary flex-shrink-0 mt-0.5" />
          <span className="text-sm text-accent-secondary">设备创建成功！正在返回...</span>
        </div>
      )}

      {submitError && !submitSuccess && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-accent-danger/10 border border-accent-danger/30 flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-accent-danger flex-shrink-0 mt-0.5" />
          <span className="text-sm text-accent-danger">{submitError}</span>
        </div>
      )}

      <div className="flex gap-2 p-1 mb-5 bg-bg-tertiary/50 rounded-lg border border-border-primary">
        {sectionTabs.map((tab, idx) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => activeSection >= idx && setActiveSection(idx as 0 | 1 | 2)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all',
              activeSection === idx
                ? 'bg-bg-secondary text-accent-primary border border-accent-primary/30 shadow-sm'
                : activeSection > idx
                  ? 'text-text-secondary hover:text-text-primary'
                  : 'text-text-muted/60 cursor-not-allowed'
            )}
            disabled={creating || idx > activeSection}
          >
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
              activeSection === idx
                ? 'bg-accent-primary text-white border-accent-primary'
                : activeSection > idx
                  ? 'bg-accent-secondary/20 text-accent-secondary border-accent-secondary/30'
                  : 'bg-transparent text-text-muted/60 border-border-primary'
            )}>
              {activeSection > idx ? <CheckCircle className="w-3 h-3" /> : idx + 1}
            </span>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="max-h-[55vh] overflow-y-auto pr-1 -mr-1 space-y-5">
          {activeSection === 0 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-200">
              <SectionTitle
                icon={<Building2 className="w-4 h-4" />}
                title="基本信息"
                desc="设备标识、生产信息和项目归属"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="设备名称" name="name" required
                  placeholder="如：TC-005 5号塔机"
                  icon={<CircleDot className="w-4 h-4" />}
                  value={form.name || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.name || ''} touched={!!touched.name}
                />
                <FormField
                  label="型号规格" name="model" required
                  placeholder="如：QTZ80、QTZ125"
                  icon={<Hash className="w-4 h-4" />}
                  value={form.model || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.model || ''} touched={!!touched.model}
                />
                <FormField
                  label="生产厂家" name="manufacturer"
                  placeholder="如：中联重科、徐工集团"
                  icon={<Factory className="w-4 h-4" />}
                  value={form.manufacturer || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.manufacturer || ''} touched={!!touched.manufacturer}
                />
                <FormField
                  label="出厂编号" name="serial_number"
                  placeholder="设备出厂唯一编号"
                  icon={<Package className="w-4 h-4" />}
                  value={form.serial_number || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.serial_number || ''} touched={!!touched.serial_number}
                />
                <FormField
                  label="出厂日期" name="production_date" type="date"
                  icon={<Calendar className="w-4 h-4" />}
                  value={form.production_date || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.production_date || ''} touched={!!touched.production_date}
                />
                <FormField
                  label="安装日期" name="install_date" type="date" required
                  icon={<Calendar className="w-4 h-4" />}
                  value={form.install_date || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.install_date || ''} touched={!!touched.install_date}
                />
                <FormField
                  label="最近维保日期" name="last_maintenance" type="date" required
                  icon={<Calendar className="w-4 h-4" />}
                  value={form.last_maintenance || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.last_maintenance || ''} touched={!!touched.last_maintenance}
                />
                <FormField
                  label="备案登记号" name="registration_number"
                  placeholder="监管部门备案号"
                  icon={<Hash className="w-4 h-4" />}
                  value={form.registration_number || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.registration_number || ''} touched={!!touched.registration_number}
                />
                <FormField
                  label="所属项目" name="project_name"
                  placeholder="项目工程名称"
                  icon={<Building2 className="w-4 h-4" />}
                  value={form.project_name || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.project_name || ''} touched={!!touched.project_name}
                />
                <FormField
                  label="施工单位" name="construction_unit"
                  placeholder="承建单位名称"
                  icon={<Factory className="w-4 h-4" />}
                  value={form.construction_unit || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.construction_unit || ''} touched={!!touched.construction_unit}
                />
                <FormField
                  label="X坐标位置" name="location_x" type="number" required
                  placeholder="0-100"
                  icon={<MapPin className="w-4 h-4" />}
                  unit="%" value={form.location_x ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.location_x || ''} touched={!!touched.location_x}
                />
                <FormField
                  label="Y坐标位置" name="location_y" type="number" required
                  placeholder="0-100"
                  icon={<MapPin className="w-4 h-4" />}
                  unit="%" value={form.location_y ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.location_y || ''} touched={!!touched.location_y}
                />
              </div>
            </div>
          )}

          {activeSection === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-200">
              <SectionTitle
                icon={<Gauge className="w-4 h-4" />}
                title="技术性能参数"
                desc="起重能力、作业范围与运动参数"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="最大起重量" name="max_load" type="number" required
                  placeholder="0.5 - 100"
                  icon={<Weight className="w-4 h-4" />}
                  unit="t" value={form.max_load ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.max_load || ''} touched={!!touched.max_load}
                />
                <FormField
                  label="额定起重力矩" name="max_moment" type="number" required
                  placeholder="5 - 1000"
                  icon={<Gauge className="w-4 h-4" />}
                  unit="t·m" value={form.max_moment ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.max_moment || ''} touched={!!touched.max_moment}
                />
                <FormField
                  label="最大工作幅度" name="max_radius" type="number" required
                  placeholder="5 - 150"
                  icon={<Ruler className="w-4 h-4" />}
                  unit="m" value={form.max_radius ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.max_radius || ''} touched={!!touched.max_radius}
                />
                <FormField
                  label="最小工作幅度" name="min_radius" type="number"
                  placeholder="0.5 - 20"
                  icon={<Ruler className="w-4 h-4" />}
                  unit="m" value={form.min_radius ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.min_radius || ''} touched={!!touched.min_radius}
                  hint="默认2.5米"
                />
                <FormField
                  label="臂端额定载荷" name="tip_load" type="number"
                  placeholder="0.1 - 50"
                  icon={<Weight className="w-4 h-4" />}
                  unit="t" value={form.tip_load ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.tip_load || ''} touched={!!touched.tip_load}
                />
                <FormField
                  label="最大起升高度" name="max_height" type="number" required
                  placeholder="5 - 500"
                  icon={<Ruler className="w-4 h-4" />}
                  unit="m" value={form.max_height ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.max_height || ''} touched={!!touched.max_height}
                />
                <FormField
                  label="独立高度" name="free_standing_height" type="number"
                  placeholder="5 - 300"
                  icon={<Ruler className="w-4 h-4" />}
                  unit="m" value={form.free_standing_height ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.free_standing_height || ''} touched={!!touched.free_standing_height}
                />
                <FormField
                  label="最大附着高度" name="max_anchored_height" type="number"
                  placeholder="5 - 600"
                  icon={<Ruler className="w-4 h-4" />}
                  unit="m" value={form.max_anchored_height ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.max_anchored_height || ''} touched={!!touched.max_anchored_height}
                />
                <FormField
                  label="起升速度" name="hoist_speed" type="number"
                  placeholder="1 - 200"
                  icon={<Gauge className="w-4 h-4" />}
                  unit="m/min" value={form.hoist_speed ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.hoist_speed || ''} touched={!!touched.hoist_speed}
                />
                <FormField
                  label="回转速度" name="slewing_speed" type="number"
                  placeholder="0.1 - 2"
                  icon={<Gauge className="w-4 h-4" />}
                  unit="r/min" value={form.slewing_speed ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.slewing_speed || ''} touched={!!touched.slewing_speed}
                />
                <FormField
                  label="变幅速度" name="trolley_speed" type="number"
                  placeholder="5 - 100"
                  icon={<Gauge className="w-4 h-4" />}
                  unit="m/min" value={form.trolley_speed ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.trolley_speed || ''} touched={!!touched.trolley_speed}
                />
                <FormField
                  label="电机总功率" name="motor_power" type="number"
                  placeholder="1 - 500"
                  icon={<Zap className="w-4 h-4" />}
                  unit="kW" value={form.motor_power ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.motor_power || ''} touched={!!touched.motor_power}
                />
              </div>
            </div>
          )}

          {activeSection === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-200">
              <SectionTitle
                icon={<Wind className="w-4 h-4" />}
                title="重量与环境参数"
                desc="结构重量、温湿度与风速限制"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="整机自重" name="total_weight" type="number"
                  placeholder="1 - 500"
                  icon={<Weight className="w-4 h-4" />}
                  unit="t" value={form.total_weight ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.total_weight || ''} touched={!!touched.total_weight}
                />
                <FormField
                  label="起重臂自重" name="jib_weight" type="number"
                  placeholder="0.5 - 100"
                  icon={<Weight className="w-4 h-4" />}
                  unit="t" value={form.jib_weight ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.jib_weight || ''} touched={!!touched.jib_weight}
                />
                <FormField
                  label="平衡重" name="counterweight" type="number"
                  placeholder="0.5 - 200"
                  icon={<Weight className="w-4 h-4" />}
                  unit="t" value={form.counterweight ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.counterweight || ''} touched={!!touched.counterweight}
                />
                <FormField
                  label="电源要求" name="power_supply"
                  placeholder="380V/50Hz"
                  icon={<Zap className="w-4 h-4" />}
                  value={form.power_supply || ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.power_supply || ''} touched={!!touched.power_supply}
                  hint="默认380V/50Hz"
                />
                <FormField
                  label="工作温度下限" name="working_temp_min" type="number"
                  placeholder="-50 - 10"
                  icon={<Thermometer className="w-4 h-4" />}
                  unit="°C" value={form.working_temp_min ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.working_temp_min || ''} touched={!!touched.working_temp_min}
                  hint="默认-20°C"
                />
                <FormField
                  label="工作温度上限" name="working_temp_max" type="number"
                  placeholder="0 - 80"
                  icon={<Thermometer className="w-4 h-4" />}
                  unit="°C" value={form.working_temp_max ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.working_temp_max || ''} touched={!!touched.working_temp_max}
                  hint="默认40°C"
                />
                <FormField
                  label="允许工作风速" name="max_wind_operational" type="number"
                  placeholder="1 - 30"
                  icon={<Wind className="w-4 h-4" />}
                  unit="m/s" value={form.max_wind_operational ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.max_wind_operational || ''} touched={!!touched.max_wind_operational}
                  hint="默认12 m/s（约6级风）"
                />
                <FormField
                  label="允许非工作风速" name="max_wind_nonoperational" type="number"
                  placeholder="5 - 60"
                  icon={<Wind className="w-4 h-4" />}
                  unit="m/s" value={form.max_wind_nonoperational ?? ''}
                  onChange={handleChange} onBlur={handleBlur}
                  error={errors.max_wind_nonoperational || ''} touched={!!touched.max_wind_nonoperational}
                  hint="默认30 m/s（约11级风）"
                />
              </div>

              <div className="mt-6 p-4 rounded-lg bg-accent-primary/5 border border-accent-primary/20">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-accent-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-text-secondary space-y-1">
                    <p><span className="font-medium text-text-primary">提交前须知：</span></p>
                    <p>• 创建成功后将自动生成 6 个标准传感器（起重量、力矩、幅度、高度、回转、风速）</p>
                    <p>• 根据参数自动生成 6 条默认告警规则（起重量/力矩/风速的警告与临界级别）</p>
                    <p>• 初始状态为「离线」，设备联网后自动变为「在线」</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-primary">
          <button
            type="button"
            onClick={() => {
              if (!creating) {
                handleReset()
                onClose()
              }
            }}
            disabled={creating}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            取消
          </button>

          <div className="flex items-center gap-2">
            {activeSection > 0 && (
              <button
                type="button"
                onClick={() => setActiveSection((s) => (s - 1) as 0 | 1 | 2)}
                disabled={creating}
                className="btn-secondary disabled:opacity-50"
              >
                上一步
              </button>
            )}
            {activeSection < 2 ? (
              <button
                type="button"
                onClick={() => {
                  if (validateSection(activeSection)) {
                    setActiveSection((s) => (s + 1) as 0 | 1 | 2)
                  }
                }}
                disabled={creating}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                下一步
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={creating || submitSuccess}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    创建中...
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    创建成功
                  </>
                ) : (
                  '确认创建设备'
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
