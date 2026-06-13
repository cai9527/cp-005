import { alertRepository, type Alert, type AlertRule } from '../repositories/alertRepository.js'
import { craneRepository } from '../repositories/craneRepository.js'
import { wsService } from './wsService.js'
import type { IngestSensorDataParams } from './sensorDataService.js'

const sensorNameMap: Record<string, string> = {
  load: '起重量',
  moment: '力矩',
  radius: '幅度',
  height: '高度',
  rotation: '回转角度',
  wind: '风速',
}

const conditionTextMap: Record<string, string> = {
  gt: '超过',
  lt: '低于',
  gte: '达到',
  lte: '降到',
}

class AlertService {
  checkAndTriggerAlerts(craneId: string, sensorType: string, value: number): Alert[] {
    const rules = alertRepository.findMatchingRules(craneId, sensorType, value)
    const triggered: Alert[] = []

    const activeAlerts = this.getActiveAlertsByCraneAndSensor(craneId, sensorType)

    for (const rule of rules) {
      const alreadyActive = activeAlerts.some((a) => {
        if (rule.crane_id !== 'all' && a.rule_id !== rule.id) return false
        return a.level === rule.level && a.status === 'active'
      })

      if (!alreadyActive) {
        const alert = this.triggerAlert(craneId, sensorType, value, rule)
        triggered.push(alert)
      }
    }

    return triggered
  }

  private triggerAlert(craneId: string, sensorType: string, value: number, rule: AlertRule): Alert {
    const crane = craneRepository.findById(craneId)
    const craneName = crane?.name || '未知塔机'
    const sensorName = sensorNameMap[sensorType] || sensorType
    const conditionText = conditionTextMap[rule.condition] || rule.condition
    const levelText = rule.level === 'critical' ? '临界报警' : rule.level === 'warning' ? '警告' : '提示'

    const message = `[${levelText}] ${craneName} ${sensorName}${conditionText}阈值！当前值: ${value.toFixed(2)}${this.getSensorUnit(sensorType)}, 阈值: ${rule.threshold}${this.getSensorUnit(sensorType)}`

    const alert = alertRepository.createAlert({
      crane_id: craneId,
      rule_id: rule.id,
      sensor_type: sensorType,
      level: rule.level,
      message,
      value,
      threshold: rule.threshold,
      timestamp: new Date().toISOString(),
      status: 'active',
    })

    wsService.broadcast('alert', {
      ...alert,
      craneName,
    })

    return alert
  }

  private getSensorUnit(type: string): string {
    const units: Record<string, string> = {
      load: 't',
      moment: 't·m',
      radius: 'm',
      height: 'm',
      rotation: '°',
      wind: 'm/s',
    }
    return units[type] || ''
  }

  private getActiveAlertsByCraneAndSensor(craneId: string, sensorType: string): Alert[] {
    return alertRepository
      .findAllAlerts({ status: 'active' })
      .filter((a) => a.crane_id === craneId && a.sensor_type === sensorType)
  }

  getAllAlerts(params?: { status?: string; craneId?: string; level?: string; startTime?: string; endTime?: string; limit?: number }): Alert[] {
    return alertRepository.findAllAlerts(params)
  }

  getActiveAlerts(): Alert[] {
    return alertRepository.findActiveAlerts()
  }

  getAlertById(id: string): Alert | undefined {
    return alertRepository.findAlertById(id)
  }

  acknowledgeAlert(id: string, resolvedBy?: string): boolean {
    const alert = alertRepository.findAlertById(id)
    if (!alert) return false
    alertRepository.acknowledgeAlert(id, resolvedBy)
    wsService.broadcast('alert_status', { id, status: 'acknowledged' })
    return true
  }

  resolveAlert(id: string, resolvedBy: string): boolean {
    const alert = alertRepository.findAlertById(id)
    if (!alert) return false
    alertRepository.resolveAlert(id, resolvedBy)
    wsService.broadcast('alert_status', { id, status: 'resolved' })
    return true
  }

  getAllRules(craneId?: string): AlertRule[] {
    return alertRepository.findAllRules(craneId)
  }

  createRule(data: Omit<AlertRule, 'id'>): AlertRule {
    return alertRepository.createRule(data)
  }

  updateRule(id: string, data: Partial<Omit<AlertRule, 'id'>>): boolean {
    const rule = alertRepository.findRuleById(id)
    if (!rule) return false
    alertRepository.updateRule(id, data)
    return true
  }

  deleteRule(id: string): boolean {
    const rule = alertRepository.findRuleById(id)
    if (!rule) return false
    alertRepository.deleteRule(id)
    return true
  }

  getAlertStats() {
    return alertRepository.getAlertStats()
  }

  resolveAlertsForCrane(craneId: string): void {
    const active = alertRepository.findActiveAlerts().filter((a) => a.crane_id === craneId)
    for (const alert of active) {
      alertRepository.resolveAlert(alert.id, 'system')
      wsService.broadcast('alert_status', { id: alert.id, status: 'resolved' })
    }
  }
}

export const alertService = new AlertService()
