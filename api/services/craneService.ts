import { craneRepository, type Crane, type CraneWithSensors } from '../repositories/craneRepository.js'

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
}

export const craneService = new CraneService()
