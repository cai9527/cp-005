import { sensorDataRepository, type LatestSensorData, type SensorDataQuery } from '../repositories/sensorDataRepository.js'
import { craneRepository } from '../repositories/craneRepository.js'
import { alertService } from './alertService.js'
import { wsService } from './wsService.js'
import type { Crane } from '../repositories/craneRepository.js'

export interface IngestSensorDataParams {
  craneId: string
  sensorType: string
  value: number
  timestamp?: string
}

class SensorDataService {
  ingestSensorData(params: IngestSensorDataParams): void {
    const timestamp = params.timestamp || new Date().toISOString()

    sensorDataRepository.create({
      crane_id: params.craneId,
      sensor_type: params.sensorType,
      value: params.value,
      timestamp,
    })

    const matches = alertService.checkAndTriggerAlerts(params.craneId, params.sensorType, params.value)

    wsService.broadcast('sensor_update', {
      craneId: params.craneId,
      sensorType: params.sensorType,
      value: params.value,
      timestamp,
    })

    if (matches.length > 0) {
      const crane = craneRepository.findById(params.craneId)
      if (crane && crane.status !== 'alarm') {
        craneRepository.updateStatus(params.craneId, 'alarm')
        wsService.broadcast('status_change', { craneId: params.craneId, status: 'alarm' })
      }
    }
  }

  ingestBatch(dataList: IngestSensorDataParams[]): void {
    const timestamp = new Date().toISOString()
    const prepared = dataList.map((d) => ({
      crane_id: d.craneId,
      sensor_type: d.sensorType,
      value: d.value,
      timestamp: d.timestamp || timestamp,
    }))

    sensorDataRepository.createMany(prepared)

    const craneStatusChanges: Map<string, Crane['status']> = new Map()

    for (const d of prepared) {
      const matches = alertService.checkAndTriggerAlerts(d.crane_id, d.sensor_type, d.value)
      if (matches.length > 0) {
        craneStatusChanges.set(d.crane_id, 'alarm')
      }

      wsService.broadcast('sensor_update', {
        craneId: d.crane_id,
        sensorType: d.sensor_type,
        value: d.value,
        timestamp: d.timestamp,
      })
    }

    for (const [craneId, status] of craneStatusChanges) {
      const crane = craneRepository.findById(craneId)
      if (crane && crane.status !== status) {
        craneRepository.updateStatus(craneId, status)
        wsService.broadcast('status_change', { craneId, status })
      }
    }
  }

  getLatestSensorData(craneId: string): LatestSensorData[] {
    return sensorDataRepository.findLatestByCraneId(craneId)
  }

  getAllLatestSensorData(): LatestSensorData[] {
    return sensorDataRepository.findLatestAll()
  }

  getLatestAllCranes(): Map<string, LatestSensorData[]> {
    const all = sensorDataRepository.findLatestAll()
    const map = new Map<string, LatestSensorData[]>()
    for (const d of all) {
      if (!map.has(d.crane_id)) {
        map.set(d.crane_id, [])
      }
      map.get(d.crane_id)!.push(d)
    }
    return map
  }

  getHistoryData(query: SensorDataQuery) {
    return sensorDataRepository.findByQuery(query)
  }

  getAggregatedHistory(query: SensorDataQuery) {
    return sensorDataRepository.findAggregatedByQuery(query)
  }
}

export const sensorDataService = new SensorDataService()
