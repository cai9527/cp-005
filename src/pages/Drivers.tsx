import { useEffect, useState, useCallback } from 'react'
import {
  useDriverStore,
  type Driver,
  type DriverCertification,
  type DriverWorkRecord,
  type DriverSchedule,
  type DriverTraining,
} from '@/stores/driverStore'
import { useCraneStore } from '@/stores/craneStore'
import { cn } from '@/lib/utils'
import {
  Search, Plus, RefreshCw, UserCircle, Award, FileText, Calendar, GraduationCap,
  X, Check, AlertTriangle, Edit3, Trash2, ChevronLeft, ChevronRight, Clock,
  Truck, Phone, MapPin, Shield, ChevronDown, Eye, UserX, UserCheck,
} from 'lucide-react'

type TabType = 'drivers' | 'certs' | 'work' | 'schedule' | 'training'

const certTypeMap: Record<string, string> = {
  tower_crane_operator: '塔机操作证',
  safety_training: '安全培训证',
  special_operation: '特种作业证',
  aerial_work: '高空作业证',
}

const certStatusMap: Record<string, { label: string; color: string }> = {
  valid: { label: '有效', color: 'bg-accent-secondary/15 text-accent-secondary' },
  expired: { label: '已过期', color: 'bg-accent-danger/15 text-accent-danger' },
  revoked: { label: '已吊销', color: 'bg-bg-tertiary text-text-muted' },
}

const workTypeMap: Record<string, string> = {
  normal: '常规',
  overtime: '加班',
  holiday: '节假日',
}

const shiftTypeMap: Record<string, string> = {
  day: '白班',
  night: '夜班',
  split: '两班倒',
}

const scheduleStatusMap: Record<string, { label: string; color: string }> = {
  scheduled: { label: '已排班', color: 'bg-accent-primary/15 text-accent-primary' },
  active: { label: '执行中', color: 'bg-accent-secondary/15 text-accent-secondary' },
  completed: { label: '已完成', color: 'bg-bg-tertiary text-text-muted' },
  cancelled: { label: '已取消', color: 'bg-accent-danger/15 text-accent-danger' },
}

const trainingTypeMap: Record<string, string> = {
  safety: '安全教育',
  skill: '操作技能',
  emergency: '应急演练',
  special: '专项培训',
}

const trainingResultMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待考核', color: 'bg-accent-warning/15 text-accent-warning' },
  passed: { label: '通过', color: 'bg-accent-secondary/15 text-accent-secondary' },
  failed: { label: '未通过', color: 'bg-accent-danger/15 text-accent-danger' },
}

const driverStatusMap: Record<string, { label: string; color: string }> = {
  active: { label: '在职', color: 'bg-accent-secondary/15 text-accent-secondary' },
  leave: { label: '休假', color: 'bg-accent-warning/15 text-accent-warning' },
  resigned: { label: '离职', color: 'bg-accent-danger/15 text-accent-danger' },
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function CraneSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const { cranes, fetchCranes } = useCraneStore()
  useEffect(() => {
    if (cranes.length === 0) fetchCranes()
  }, [cranes.length, fetchCranes])
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn('input-field', className)}>
      <option value="">未绑定</option>
      {cranes.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}

export default function DriversPage() {
  const {
    drivers, loading, error, certifications, workRecords, schedules,
    trainings, workStats, expiringCerts,
    fetchDrivers, createDriver, updateDriver, deleteDriver,
    fetchCertifications, createCertification, updateCertification, deleteCertification,
    fetchExpiringCerts, fetchWorkRecords, createWorkRecord, fetchWorkStats,
    fetchSchedulesByDate, createSchedule, updateSchedule, deleteSchedule,
    fetchTrainings, createTraining, updateTraining, deleteTraining,
    clearError,
  } = useDriverStore()

  const { cranes, fetchCranes } = useCraneStore()

  const [activeTab, setActiveTab] = useState<TabType>('drivers')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [craneFilter, setCraneFilter] = useState('')
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)

  const [selectedDriverId, setSelectedDriverId] = useState('')

  const [workStartDate, setWorkStartDate] = useState('')
  const [workEndDate, setWorkEndDate] = useState('')
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10))

  const [showAddCert, setShowAddCert] = useState(false)
  const [editingCert, setEditingCert] = useState<DriverCertification | null>(null)
  const [showAddWorkRecord, setShowAddWorkRecord] = useState(false)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<DriverSchedule | null>(null)
  const [showAddTraining, setShowAddTraining] = useState(false)
  const [editingTraining, setEditingTraining] = useState<DriverTraining | null>(null)

  const loadDrivers = useCallback(() => {
    fetchDrivers()
  }, [fetchDrivers])

  useEffect(() => {
    loadDrivers()
  }, [loadDrivers])

  useEffect(() => {
    if (cranes.length === 0) fetchCranes()
  }, [cranes.length, fetchCranes])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  useEffect(() => {
    if (activeTab === 'certs' && selectedDriverId) {
      fetchCertifications(selectedDriverId)
      fetchExpiringCerts()
    }
  }, [activeTab, selectedDriverId, fetchCertifications, fetchExpiringCerts])

  useEffect(() => {
    if (activeTab === 'work' && selectedDriverId) {
      fetchWorkRecords(selectedDriverId)
      if (workStartDate && workEndDate) {
        fetchWorkStats(selectedDriverId, workStartDate, workEndDate)
      }
    }
  }, [activeTab, selectedDriverId, workStartDate, workEndDate, fetchWorkRecords, fetchWorkStats])

  useEffect(() => {
    if (activeTab === 'schedule' && scheduleDate) {
      fetchSchedulesByDate(scheduleDate)
    }
  }, [activeTab, scheduleDate, fetchSchedulesByDate])

  useEffect(() => {
    if (activeTab === 'training' && selectedDriverId) {
      fetchTrainings(selectedDriverId)
    }
  }, [activeTab, selectedDriverId, fetchTrainings])

  const filteredDrivers = drivers.filter((d) => {
    if (keyword && !d.name.includes(keyword) && !d.phone.includes(keyword) && !d.id_card.includes(keyword)) return false
    if (statusFilter && d.status !== statusFilter) return false
    if (craneFilter && d.crane_id !== craneFilter) return false
    return true
  })

  const getCraneName = (craneId: string | null) => {
    if (!craneId) return '-'
    const crane = cranes.find((c) => c.id === craneId)
    return crane?.name || craneId
  }

  const getDriverName = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId)
    return driver?.name || driverId
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'drivers', label: '驾驶员信息', icon: <UserCircle className="w-4 h-4 inline mr-1.5" /> },
    { key: 'certs', label: '资质认证', icon: <Award className="w-4 h-4 inline mr-1.5" /> },
    { key: 'work', label: '作业记录', icon: <FileText className="w-4 h-4 inline mr-1.5" /> },
    { key: 'schedule', label: '排班调度', icon: <Calendar className="w-4 h-4 inline mr-1.5" /> },
    { key: 'training', label: '安全培训', icon: <GraduationCap className="w-4 h-4 inline mr-1.5" /> },
  ]

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">驾驶员管理</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDrivers}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            刷新
          </button>
          <button
            type="button"
            onClick={() => setShowAddDriver(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增驾驶员
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={clearError} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'drivers' && (
        <>
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="搜索姓名、手机号、身份证号..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="input-field pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field w-auto min-w-[120px]"
              >
                <option value="">全部状态</option>
                <option value="active">在职</option>
                <option value="leave">休假</option>
                <option value="resigned">离职</option>
              </select>
              <select
                value={craneFilter}
                onChange={(e) => setCraneFilter(e.target.value)}
                className="input-field w-auto min-w-[120px]"
              >
                <option value="">全部塔机</option>
                {cranes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="glass-card overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-primary bg-bg-tertiary/30">
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">姓名</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">性别</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">身份证号</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">手机号</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">驾龄</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">绑定塔机</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">状态</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">入职日期</th>
                    <th className="px-4 py-3 text-center text-text-secondary font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && drivers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                        加载中...
                      </td>
                    </tr>
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                        <UserCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        暂无驾驶员数据
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((d) => (
                      <tr key={d.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">{d.name}</td>
                        <td className="px-4 py-3 text-text-secondary">{d.gender === 'male' ? '男' : '女'}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{d.id_card}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{d.phone}</td>
                        <td className="px-4 py-3 text-text-secondary">{d.experience_years}年</td>
                        <td className="px-4 py-3 text-text-secondary">{d.crane_name || getCraneName(d.crane_id)}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            driverStatusMap[d.status]?.color
                          )}>
                            {d.status === 'active' ? <UserCheck className="w-3 h-3" /> :
                             d.status === 'leave' ? <Clock className="w-3 h-3" /> :
                             <UserX className="w-3 h-3" />}
                            {driverStatusMap[d.status]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">{formatDate(d.hire_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingDriver(d)}
                              title="编辑"
                              className="p-1.5 rounded-md text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`确定要删除驾驶员 "${d.name}" 吗？`)) return
                                try {
                                  await deleteDriver(d.id)
                                  loadDrivers()
                                } catch { /* handled in store */ }
                              }}
                              title="删除"
                              className="p-1.5 rounded-md text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'certs' && (
        <>
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="input-field w-auto min-w-[180px]"
              >
                <option value="">选择驾驶员</option>
                {drivers.filter((d) => d.status !== 'resigned').map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {selectedDriverId && (
                <button
                  type="button"
                  onClick={() => setShowAddCert(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  新增证书
                </button>
              )}
            </div>
          </div>

          {expiringCerts.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-warning/10 border border-accent-warning/30 text-accent-warning text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>有 {expiringCerts.length} 个证书将在30天内到期，请及时处理！</span>
            </div>
          )}

          {selectedDriverId && (
            <div className="glass-card overflow-hidden flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-primary bg-bg-tertiary/30">
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">证书类型</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">证书编号</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">发证机关</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">发证日期</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">到期日期</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">状态</th>
                      <th className="px-4 py-3 text-center text-text-secondary font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && certifications.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                          加载中...
                        </td>
                      </tr>
                    ) : certifications.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                          <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          暂无资质认证数据
                        </td>
                      </tr>
                    ) : (
                      certifications.map((c) => (
                        <tr key={c.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30 transition-colors">
                          <td className="px-4 py-3 text-text-primary font-medium">{certTypeMap[c.cert_type] || c.cert_type}</td>
                          <td className="px-4 py-3 text-text-secondary text-xs">{c.cert_number}</td>
                          <td className="px-4 py-3 text-text-secondary">{c.issue_authority}</td>
                          <td className="px-4 py-3 text-text-muted text-xs">{formatDate(c.issue_date)}</td>
                          <td className="px-4 py-3 text-text-muted text-xs">{formatDate(c.expiry_date)}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                              certStatusMap[c.status]?.color
                            )}>
                              {certStatusMap[c.status]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingCert(c)}
                                title="编辑"
                                className="p-1.5 rounded-md text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm('确定要删除该证书吗？')) return
                                  try {
                                    await deleteCertification(c.id)
                                    fetchCertifications(selectedDriverId)
                                  } catch { /* handled in store */ }
                                }}
                                title="删除"
                                className="p-1.5 rounded-md text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!selectedDriverId && (
            <div className="glass-card p-12 text-center text-text-muted">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>请先选择一个驾驶员查看资质认证</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'work' && (
        <>
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="input-field w-auto min-w-[180px]"
              >
                <option value="">选择驾驶员</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={workStartDate}
                  onChange={(e) => setWorkStartDate(e.target.value)}
                  className="input-field w-auto"
                />
                <span className="text-text-muted text-sm">至</span>
                <input
                  type="date"
                  value={workEndDate}
                  onChange={(e) => setWorkEndDate(e.target.value)}
                  className="input-field w-auto"
                />
              </div>
              {selectedDriverId && (
                <button
                  type="button"
                  onClick={() => setShowAddWorkRecord(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  新增记录
                </button>
              )}
            </div>
          </div>

          {selectedDriverId && workStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-accent-primary">{workStats.total_days}</p>
                <p className="text-xs text-text-muted mt-1">作业天数</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-accent-secondary">{workStats.total_load_count}</p>
                <p className="text-xs text-text-muted mt-1">吊装次数</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-accent-warning">{workStats.max_load}t</p>
                <p className="text-xs text-text-muted mt-1">最大载荷</p>
              </div>
            </div>
          )}

          {selectedDriverId && (
            <div className="glass-card overflow-hidden flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-primary bg-bg-tertiary/30">
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">作业日期</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">塔机</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">作业类型</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">开始时间</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">结束时间</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">吊装次数</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">最大载荷(t)</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && workRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                          加载中...
                        </td>
                      </tr>
                    ) : workRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          暂无作业记录
                        </td>
                      </tr>
                    ) : (
                      workRecords.map((w) => (
                        <tr key={w.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30 transition-colors">
                          <td className="px-4 py-3 text-text-primary text-xs whitespace-nowrap">{formatDate(w.work_date)}</td>
                          <td className="px-4 py-3 text-text-secondary">{getCraneName(w.crane_id)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-primary/15 text-accent-primary">
                              {workTypeMap[w.work_type] || w.work_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-muted text-xs">{formatDateTime(w.start_time)}</td>
                          <td className="px-4 py-3 text-text-muted text-xs">{formatDateTime(w.end_time)}</td>
                          <td className="px-4 py-3 text-text-secondary">{w.load_count}</td>
                          <td className="px-4 py-3 text-text-secondary">{w.max_load}</td>
                          <td className="px-4 py-3 text-text-muted text-xs max-w-[200px] truncate">{w.remark || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!selectedDriverId && (
            <div className="glass-card p-12 text-center text-text-muted">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>请先选择一个驾驶员查看作业记录</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'schedule' && (
        <>
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-muted" />
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="input-field w-auto"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddSchedule(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新增排班
              </button>
            </div>
          </div>

          <div className="glass-card overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-primary bg-bg-tertiary/30">
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">驾驶员</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">塔机</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">班次</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">开始时间</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">结束时间</th>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">状态</th>
                    <th className="px-4 py-3 text-center text-text-secondary font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && schedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                        加载中...
                      </td>
                    </tr>
                  ) : schedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        暂无排班数据
                      </td>
                    </tr>
                  ) : (
                    schedules.map((s) => (
                      <tr key={s.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">{getDriverName(s.driver_id)}</td>
                        <td className="px-4 py-3 text-text-secondary">{getCraneName(s.crane_id)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-primary/15 text-accent-primary">
                            {shiftTypeMap[s.shift_type] || s.shift_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">{formatDateTime(s.start_time)}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{formatDateTime(s.end_time)}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            scheduleStatusMap[s.status]?.color
                          )}>
                            {scheduleStatusMap[s.status]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {s.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateSchedule(s.id, { status: 'active' })
                                    fetchSchedulesByDate(scheduleDate)
                                  } catch { /* handled in store */ }
                                }}
                                title="开始执行"
                                className="p-1.5 rounded-md text-text-muted hover:text-accent-secondary hover:bg-accent-secondary/10 transition-all"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            {s.status === 'active' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateSchedule(s.id, { status: 'completed' })
                                    fetchSchedulesByDate(scheduleDate)
                                  } catch { /* handled in store */ }
                                }}
                                title="完成"
                                className="p-1.5 rounded-md text-text-muted hover:text-accent-secondary hover:bg-accent-secondary/10 transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {(s.status === 'scheduled' || s.status === 'active') && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateSchedule(s.id, { status: 'cancelled' })
                                    fetchSchedulesByDate(scheduleDate)
                                  } catch { /* handled in store */ }
                                }}
                                title="取消"
                                className="p-1.5 rounded-md text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingSchedule(s)}
                              title="编辑"
                              className="p-1.5 rounded-md text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm('确定要删除该排班吗？')) return
                                try {
                                  await deleteSchedule(s.id)
                                  fetchSchedulesByDate(scheduleDate)
                                } catch { /* handled in store */ }
                              }}
                              title="删除"
                              className="p-1.5 rounded-md text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'training' && (
        <>
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="input-field w-auto min-w-[180px]"
              >
                <option value="">选择驾驶员</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {selectedDriverId && (
                <button
                  type="button"
                  onClick={() => setShowAddTraining(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  新增培训
                </button>
              )}
            </div>
          </div>

          {selectedDriverId && (
            <div className="glass-card overflow-hidden flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-primary bg-bg-tertiary/30">
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">培训类型</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">培训名称</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">培训日期</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">时长(h)</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">培训师</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">培训机构</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">结果</th>
                      <th className="px-4 py-3 text-left text-text-secondary font-medium">分数</th>
                      <th className="px-4 py-3 text-center text-text-secondary font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && trainings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                          加载中...
                        </td>
                      </tr>
                    ) : trainings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-text-muted">
                          <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          暂无培训记录
                        </td>
                      </tr>
                    ) : (
                      trainings.map((t) => (
                        <tr key={t.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30 transition-colors">
                          <td className="px-4 py-3 text-text-primary font-medium">{trainingTypeMap[t.training_type] || t.training_type}</td>
                          <td className="px-4 py-3 text-text-secondary">{t.training_name}</td>
                          <td className="px-4 py-3 text-text-muted text-xs">{formatDate(t.training_date)}</td>
                          <td className="px-4 py-3 text-text-secondary">{t.duration_hours}</td>
                          <td className="px-4 py-3 text-text-secondary">{t.trainer || '-'}</td>
                          <td className="px-4 py-3 text-text-secondary">{t.training_org || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                              trainingResultMap[t.result]?.color
                            )}>
                              {trainingResultMap[t.result]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{t.score ?? '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingTraining(t)}
                                title="编辑"
                                className="p-1.5 rounded-md text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!selectedDriverId && (
            <div className="glass-card p-12 text-center text-text-muted">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>请先选择一个驾驶员查看培训记录</p>
            </div>
          )}
        </>
      )}

      {showAddDriver && (
        <AddDriverModal
          onClose={() => setShowAddDriver(false)}
          onCreated={() => { setShowAddDriver(false); loadDrivers() }}
        />
      )}

      {editingDriver && (
        <EditDriverModal
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onSaved={() => { setEditingDriver(null); loadDrivers() }}
        />
      )}

      {showAddCert && selectedDriverId && (
        <AddCertModal
          driverId={selectedDriverId}
          onClose={() => setShowAddCert(false)}
          onCreated={() => { setShowAddCert(false); fetchCertifications(selectedDriverId) }}
        />
      )}

      {editingCert && (
        <EditCertModal
          cert={editingCert}
          onClose={() => setEditingCert(null)}
          onSaved={() => { setEditingCert(null); fetchCertifications(selectedDriverId) }}
        />
      )}

      {showAddWorkRecord && selectedDriverId && (
        <AddWorkRecordModal
          driverId={selectedDriverId}
          onClose={() => setShowAddWorkRecord(false)}
          onCreated={() => { setShowAddWorkRecord(false); fetchWorkRecords(selectedDriverId) }}
        />
      )}

      {showAddSchedule && (
        <AddScheduleModal
          onClose={() => setShowAddSchedule(false)}
          onCreated={() => { setShowAddSchedule(false); fetchSchedulesByDate(scheduleDate) }}
        />
      )}

      {editingSchedule && (
        <EditScheduleModal
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSaved={() => { setEditingSchedule(null); fetchSchedulesByDate(scheduleDate) }}
        />
      )}

      {showAddTraining && selectedDriverId && (
        <AddTrainingModal
          driverId={selectedDriverId}
          onClose={() => setShowAddTraining(false)}
          onCreated={() => { setShowAddTraining(false); fetchTrainings(selectedDriverId) }}
        />
      )}

      {editingTraining && (
        <EditTrainingModal
          training={editingTraining}
          onClose={() => setEditingTraining(null)}
          onSaved={() => { setEditingTraining(null); fetchTrainings(selectedDriverId) }}
        />
      )}
    </div>
  )
}

function ModalOverlay({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-bg-secondary border border-border-primary rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary sticky top-0 bg-bg-secondary z-10">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AddDriverModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createDriverFn = useDriverStore((s) => s.createDriver)
  const [form, setForm] = useState({
    name: '', gender: 'male' as 'male' | 'female', id_card: '', phone: '',
    emergency_contact: '', emergency_phone: '', address: '',
    hire_date: new Date().toISOString().slice(0, 10), experience_years: 0, crane_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!form.name.trim()) { setLocalError('姓名不能为空'); return }
    if (!form.id_card.trim()) { setLocalError('身份证号不能为空'); return }
    if (!form.phone.trim()) { setLocalError('手机号不能为空'); return }
    setSaving(true)
    try {
      await createDriverFn({
        name: form.name.trim(),
        gender: form.gender,
        id_card: form.id_card.trim(),
        phone: form.phone.trim(),
        emergency_contact: form.emergency_contact || null,
        emergency_phone: form.emergency_phone || null,
        address: form.address || null,
        hire_date: form.hire_date,
        experience_years: form.experience_years,
        crane_id: form.crane_id || null,
      })
      onCreated()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="新增驾驶员">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">姓名 *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">性别 *</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' })} className="input-field">
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">身份证号 *</label>
          <input type="text" value={form.id_card} onChange={(e) => setForm({ ...form, id_card: e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">手机号 *</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">紧急联系人</label>
            <input type="text" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">紧急联系电话</label>
            <input type="tel" value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">地址</label>
          <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">入职日期 *</label>
            <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">驾龄(年) *</label>
            <input type="number" min={0} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">绑定塔机</label>
          <CraneSelect value={form.crane_id} onChange={(v) => setForm({ ...form, crane_id: v })} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            创建
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function EditDriverModal({ driver, onClose, onSaved }: { driver: Driver; onClose: () => void; onSaved: () => void }) {
  const updateDriverFn = useDriverStore((s) => s.updateDriver)
  const [form, setForm] = useState({
    name: driver.name,
    gender: driver.gender,
    id_card: driver.id_card,
    phone: driver.phone,
    emergency_contact: driver.emergency_contact || '',
    emergency_phone: driver.emergency_phone || '',
    address: driver.address || '',
    hire_date: driver.hire_date,
    experience_years: driver.experience_years,
    crane_id: driver.crane_id || '',
    status: driver.status,
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!form.name.trim()) { setLocalError('姓名不能为空'); return }
    setSaving(true)
    try {
      await updateDriverFn(driver.id, {
        name: form.name.trim(),
        gender: form.gender,
        id_card: form.id_card.trim(),
        phone: form.phone.trim(),
        emergency_contact: form.emergency_contact || null,
        emergency_phone: form.emergency_phone || null,
        address: form.address || null,
        hire_date: form.hire_date,
        experience_years: form.experience_years,
        crane_id: form.crane_id || null,
        status: form.status,
      })
      onSaved()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="编辑驾驶员">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">姓名 *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">性别 *</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' })} className="input-field">
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">身份证号 *</label>
          <input type="text" value={form.id_card} onChange={(e) => setForm({ ...form, id_card: e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">手机号 *</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">紧急联系人</label>
            <input type="text" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">紧急联系电话</label>
            <input type="tel" value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">地址</label>
          <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">入职日期 *</label>
            <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">驾龄(年) *</label>
            <input type="number" min={0} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">绑定塔机</label>
            <CraneSelect value={form.crane_id} onChange={(v) => setForm({ ...form, crane_id: v })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">状态</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'leave' | 'resigned' })} className="input-field">
              <option value="active">在职</option>
              <option value="leave">休假</option>
              <option value="resigned">离职</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            保存
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function AddCertModal({ driverId, onClose, onCreated }: { driverId: string; onClose: () => void; onCreated: () => void }) {
  const createCertFn = useDriverStore((s) => s.createCertification)
  const [form, setForm] = useState({
    cert_type: 'tower_crane_operator', cert_number: '', issue_authority: '',
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: '', remark: '',
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!form.cert_number.trim()) { setLocalError('证书编号不能为空'); return }
    if (!form.issue_authority.trim()) { setLocalError('发证机关不能为空'); return }
    if (!form.expiry_date) { setLocalError('到期日期不能为空'); return }
    setSaving(true)
    try {
      await createCertFn(driverId, {
        cert_type: form.cert_type,
        cert_number: form.cert_number.trim(),
        issue_authority: form.issue_authority.trim(),
        issue_date: form.issue_date,
        expiry_date: form.expiry_date,
        remark: form.remark || null,
      })
      onCreated()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="新增证书">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">证书类型 *</label>
          <select value={form.cert_type} onChange={(e) => setForm({ ...form, cert_type: e.target.value })} className="input-field">
            <option value="tower_crane_operator">塔机操作证</option>
            <option value="safety_training">安全培训证</option>
            <option value="special_operation">特种作业证</option>
            <option value="aerial_work">高空作业证</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">证书编号 *</label>
          <input type="text" value={form.cert_number} onChange={(e) => setForm({ ...form, cert_number: e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">发证机关 *</label>
          <input type="text" value={form.issue_authority} onChange={(e) => setForm({ ...form, issue_authority: e.target.value })} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">发证日期 *</label>
            <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">到期日期 *</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">备注</label>
          <input type="text" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="input-field" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            创建
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function EditCertModal({ cert, onClose, onSaved }: { cert: DriverCertification; onClose: () => void; onSaved: () => void }) {
  const updateCertFn = useDriverStore((s) => s.updateCertification)
  const [form, setForm] = useState({
    cert_type: cert.cert_type,
    cert_number: cert.cert_number,
    issue_authority: cert.issue_authority,
    issue_date: cert.issue_date,
    expiry_date: cert.expiry_date,
    status: cert.status,
    remark: cert.remark || '',
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setSaving(true)
    try {
      await updateCertFn(cert.id, {
        cert_type: form.cert_type,
        cert_number: form.cert_number.trim(),
        issue_authority: form.issue_authority.trim(),
        issue_date: form.issue_date,
        expiry_date: form.expiry_date,
        status: form.status,
        remark: form.remark || null,
      })
      onSaved()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="编辑证书">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">证书类型 *</label>
          <select value={form.cert_type} onChange={(e) => setForm({ ...form, cert_type: e.target.value })} className="input-field">
            <option value="tower_crane_operator">塔机操作证</option>
            <option value="safety_training">安全培训证</option>
            <option value="special_operation">特种作业证</option>
            <option value="aerial_work">高空作业证</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">证书编号 *</label>
          <input type="text" value={form.cert_number} onChange={(e) => setForm({ ...form, cert_number: e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">发证机关 *</label>
          <input type="text" value={form.issue_authority} onChange={(e) => setForm({ ...form, issue_authority: e.target.value })} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">发证日期 *</label>
            <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">到期日期 *</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">状态</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'valid' | 'expired' | 'revoked' })} className="input-field">
            <option value="valid">有效</option>
            <option value="expired">已过期</option>
            <option value="revoked">已吊销</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">备注</label>
          <input type="text" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="input-field" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            保存
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function AddWorkRecordModal({ driverId, onClose, onCreated }: { driverId: string; onClose: () => void; onCreated: () => void }) {
  const createWorkFn = useDriverStore((s) => s.createWorkRecord)
  const [form, setForm] = useState({
    crane_id: '', work_date: new Date().toISOString().slice(0, 10),
    start_time: '', end_time: '', work_type: 'normal' as 'normal' | 'overtime' | 'holiday',
    work_content: '', load_count: 0, max_load: 0,
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!form.crane_id) { setLocalError('请选择塔机'); return }
    if (!form.work_date) { setLocalError('作业日期不能为空'); return }
    setSaving(true)
    try {
      await createWorkFn(driverId, {
        crane_id: form.crane_id,
        work_date: form.work_date,
        start_time: form.start_time,
        end_time: form.end_time,
        work_type: form.work_type,
        work_content: form.work_content || null,
        load_count: form.load_count,
        max_load: form.max_load,
      })
      onCreated()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="新增作业记录">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">塔机 *</label>
          <CraneSelect value={form.crane_id} onChange={(v) => setForm({ ...form, crane_id: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">作业日期 *</label>
            <input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">作业类型</label>
            <select value={form.work_type} onChange={(e) => setForm({ ...form, work_type: e.target.value as 'normal' | 'overtime' | 'holiday' })} className="input-field">
              <option value="normal">常规</option>
              <option value="overtime">加班</option>
              <option value="holiday">节假日</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">开始时间</label>
            <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">结束时间</label>
            <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">作业内容</label>
          <input type="text" value={form.work_content} onChange={(e) => setForm({ ...form, work_content: e.target.value })} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">吊装次数</label>
            <input type="number" min={0} value={form.load_count} onChange={(e) => setForm({ ...form, load_count: Number(e.target.value) })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">最大载荷(t)</label>
            <input type="number" min={0} step={0.1} value={form.max_load} onChange={(e) => setForm({ ...form, max_load: Number(e.target.value) })} className="input-field" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            创建
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function AddScheduleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createScheduleFn = useDriverStore((s) => s.createSchedule)
  const { drivers } = useDriverStore()
  const [form, setForm] = useState({
    driver_id: '', crane_id: '', schedule_date: new Date().toISOString().slice(0, 10),
    shift_type: 'day' as 'day' | 'night' | 'split',
    start_time: '', end_time: '', remark: '',
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!form.driver_id) { setLocalError('请选择驾驶员'); return }
    if (!form.crane_id) { setLocalError('请选择塔机'); return }
    if (!form.schedule_date) { setLocalError('排班日期不能为空'); return }
    setSaving(true)
    try {
      await createScheduleFn(form.driver_id, {
        crane_id: form.crane_id,
        schedule_date: form.schedule_date,
        shift_type: form.shift_type,
        start_time: form.start_time,
        end_time: form.end_time,
        remark: form.remark || null,
      })
      onCreated()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="新增排班">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">驾驶员 *</label>
          <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className="input-field">
            <option value="">选择驾驶员</option>
            {drivers.filter((d) => d.status !== 'resigned').map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">塔机 *</label>
          <CraneSelect value={form.crane_id} onChange={(v) => setForm({ ...form, crane_id: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">排班日期 *</label>
            <input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">班次</label>
            <select value={form.shift_type} onChange={(e) => setForm({ ...form, shift_type: e.target.value as 'day' | 'night' | 'split' })} className="input-field">
              <option value="day">白班</option>
              <option value="night">夜班</option>
              <option value="split">两班倒</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">开始时间</label>
            <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">结束时间</label>
            <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">备注</label>
          <input type="text" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="input-field" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            创建
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function EditScheduleModal({ schedule, onClose, onSaved }: { schedule: DriverSchedule; onClose: () => void; onSaved: () => void }) {
  const updateScheduleFn = useDriverStore((s) => s.updateSchedule)
  const [form, setForm] = useState({
    crane_id: schedule.crane_id,
    schedule_date: schedule.schedule_date,
    shift_type: schedule.shift_type,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    status: schedule.status,
    remark: schedule.remark || '',
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setSaving(true)
    try {
      await updateScheduleFn(schedule.id, {
        crane_id: form.crane_id,
        schedule_date: form.schedule_date,
        shift_type: form.shift_type,
        start_time: form.start_time,
        end_time: form.end_time,
        status: form.status,
        remark: form.remark || null,
      })
      onSaved()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="编辑排班">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">塔机</label>
          <CraneSelect value={form.crane_id} onChange={(v) => setForm({ ...form, crane_id: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">排班日期</label>
            <input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">班次</label>
            <select value={form.shift_type} onChange={(e) => setForm({ ...form, shift_type: e.target.value as 'day' | 'night' | 'split' })} className="input-field">
              <option value="day">白班</option>
              <option value="night">夜班</option>
              <option value="split">两班倒</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">开始时间</label>
            <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">结束时间</label>
            <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">状态</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'scheduled' | 'active' | 'completed' | 'cancelled' })} className="input-field">
            <option value="scheduled">已排班</option>
            <option value="active">执行中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">备注</label>
          <input type="text" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="input-field" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            保存
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function AddTrainingModal({ driverId, onClose, onCreated }: { driverId: string; onClose: () => void; onCreated: () => void }) {
  const createTrainingFn = useDriverStore((s) => s.createTraining)
  const [form, setForm] = useState({
    training_type: 'safety' as 'safety' | 'skill' | 'emergency' | 'special',
    training_name: '', training_date: new Date().toISOString().slice(0, 10),
    duration_hours: 0, trainer: '', training_org: '',
    result: 'pending' as 'pending' | 'passed' | 'failed',
    score: 0, remark: '',
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!form.training_name.trim()) { setLocalError('培训名称不能为空'); return }
    setSaving(true)
    try {
      await createTrainingFn(driverId, {
        training_type: form.training_type,
        training_name: form.training_name.trim(),
        training_date: form.training_date,
        duration_hours: form.duration_hours,
        trainer: form.trainer || null,
        training_org: form.training_org || null,
        result: form.result,
        score: form.score || null,
        remark: form.remark || null,
      })
      onCreated()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="新增培训">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训类型 *</label>
            <select value={form.training_type} onChange={(e) => setForm({ ...form, training_type: e.target.value as 'safety' | 'skill' | 'emergency' | 'special' })} className="input-field">
              <option value="safety">安全教育</option>
              <option value="skill">操作技能</option>
              <option value="emergency">应急演练</option>
              <option value="special">专项培训</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训名称 *</label>
            <input type="text" value={form.training_name} onChange={(e) => setForm({ ...form, training_name: e.target.value })} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训日期 *</label>
            <input type="date" value={form.training_date} onChange={(e) => setForm({ ...form, training_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">时长(h)</label>
            <input type="number" min={0} value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训师</label>
            <input type="text" value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训机构</label>
            <input type="text" value={form.training_org} onChange={(e) => setForm({ ...form, training_org: e.target.value })} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">考核结果</label>
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as 'pending' | 'passed' | 'failed' })} className="input-field">
              <option value="pending">待考核</option>
              <option value="passed">通过</option>
              <option value="failed">未通过</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">分数</label>
            <input type="number" min={0} max={100} value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">备注</label>
          <input type="text" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="input-field" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            创建
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

function EditTrainingModal({ training, onClose, onSaved }: { training: DriverTraining; onClose: () => void; onSaved: () => void }) {
  const updateTrainingFn = useDriverStore((s) => s.updateTraining)
  const [form, setForm] = useState({
    training_type: training.training_type,
    training_name: training.training_name,
    training_date: training.training_date,
    duration_hours: training.duration_hours,
    trainer: training.trainer || '',
    training_org: training.training_org || '',
    result: training.result,
    score: training.score ?? 0,
    remark: training.remark || '',
  })
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setSaving(true)
    try {
      await updateTrainingFn(training.id, {
        training_type: form.training_type,
        training_name: form.training_name.trim(),
        training_date: form.training_date,
        duration_hours: form.duration_hours,
        trainer: form.trainer || null,
        training_org: form.training_org || null,
        result: form.result,
        score: form.score || null,
        remark: form.remark || null,
      })
      onSaved()
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} title="编辑培训">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {localError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训类型 *</label>
            <select value={form.training_type} onChange={(e) => setForm({ ...form, training_type: e.target.value as 'safety' | 'skill' | 'emergency' | 'special' })} className="input-field">
              <option value="safety">安全教育</option>
              <option value="skill">操作技能</option>
              <option value="emergency">应急演练</option>
              <option value="special">专项培训</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训名称 *</label>
            <input type="text" value={form.training_name} onChange={(e) => setForm({ ...form, training_name: e.target.value })} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训日期 *</label>
            <input type="date" value={form.training_date} onChange={(e) => setForm({ ...form, training_date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">时长(h)</label>
            <input type="number" min={0} value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训师</label>
            <input type="text" value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">培训机构</label>
            <input type="text" value={form.training_org} onChange={(e) => setForm({ ...form, training_org: e.target.value })} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">考核结果</label>
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as 'pending' | 'passed' | 'failed' })} className="input-field">
              <option value="pending">待考核</option>
              <option value="passed">通过</option>
              <option value="failed">未通过</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">分数</label>
            <input type="number" min={0} max={100} value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">备注</label>
          <input type="text" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="input-field" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">取消</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            保存
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}