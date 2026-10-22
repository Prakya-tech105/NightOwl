import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusChip } from '../components/shared/StatusChip'
import { usePilotData } from '../hooks/usePilotData'
import {
  reportDriverLocation,
  respondToDispatch,
  stopDriverLocation,
  transitionTrip,
} from '../lib/api'
import { useNightOwlStore } from '../store/useNightOwlStore'
import type { TripStatus } from '../types/models'

const nextTripStatus: Partial<Record<TripStatus, TripStatus>> = {
  ASSIGNED: 'ARRIVING',
  ARRIVING: 'IN_TRIP',
  IN_TRIP: 'COMPLETED',
}

const locationOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10_000,
}

function describeLocationError(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return 'Location permission was denied. Enable it in browser settings to share GPS.'
  if (error.code === error.POSITION_UNAVAILABLE) return 'Your current location is unavailable. Try again when GPS has a signal.'
  if (error.code === error.TIMEOUT) return 'The location request timed out. Try again.'
  return error.message || 'Unable to read your location.'
}

export function DriverPwaPage() {
  const user = useNightOwlStore((state) => state.currentUser)
  const queryClient = useQueryClient()
  const data = usePilotData()
  const [sharingTripId, setSharingTripId] = useState<string | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [lastReportedAt, setLastReportedAt] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const activeTrip = useMemo(
    () => data.trips.find((trip) => ['ASSIGNED', 'ARRIVING', 'IN_TRIP'].includes(trip.status)),
    [data.trips],
  )
  const activeTripNextStatus = activeTrip ? nextTripStatus[activeTrip.status] : undefined
  const isGpsSharing = activeTrip?.id === sharingTripId

  const refreshDriverData = async () => {
    const userId = user?.id ?? 'anonymous'
    await Promise.all(
      ['trips', 'dispatches', 'drivers', 'vehicles'].map((family) =>
        queryClient.invalidateQueries({ queryKey: [family, userId] }),
      ),
    )
  }
  const responseMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'accept' | 'reject' }) =>
      respondToDispatch(id, decision),
    onSuccess: refreshDriverData,
  })
  const transitionMutation = useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: TripStatus }) =>
      transitionTrip(tripId, status),
    onSuccess: async (trip) => {
      if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
        setSharingTripId(null)
      }
      await refreshDriverData()
    },
  })
  const locationMutation = useMutation({
    mutationFn: reportDriverLocation,
    onSuccess: async () => {
      setLastReportedAt(new Date())
      setGpsError(null)
      await queryClient.invalidateQueries({ queryKey: ['drivers', user?.id ?? 'anonymous'] })
    },
  })
  const stopLocationMutation = useMutation({
    mutationFn: stopDriverLocation,
    onSuccess: async () => {
      setGpsError(null)
      await queryClient.invalidateQueries({ queryKey: ['drivers', user?.id ?? 'anonymous'] })
    },
    onError: (error) => setGpsError(error.message),
  })

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)
    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  useEffect(() => {
    if (!isGpsSharing || !activeTrip) return

    let isActive = true
    let requestPending = false
    const reportCurrentPosition = () => {
      if (!isActive || requestPending) return
      if (!navigator.onLine) {
        setGpsError('You are offline. Location is not stored; reporting will resume when online.')
        return
      }
      if (!navigator.geolocation) {
        setGpsError('This browser does not provide location services.')
        return
      }

      requestPending = true
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void reportDriverLocation({
            active: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          }).then(() => {
            if (isActive) {
              setLastReportedAt(new Date())
              setGpsError(null)
            }
          }).catch((error: unknown) => {
            if (isActive) {
              setGpsError(error instanceof Error ? error.message : 'Location report failed.')
            }
          }).finally(() => {
            requestPending = false
          })
        },
        (error) => {
          if (isActive) setGpsError(describeLocationError(error))
          requestPending = false
        },
        locationOptions,
      )
    }
    const interval = window.setInterval(reportCurrentPosition, 15_000)

    return () => {
      isActive = false
      window.clearInterval(interval)
    }
  }, [activeTrip, isGpsSharing])

  const startGpsSharing = () => {
    if (!activeTrip) {
      setGpsError('GPS sharing is available only during an active assigned trip.')
      return
    }
    if (!navigator.onLine) {
      setGpsError('You are offline. No location points will be buffered.')
      return
    }
    if (!navigator.geolocation) {
      setGpsError('This browser does not provide location services.')
      return
    }

    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationMutation.mutate({
          active: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        }, {
          onSuccess: () => setSharingTripId(activeTrip.id),
        })
      },
      (error) => setGpsError(describeLocationError(error)),
      locationOptions,
    )
  }

  const stopGpsSharing = () => {
    setSharingTripId(null)
    stopLocationMutation.mutate()
  }

  if (data.isLoading) {
    return <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Loading driver trip data...</p>
  }
  if (data.error) {
    return <p role="alert" className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-4 text-sm text-rose-200">{data.error.message}</p>
  }

  const offers = data.dispatches.filter((dispatch) => dispatch.status === 'OFFERED')

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Driver app</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-50">Your trip</h1>
          </div>
          <StatusChip label={activeTrip?.status ?? 'No active trip'} tone={activeTrip ? 'success' : 'warning'} />
        </header>

        {activeTrip ? (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="font-semibold text-slate-100">{activeTrip.pickupLabel} to {activeTrip.dropoffLabel}</p>
            <p className="mt-1 text-sm text-slate-400">Trip progress: {activeTrip.status}</p>
            {activeTripNextStatus ? (
              <button
                type="button"
                onClick={() => transitionMutation.mutate({
                  tripId: activeTrip.id,
                  status: activeTripNextStatus,
                })}
                disabled={transitionMutation.isPending}
                className="mt-3 min-h-11 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Mark {activeTripNextStatus.replace('_', ' ')}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
            Accept a dispatch offer to begin an active trip.
          </p>
        )}

        {offers.map((dispatch) => (
          <article key={dispatch.id} className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4">
            <p className="font-semibold text-slate-100">{dispatch.trip?.pickupLabel} to {dispatch.trip?.dropoffLabel}</p>
            <p className="mt-1 text-sm text-slate-300">
              {dispatch.vehicle?.vehicleNumber} · ETA {dispatch.etaMinutes} min · Safety {dispatch.safetyScore}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => responseMutation.mutate({ id: dispatch.id, decision: 'accept' })}
                disabled={responseMutation.isPending}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => responseMutation.mutate({ id: dispatch.id, decision: 'reject' })}
                disabled={responseMutation.isPending}
                className="min-h-11 rounded-lg border border-rose-700/60 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">GPS sharing</h2>
            <p className="mt-1 text-sm text-slate-400">
              Foreground-only, during an assigned trip; updates every 15 seconds. Offline locations are not buffered.
            </p>
          </div>
          <StatusChip label={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'success' : 'warning'} />
        </div>
        {activeTrip ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {isGpsSharing ? (
              <button
                type="button"
                onClick={stopGpsSharing}
                disabled={stopLocationMutation.isPending}
                className="min-h-11 rounded-lg border border-rose-700/60 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-50"
              >
                Stop sharing
              </button>
            ) : (
              <button
                type="button"
                onClick={startGpsSharing}
                disabled={locationMutation.isPending || !isOnline}
                className="min-h-11 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {locationMutation.isPending ? 'Starting GPS...' : 'Start GPS sharing'}
              </button>
            )}
            {lastReportedAt ? (
              <p className="text-xs text-slate-400">Last reported {lastReportedAt.toLocaleTimeString()}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">GPS is off because there is no active assigned trip.</p>
        )}
        {gpsError ? <p role="alert" className="mt-3 text-sm text-rose-200">{gpsError}</p> : null}
        {transitionMutation.error || responseMutation.error || locationMutation.error || stopLocationMutation.error ? (
          <p role="alert" className="mt-3 text-sm text-rose-200">
            {(transitionMutation.error ?? responseMutation.error ?? locationMutation.error ?? stopLocationMutation.error)?.message}
          </p>
        ) : null}
      </section>
    </div>
  )
}
