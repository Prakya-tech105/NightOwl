import { useQuery } from '@tanstack/react-query'
import {
  fetchDispatches,
  fetchDrivers,
  fetchRiders,
  fetchSafetyWeights,
  fetchTrips,
  fetchVehicles,
} from '../lib/api'
import { useNightOwlStore } from '../store/useNightOwlStore'

export function usePilotData() {
  const user = useNightOwlStore((state) => state.currentUser)
  const role = useNightOwlStore((state) => state.role)
  const authenticated = useNightOwlStore((state) => state.authStatus === 'authenticated')
  const isOperationsUser = role === 'super_admin' || role === 'company_admin' || role === 'fleet_operator'
  const canReadRiders = isOperationsUser || role === 'rider'
  const userKey = user?.id ?? 'anonymous'

  const driversQuery = useQuery({
    queryKey: ['drivers', userKey],
    queryFn: fetchDrivers,
    enabled: authenticated && isOperationsUser,
  })
  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', userKey],
    queryFn: fetchVehicles,
    enabled: authenticated && isOperationsUser,
  })
  const tripsQuery = useQuery({
    queryKey: ['trips', userKey],
    queryFn: fetchTrips,
    enabled: authenticated,
  })
  const dispatchesQuery = useQuery({
    queryKey: ['dispatches', userKey],
    queryFn: fetchDispatches,
    enabled: authenticated,
  })
  const ridersQuery = useQuery({
    queryKey: ['riders', userKey],
    queryFn: fetchRiders,
    enabled: authenticated && canReadRiders,
  })
  const safetyWeightsQuery = useQuery({
    queryKey: ['safetyWeights', userKey],
    queryFn: fetchSafetyWeights,
    enabled: authenticated && isOperationsUser,
  })

  const activeQueries = isOperationsUser
    ? [driversQuery, vehiclesQuery, tripsQuery, dispatchesQuery, ridersQuery, safetyWeightsQuery]
    : role === 'rider'
      ? [tripsQuery, dispatchesQuery, ridersQuery]
      : [tripsQuery, dispatchesQuery]

  return {
    drivers: driversQuery.data ?? [],
    vehicles: vehiclesQuery.data ?? [],
    trips: tripsQuery.data ?? [],
    dispatches: dispatchesQuery.data ?? [],
    riders: ridersQuery.data ?? [],
    safetyWeights: safetyWeightsQuery.data,
    isLoading: activeQueries.some((query) => query.isLoading),
    error: activeQueries.find((query) => query.error)?.error ?? null,
  }
}
