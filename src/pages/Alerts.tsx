import { useState, useEffect } from 'react'
import {
  AlertTriangle, Clock, CheckCircle, XCircle, Plus, Settings,
  Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAlertStore, type Alert, type AlertRule } from '@/stores/alertStore'
import { useCraneStore } from '@/stores/craneStore'
import { cn } from '@/lib/utils'

const sensorNameMap: Record<string, string> = {
  load: '起重量', moment: '力矩', radius: '幅度',
  height: '高度', rotation: '回转角度', wind: '风速',
}

const levelConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: '临界', color: 'text-accent-danger', bg: 'bg-accent-danger/10', border: 'border-accent-danger/30' },
  warning: { label: '警告', color: 'text-accent-warning', bg: 'bg-accent-warning/10', border: 'border-accent-warning/30' },
  info: { label: '提示', color: 'text-accent-primary', bg: 'bg-accent-primary/10', border: 'border-accent-primary/30' },
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  active: { label: '活跃', icon: AlertTriangle, color: 'text-accent-danger' },
  acknowledged: { label: '已确认', icon: CheckCircle, color: 'text-accent-warning' },
  resolved: { label: '已解决', icon: XCircle, color: 'text-text-muted' },
}

const conditionMap: Record<string, string> = {
  gt: '大于',
  lt: '小于',
  gte: '大于等于',
  lte: '小于等于',
}

export default function Alerts() {
  const { cranes } = useCraneStore()
  const {
    activeAlerts,
    alerts,
    alertRules,
    alertStats,
    fetchAlerts,
    fetchActiveAlerts,
    fetchAlertStats,
    fetchAlertRules,
    acknowledgeAlert,
    resolveAlert,
    createRule,
    updateRule,
    deleteRule,
  } = useAlertStore()

  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'rules'>('active')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [craneFilter, setCraneFilter] = useState<string>('')
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    crane_id: 'all',
    sensor_type: 'load',
    condition: 'gte' as const,
    threshold: 0,
    level: 'warning' as const,
    enabled: true,
  })

  useEffect(() => {
    fetchActiveAlerts()
    fetchAlertStats()
    fetchAlertRules()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAlerts({ limit: 100 })
    }
  }, [activeTab])

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id)
  }

  const handleResolve = async (id: string) => {
    await resolveAlert(id)
  }

  const openCreateRule = () => {
    setEditingRule(null)
    setRuleForm({
      name: '',
      crane_id: 'all',
      sensor_type: 'load',
      condition: 'gte',
      threshold: 0,
      level: 'warning',
      enabled: true,
    })
    setShowRuleModal(true)
  }

  const openEditRule = (rule: AlertRule) => {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      crane_id: rule.crane_id,
      sensor_type: rule.sensor_type,
      condition: rule.condition,
      threshold: rule.threshold,
      level: rule.level,
      enabled: rule.enabled,
    })
    setShowRuleModal(true)
  }

  const handleSaveRule = async () => {
    if (editingRule) {
      await updateRule(editingRule.id, ruleForm)
    } else {
      await createRule(ruleForm)
    }
    setShowRuleModal(false)
  }

  const handleDeleteRule = async (id: string) => {
    if (confirm('确定要删除这条预警规则吗？')) {
      await deleteRule(id)
    }
  }

  const toggleRuleEnabled = async (rule: AlertRule) => {
    await updateRule(rule.id, { enabled: !rule.enabled })
  }

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false
    if (levelFilter && a.level !== levelFilter) return false
    if (craneFilter && a.crane_id !== craneFilter) return false
    return true
  })

  const statsCards = [
    { label: '活跃预警', value: alertStats.active, icon: AlertTriangle, color: 'text-accent-danger' },
    { label: '临界预警', value: alertStats.critical, icon: AlertTriangle, color: 'text-accent-danger' },
    { label: '警告预警', value: alertStats.warning, icon: AlertTriangle, color: 'text-accent-warning' },
    { label: '今日预警', value: alertStats.today, icon: Clock, color: 'text-accent-primary' },
  ]

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-text-primary">预警中心</h2>
        {activeTab === 'rules' && (
          <button onClick={openCreateRule} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建规则
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {statsCards.map((card) => (
          <div key={card.label} className="glass-card p-4 flex items-center gap-3">
            <card.icon className={cn('w-5 h-5', card.color)} />
            <div>
              <div className="data-label">{card.label}</div>
              <div className={cn('font-display font-bold text-xl', card.color)}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-border-primary">
          {[
            { key: 'active', label: '活跃预警', count: activeAlerts.length },
            { key: 'history', label: '预警历史' },
            { key: 'rules', label: '预警规则' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent-danger/20 text-accent-danger text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'active' && (
            <div className="space-y-2">
              {activeAlerts.length > 0 ? (
                activeAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={handleAcknowledge}
                    onResolve={handleResolve}
                    showActions
                  />
                ))
              ) : (
                <div className="text-center py-12 text-text-muted">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-accent-secondary/50" />
                  <p>暂无活跃预警</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field w-36"
                >
                  <option value="">全部状态</option>
                  <option value="active">活跃</option>
                  <option value="acknowledged">已确认</option>
                  <option value="resolved">已解决</option>
                </select>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="input-field w-36"
                >
                  <option value="">全部级别</option>
                  <option value="critical">临界</option>
                  <option value="warning">警告</option>
                  <option value="info">提示</option>
                </select>
                <select
                  value={craneFilter}
                  onChange={(e) => setCraneFilter(e.target.value)}
                  className="input-field w-48"
                >
                  <option value="">全部塔机</option>
                  {cranes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))
                ) : (
                  <div className="text-center py-12 text-text-muted">暂无预警记录</div>
                )}
              </div>
            </>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-2">
              {alertRules.length > 0 ? (
                alertRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-all',
                      rule.enabled
                        ? 'bg-bg-tertiary/30 border-border-primary'
                        : 'bg-bg-tertiary/10 border-border-primary/50 opacity-60'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-text-primary">{rule.name}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          levelConfig[rule.level].bg,
                          levelConfig[rule.level].color,
                          levelConfig[rule.level].border,
                          'border'
                        )}>
                          {levelConfig[rule.level].label}
                        </span>
                        <span className="text-xs text-text-muted">
                          {rule.crane_id === 'all' ? '全部塔机' : cranes.find(c => c.id === rule.crane_id)?.name || rule.crane_id}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-text-secondary">
                        {sensorNameMap[rule.sensor_type] || rule.sensor_type}{' '}
                        {conditionMap[rule.condition] || rule.condition}{' '}
                        <span className="text-text-primary font-medium">{rule.threshold}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRuleEnabled(rule)}
                        className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
                      >
                        {rule.enabled ? (
                          <ToggleRight className="w-5 h-5 text-accent-secondary" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-text-muted" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditRule(rule)}
                        className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 rounded-lg hover:bg-accent-danger/10 transition-colors text-text-muted hover:text-accent-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-text-muted">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无预警规则</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card w-[500px] p-6">
            <h3 className="font-display text-lg font-bold text-text-primary mb-4">
              {editingRule ? '编辑预警规则' : '新建预警规则'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">规则名称</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="input-field"
                  placeholder="例如：起重量警告阈值"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">适用塔机</label>
                  <select
                    value={ruleForm.crane_id}
                    onChange={(e) => setRuleForm({ ...ruleForm, crane_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="all">全部塔机</option>
                    {cranes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">传感器类型</label>
                  <select
                    value={ruleForm.sensor_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, sensor_type: e.target.value })}
                    className="input-field"
                  >
                    {Object.entries(sensorNameMap).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">触发条件</label>
                  <select
                    value={ruleForm.condition}
                    onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value as any })}
                    className="input-field"
                  >
                    {Object.entries(conditionMap).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">阈值</label>
                  <input
                    type="number"
                    value={ruleForm.threshold}
                    onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })}
                    className="input-field"
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">预警级别</label>
                <div className="flex gap-3">
                  {(['critical', 'warning', 'info'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRuleForm({ ...ruleForm, level })}
                      className={cn(
                        'flex-1 py-2 rounded-lg border text-sm font-medium transition-all',
                        ruleForm.level === level
                          ? `${levelConfig[level].bg} ${levelConfig[level].color} ${levelConfig[level].border}`
                          : 'border-border-primary text-text-muted hover:text-text-secondary'
                      )}
                    >
                      {levelConfig[level].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRuleForm({ ...ruleForm, enabled: !ruleForm.enabled })}
                >
                  {ruleForm.enabled ? (
                    <ToggleRight className="w-6 h-6 text-accent-secondary" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-text-muted" />
                  )}
                </button>
                <span className="text-sm text-text-secondary">启用此规则</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRuleModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                className="btn-primary"
                disabled={!ruleForm.name || ruleForm.threshold <= 0}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  showActions = false,
}: {
  alert: Alert
  onAcknowledge?: (id: string) => void
  onResolve?: (id: string) => void
  showActions?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const level = levelConfig[alert.level]
  const status = statusConfig[alert.status]
  const StatusIcon = status.icon

  return (
    <div
      className={cn(
        'rounded-lg border transition-all overflow-hidden',
        level.bg,
        level.border,
        'border'
      )}
    >
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className={cn('w-5 h-5', level.color)} />
          <div>
            <div className="text-sm text-text-primary font-medium">{alert.message}</div>
            <div className="text-xs text-text-muted mt-0.5">
              {alert.crane_name || alert.crane_id} · {sensorNameMap[alert.sensor_type] || alert.sensor_type}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', level.bg, level.color)}>
            {level.label}
          </span>
          <span className={cn('flex items-center gap-1 text-xs', status.color)}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
          <span className="text-xs text-text-muted font-mono">
            {new Date(alert.timestamp).toLocaleString()}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border-primary/30">
          <div className="pt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">当前值：</span>
              <span className="text-text-primary font-medium">{alert.value}</span>
            </div>
            <div>
              <span className="text-text-muted">阈值：</span>
              <span className="text-text-primary font-medium">{alert.threshold}</span>
            </div>
            {alert.resolved_by && (
              <div>
                <span className="text-text-muted">处理人：</span>
                <span className="text-text-primary">{alert.resolved_by}</span>
              </div>
            )}
            {alert.resolved_at && (
              <div>
                <span className="text-text-muted">处理时间：</span>
                <span className="text-text-primary font-mono text-xs">
                  {new Date(alert.resolved_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {showActions && alert.status === 'active' && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAcknowledge?.(alert.id)
                }}
                className="btn-secondary text-xs py-1 px-3"
              >
                确认预警
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onResolve?.(alert.id)
                }}
                className="btn-primary text-xs py-1 px-3"
              >
                标记已解决
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
