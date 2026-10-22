import { create } from 'zustand'
import { demandRecords, geographies, zoneRiskWeights } from '../data/mockData'
import {
  ApiError,
  clearAccessToken,
  fetchCurrentUser,
  getAccessToken,
  getRoleForUser,
  saveAccessToken,
} from '../lib/api'
import { queryClient } from '../lib/queryClient'
import {
  calculateCoverageGap,
  calculatePriorityScore,
  estimateNightWorkers,
  estimateRideDemand,
  estimateVehiclesNeeded,
} from '../lib/calculations'
import { getSafetyBadge } from '../lib/safety'
import type {
  DemandRecord,
  Dispatch,
  Driver,
  Geography,
  Role,
  Vehicle,
} from '../types/models'
import type { AuthUser } from '../lib/api'

type NightOwlState = {
  role: Role | null
  currentUser: AuthUser | null
  authStatus: 'loading' | 'authenticated' | 'anonymous' | 'error'
  authError: string | null
  geographies: Geography[]
  demand: DemandRecord[]
  demandSettings: {
    nightShiftRatio: number
    transportNeedRatio: number
    urbanWeight: number
    averageCapacityPerVehicle: number
  }
  selectedPickupLocality: string
  loginWithToken: (token: string, user: AuthUser) => void
  restoreSession: () => Promise<void>
  logout: () => void
  setSelectedPickupLocality: (locality: string) => void
  updateDemandSettings: (settings: Partial<NightOwlState['demandSettings']>) => void
  recalculateDemandForZone: (geographyId: string) => void
}

export const useNightOwlStore = create<NightOwlState>((set) => ({
  role: null,
  currentUser: null,
  authStatus: 'loading',
  authError: null,
  geographies,
  demand: demandRecords,
  demandSettings: {
    nightShiftRatio: 0.35,
    transportNeedRatio: 0.68,
    urbanWeight: 1,
    averageCapacityPerVehicle: 14,
  },
  selectedPickupLocality: 'Indiranagar',

  loginWithToken: (token, user) => {
    saveAccessToken(token)
    queryClient.clear()
    set({ role: getRoleForUser(user), currentUser: user, authStatus: 'authenticated', authError: null })
  },
  restoreSession: async () => {
    const token = getAccessToken()
    if (!token) {
      queryClient.clear()
      set({ role: null, currentUser: null, authStatus: 'anonymous', authError: null })
      return
    }

    set({ authStatus: 'loading', authError: null })
    try {
      const user = await fetchCurrentUser()
      set({ role: getRoleForUser(user), currentUser: user, authStatus: 'authenticated', authError: null })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken()
        queryClient.clear()
        set({ role: null, currentUser: null, authStatus: 'anonymous', authError: null })
        return
      }
      set({
        authStatus: 'error',
        authError: error instanceof Error ? error.message : 'Unable to verify your session.',
      })
    }
  },
  logout: () => {
    clearAccessToken()
    queryClient.clear()
    set({ role: null, currentUser: null, authStatus: 'anonymous', authError: null })
  },
  setSelectedPickupLocality: (locality) =>
    set({
      selectedPickupLocality: locality.trim() || 'Indiranagar',
    }),

  updateDemandSettings: (settings) =>
    set((state) => ({
      demandSettings: { ...state.demandSettings, ...settings },
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

}))

export function buildKpiSnapshot(
  state: Pick<NightOwlState, 'demand' | 'geographies'>,
  drivers: Driver[],
  vehicles: Vehicle[],
  dispatches: Dispatch[],
) {
  const expectedRiders = state.demand.reduce((total, record) => total + record.estimatedRideDemand, 0)
  const vehiclesNeeded = state.demand.reduce((total, record) => total + record.vehiclesNeeded, 0)
  const activeVehicles = vehicles.filter((vehicle) => vehicle.available && vehicle.readiness === 'ready').length
  const verifiedDrivers = drivers.filter((driver) => driver.safetyScore >= 75).length
  const coverage = vehiclesNeeded > 0 ? Math.round((activeVehicles / vehiclesNeeded) * 100) : 0
  const avgEta = Math.round(
    dispatches.reduce((total, dispatch) => total + dispatch.etaMinutes, 0) /
      Math.max(dispatches.length, 1),
  )

  const unsafeGaps = state.demand.reduce((total, record) => {
    const zone = state.geographies.find((geo) => geo.id === record.geographyId)
    const zoneName = zone?.ward ?? zone?.district ?? ''
    const zoneVehicles = vehicles.filter((vehicle) => vehicle.zone === zoneName && vehicle.available).length

    return total + calculateCoverageGap(record.vehiclesNeeded, zoneVehicles)
  }, 0)

  return {
    expectedRiders,
    vehiclesNeeded,
    activeVehicles,
    verifiedDriverRate: Math.round((verifiedDrivers / Math.max(drivers.length, 1)) * 100),
    coverage: Math.min(100, coverage),
    unsafeGaps,
    avgEta,
  }
}

export function getZonePriorityRows(
  state: Pick<NightOwlState, 'demand' | 'geographies'>,
  vehicles: Vehicle[],
  dispatches: Dispatch[],
) {
  return state.demand
    .map((record) => {
      const geo = state.geographies.find((item) => item.id === record.geographyId)
      const zoneName = geo?.ward ?? geo?.district ?? 'Unknown'
      const available = vehicles.filter((vehicle) => vehicle.zone === zoneName && vehicle.available).length
      const coverageGap = calculateCoverageGap(record.vehiclesNeeded, available)
      const zoneDispatches = dispatches.filter((dispatch) => {
        const trip = dispatch.trip
        return trip?.pickupLabel.toLowerCase().includes(zoneName.toLowerCase())
      })
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
