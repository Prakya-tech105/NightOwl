import { create } from 'zustand'
import { demandRecords, drivers, geographies, riders, vehicles, zoneRiskWeights } from '../data/mockData'
import {
  calculateCoverageGap,
  calculatePriorityScore,
  estimateNightWorkers,
  estimateRideDemand,
  estimateVehiclesNeeded,
} from '../lib/calculations'
import {
  calculateSafetyScore,
  canDispatchDriver,
  defaultSafetyWeights,
  getSafetyBadge,
} from '../lib/safety'
import type {
  DemandRecord,
  Dispatch,
  DispatchStatus,
  Driver,
  Geography,
  Rider,
  Role,
  SafetyWeights,
  Vehicle,
} from '../types/models'

type NightOwlState = {
  role: Role | null
  geographies: Geography[]
  demand: DemandRecord[]
  drivers: Driver[]
  vehicles: Vehicle[]
  riders: Rider[]
  dispatches: Dispatch[]
  demandSettings: {
    nightShiftRatio: number
    transportNeedRatio: number
    urbanWeight: number
    averageCapacityPerVehicle: number
  }
  safetyWeights: SafetyWeights
  selectedPickupLocality: string
  loginAsDemoRole: (role: Role) => void
  logout: () => void
  setSelectedPickupLocality: (locality: string) => void
  updateDemandSettings: (settings: Partial<NightOwlState['demandSettings']>) => void
  updateSafetyWeights: (weights: Partial<SafetyWeights>) => void
  recalculateDemandForZone: (geographyId: string) => void
  recommendVehicles: (geographyId: string) => Vehicle[]
  createDispatches: (geographyId: string, vehicleIds: string[]) => number
  updateDispatchStatus: (dispatchId: string, status: DispatchStatus) => void
  assignDispatchToRider: (riderId: string, dispatchId: string) => void
}

function createInitialDispatches(): Dispatch[] {
  const ward72 = demandRecords.find((record) => record.geographyId === 'geo-bengaluru-ward-72')
  if (!ward72) return []

  const seedVehicles = vehicles.filter((vehicle) => vehicle.zone === 'Ward 72').slice(0, 5)

  return seedVehicles.map((vehicle, index) => {
    const driver = drivers.find((item) => item.id === vehicle.driverId)
    const score = driver ? driver.safetyScore : 0

    return {
      id: `dsp-seed-${index + 1}`,
      geographyId: ward72.geographyId,
      demandRecordId: ward72.id,
      vehicleId: vehicle.id,
      driverId: vehicle.driverId,
      etaMinutes: vehicle.etaMinutes,
      safetyScore: score,
      status: index < 2 ? 'en_route' : 'assigned',
      createdAt: new Date(Date.now() - (index + 1) * 1000 * 60 * 6).toISOString(),
    }
  })
}

export const useNightOwlStore = create<NightOwlState>((set, get) => ({
  role: null,
  geographies,
  demand: demandRecords,
  drivers,
  vehicles,
  riders,
  dispatches: createInitialDispatches(),
  demandSettings: {
    nightShiftRatio: 0.35,
    transportNeedRatio: 0.68,
    urbanWeight: 1,
    averageCapacityPerVehicle: 14,
  },
  safetyWeights: defaultSafetyWeights,
  selectedPickupLocality: 'Indiranagar',

  loginAsDemoRole: (role) => set({ role }),
  logout: () => set({ role: null }),
  setSelectedPickupLocality: (locality) =>
    set({
      selectedPickupLocality: locality.trim() || 'Indiranagar',
    }),

  updateDemandSettings: (settings) =>
    set((state) => ({
      demandSettings: { ...state.demandSettings, ...settings },
    })),

  updateSafetyWeights: (weights) =>
    set((state) => ({
      safetyWeights: { ...state.safetyWeights, ...weights },
      drivers: state.drivers.map((driver) => ({
        ...driver,
        safetyScore: calculateSafetyScore(driver, { ...state.safetyWeights, ...weights }),
      })),
    })),

  recalculateDemandForZone: (geographyId) =>
    set((state) => ({
      demand: state.demand.map((record) => {
        if (record.geographyId !== geographyId) {
          return record
        }

        const nextInput = {
          femaleWorkers: record.femaleWorkers,
          nightShiftRatio: state.demandSettings.nightShiftRatio,
          transportNeedRatio: state.demandSettings.transportNeedRatio,
          urbanWeight: state.demandSettings.urbanWeight,
        }

        const estimatedRideDemand = estimateRideDemand(nextInput)

        return {
          ...record,
          nightShiftRatio: nextInput.nightShiftRatio,
          transportNeedRatio: nextInput.transportNeedRatio,
          urbanWeight: nextInput.urbanWeight,
          estimatedNightWorkers: estimateNightWorkers(nextInput),
          estimatedRideDemand,
          vehiclesNeeded: estimateVehiclesNeeded(
            estimatedRideDemand,
            state.demandSettings.averageCapacityPerVehicle,
          ),
          timestamp: new Date().toISOString(),
        }
      }),
    })),

  recommendVehicles: (geographyId) => {
    const state = get()
    const zone = state.geographies.find((item) => item.id === geographyId)
    const demandRecord = state.demand.find((item) => item.geographyId === geographyId)

    if (!zone || !demandRecord) return []

    const zoneName = zone.ward ?? zone.district
    const eligibleVehicles = state.vehicles
      .filter((vehicle) => vehicle.zone === zoneName && vehicle.available && vehicle.readiness === 'ready')
      .filter((vehicle) => {
        const driver = state.drivers.find((item) => item.id === vehicle.driverId)
        return driver ? canDispatchDriver(driver.safetyScore) && driver.status !== 'offline' : false
      })
      .sort((a, b) => a.etaMinutes - b.etaMinutes)

    return eligibleVehicles.slice(0, demandRecord.vehiclesNeeded)
  },

  createDispatches: (geographyId, vehicleIds) => {
    const state = get()
    const demandRecord = state.demand.find((item) => item.geographyId === geographyId)
    if (!demandRecord) return 0

    let created = 0
    const newDispatches: Dispatch[] = []

    vehicleIds.forEach((vehicleId, index) => {
      const vehicle = state.vehicles.find((item) => item.id === vehicleId)
      if (!vehicle) return

      const driver = state.drivers.find((item) => item.id === vehicle.driverId)
      if (!driver || !canDispatchDriver(driver.safetyScore)) return

      newDispatches.push({
        id: `dsp-${Date.now()}-${index}`,
        geographyId,
        demandRecordId: demandRecord.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        etaMinutes: vehicle.etaMinutes,
        safetyScore: driver.safetyScore,
        status: 'assigned',
        createdAt: new Date().toISOString(),
      })
      created += 1
    })

    if (newDispatches.length === 0) return 0

    set((current) => ({
      dispatches: [...newDispatches, ...current.dispatches],
      vehicles: current.vehicles.map((vehicle) =>
        vehicleIds.includes(vehicle.id) ? { ...vehicle, available: false } : vehicle,
      ),
      drivers: current.drivers.map((driver) =>
        vehicleIds.some((vehicleId) => {
          const mappedVehicle = current.vehicles.find((vehicle) => vehicle.id === vehicleId)
          return mappedVehicle?.driverId === driver.id
        })
          ? { ...driver, status: 'assigned' }
          : driver,
      ),
      riders: current.riders.map((rider, index) =>
        index < newDispatches.length && !rider.assignedDispatchId
          ? { ...rider, assignedDispatchId: newDispatches[index].id }
          : rider,
      ),
    }))

    return created
  },

  updateDispatchStatus: (dispatchId, status) =>
    set((state) => ({
      dispatches: state.dispatches.map((dispatch) =>
        dispatch.id === dispatchId ? { ...dispatch, status } : dispatch,
      ),
    })),

  assignDispatchToRider: (riderId, dispatchId) =>
    set((state) => ({
      riders: state.riders.map((rider) =>
        rider.id === riderId ? { ...rider, assignedDispatchId: dispatchId } : rider,
      ),
    })),
}))

export function buildKpiSnapshot(state: NightOwlState) {
  const expectedRiders = state.demand.reduce((total, record) => total + record.estimatedRideDemand, 0)
  const vehiclesNeeded = state.demand.reduce((total, record) => total + record.vehiclesNeeded, 0)
  const activeVehicles = state.vehicles.filter((vehicle) => vehicle.available).length
  const verifiedDrivers = state.drivers.filter((driver) => driver.safetyScore >= 75).length
  const coverage = vehiclesNeeded > 0 ? Math.round((activeVehicles / vehiclesNeeded) * 100) : 0
  const avgEta = Math.round(
    state.dispatches.reduce((total, dispatch) => total + dispatch.etaMinutes, 0) /
      Math.max(state.dispatches.length, 1),
  )

  const unsafeGaps = state.demand.reduce((total, record) => {
    const zone = state.geographies.find((geo) => geo.id === record.geographyId)
    const zoneName = zone?.ward ?? zone?.district ?? ''
    const zoneVehicles = state.vehicles.filter((vehicle) => vehicle.zone === zoneName && vehicle.available).length

    return total + calculateCoverageGap(record.vehiclesNeeded, zoneVehicles)
  }, 0)

  return {
    expectedRiders,
    vehiclesNeeded,
    activeVehicles,
    verifiedDriverRate: Math.round((verifiedDrivers / Math.max(state.drivers.length, 1)) * 100),
    coverage: Math.min(100, coverage),
    unsafeGaps,
    avgEta,
  }
}

export function getZonePriorityRows(state: NightOwlState) {
  return state.demand
    .map((record) => {
      const geo = state.geographies.find((item) => item.id === record.geographyId)
      const zoneName = geo?.ward ?? geo?.district ?? 'Unknown'
      const available = state.vehicles.filter((vehicle) => vehicle.zone === zoneName && vehicle.available).length
      const coverageGap = calculateCoverageGap(record.vehiclesNeeded, available)
      const zoneDispatches = state.dispatches.filter((dispatch) => dispatch.geographyId === record.geographyId)
      const avgEta = Math.round(
        zoneDispatches.reduce((total, dispatch) => total + dispatch.etaMinutes, 0) /
          Math.max(zoneDispatches.length, 1),
      )
      const etaStress = Math.min(100, avgEta * 4)

      return {
        geographyId: record.geographyId,
        zoneName,
        demand: record.estimatedRideDemand,
        coverageGap,
        avgEta,
        score: calculatePriorityScore({
          demand: record.estimatedRideDemand,
          coverageGap,
          riskWeight: zoneRiskWeights[record.geographyId] ?? 50,
          etaStress,
        }),
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function describeSafetyBadge(score: number): string {
  const badge = getSafetyBadge(score)
  if (badge === 'trusted') return 'Trusted'
  if (badge === 'safe') return 'Safe'
  if (badge === 'review') return 'Review'
  return 'Do Not Dispatch'
}
