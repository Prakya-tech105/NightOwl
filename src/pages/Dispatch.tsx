import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { StatusChip } from '../components/shared/StatusChip'
import { usePilotData } from '../hooks/usePilotData'
import { createDispatch, respondToDispatch, transitionTrip } from '../lib/api'
import { useNightOwlStore } from '../store/useNightOwlStore'
import type { Trip, TripStatus } from '../types/models'

const nextDriverStatus: Partial<Record<TripStatus, TripStatus>> = {
  ASSIGNED: 'ARRIVING',
  ARRIVING: 'IN_TRIP',
  IN_TRIP: 'COMPLETED',
}

export function DispatchPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const state = useNightOwlStore()
  const data = usePilotData()
  const [selectedZone, setSelectedZone] = useState('geo-bengaluru-ward-72')
  const demand = state.demand.find((item) => item.geographyId === selectedZone)

  const invalidateOperationalData = async () => {
    await Promise.all(
      ['trips', 'dispatches', 'drivers', 'vehicles'].map((family) =>
        queryClient.invalidateQueries({ queryKey: [family, state.currentUser?.id ?? 'anonymous'] }),
      ),
    )
  }
  const dispatchMutation = useMutation({
    mutationFn: createDispatch,
    onSuccess: invalidateOperationalData,
  })
  const responseMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'accept' | 'reject' }) =>
      respondToDispatch(id, decision),
    onSuccess: invalidateOperationalData,
  })
  const transitionMutation = useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: TripStatus }) =>
      transitionTrip(tripId, status),
    onSuccess: invalidateOperationalData,
  })
  const actionError = dispatchMutation.error ?? responseMutation.error ?? transitionMutation.error

  const activeDispatchTripIds = useMemo(
    () => new Set(
      data.dispatches
        .filter((dispatch) => ['OFFERED', 'ACCEPTED', 'ASSIGNED'].includes(dispatch.status))
        .map((dispatch) => dispatch.tripId),
    ),
    [data.dispatches],
  )
  const dispatchableTrips = data.trips.filter(
    (trip) => trip.status === 'REQUESTED' && !activeDispatchTripIds.has(trip.id),
  )

  if (data.isLoading) {
    return <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Loading dispatch data...</p>
  }
  if (data.error) {
    return <p role="alert" className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-4 text-sm text-rose-200">{data.error.message}</p>
  }

  if (state.role === 'rider') {
    const trip = data.trips[0]
    const dispatch = trip?.dispatches[0]

    return (
      <div className="mx-auto max-w-3xl">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">My Trip</h2>
              <p className="mt-1 text-sm text-slate-400">Trip and assignment details from the pilot service.</p>
            </div>
            <StatusChip label={trip?.status ?? 'No active trip'} tone={trip ? 'success' : 'warning'} />
          </header>

          {!trip ? (
            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-6 text-center">
              <p className="text-base font-medium text-slate-200">No trip requests yet.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600"
              >
                Book a Ride Now
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
                {trip.pickupLabel} to {trip.dropoffLabel}
              </p>
              {dispatch ? (
                <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200">
                  {dispatch.vehicle?.vehicleNumber ?? 'Vehicle pending'} • {dispatch.driver?.name ?? 'Driver pending'} • ETA {dispatch.etaMinutes} min
                </p>
              ) : (
                <p className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 text-sm text-amber-100">
                  Waiting for an eligible vehicle to be dispatched.
                </p>
              )}
              {trip.status === 'REQUESTED' || trip.status === 'ASSIGNED' ? (
                <button
                  type="button"
                  onClick={() => transitionMutation.mutate({ tripId: trip.id, status: 'CANCELLED' })}
                  disabled={transitionMutation.isPending}
                  className="rounded-xl border border-rose-700/60 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-50"
                >
                  Cancel trip
                </button>
              ) : null}
            </div>
          )}
          {actionError ? <p role="alert" className="mt-4 text-sm text-rose-200">{actionError.message}</p> : null}
        </section>
      </div>
    )
  }

  if (state.role === 'driver') {
    const offers = data.dispatches.filter((dispatch) => dispatch.status === 'OFFERED')
    const activeTrips = data.trips.filter((trip) => nextDriverStatus[trip.status])

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-50">Driver Dispatch</h2>
          <p className="mt-1 text-sm text-slate-400">Accept or reject offers, then report trip progress.</p>
          {offers.map((dispatch) => (
            <article key={dispatch.id} className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="font-semibold text-slate-100">{dispatch.trip?.pickupLabel} to {dispatch.trip?.dropoffLabel}</p>
              <p className="mt-1 text-sm text-slate-300">
                {dispatch.vehicle?.vehicleNumber} • ETA {dispatch.etaMinutes} min • Safety {dispatch.safetyScore}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => responseMutation.mutate({ id: dispatch.id, decision: 'accept' })}
                  disabled={responseMutation.isPending}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => responseMutation.mutate({ id: dispatch.id, decision: 'reject' })}
                  disabled={responseMutation.isPending}
                  className="rounded-lg border border-rose-700/60 px-4 py-2 text-sm font-semibold text-rose-100 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
          {activeTrips.map((trip) => (
            <DriverTripProgress
              key={trip.id}
              trip={trip}
              pending={transitionMutation.isPending}
              onAdvance={(status) => transitionMutation.mutate({ tripId: trip.id, status })}
            />
          ))}
          {!offers.length && !activeTrips.length ? (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              No open dispatch offers or active trips.
            </p>
          ) : null}
          {actionError ? <p role="alert" className="mt-4 text-sm text-rose-200">{actionError.message}</p> : null}
        </section>
      </div>
    )
  }

  const offers = data.dispatches.filter((dispatch) => dispatch.status === 'OFFERED')

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Server Dispatch</h2>
            <p className="mt-1 text-sm text-slate-400">Eligible drivers are selected by safety score and ETA on the server.</p>
          </div>
          {state.role === 'fleet_operator' ? <StatusChip label="Fleet Operator" tone="accent" /> : null}
        </header>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
          <p className="text-slate-300">Estimated rides needed: {demand?.estimatedRideDemand ?? 0}</p>
          <p className="text-slate-300">Vehicles recommended: {demand?.vehiclesNeeded ?? 0}</p>
          <p className="text-slate-300">Trips awaiting dispatch: {dispatchableTrips.length}</p>
          <label className="mt-3 flex items-center gap-2 text-slate-300">
            <span>Demand zone</span>
            <select
              value={selectedZone}
              onChange={(event) => setSelectedZone(event.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {state.geographies.map((geo) => (
                <option key={geo.id} value={geo.id}>
                  {geo.ward ?? geo.district}
                </option>
              ))}
            </select>
          </label>
        </div>

        {dispatchableTrips.map((trip) => (
          <article key={trip.id} className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <p className="font-semibold text-slate-100">{trip.rider?.displayName ?? trip.riderUserId}</p>
            <p className="mt-1 text-sm text-slate-400">{trip.pickupLabel} to {trip.dropoffLabel}</p>
            <button
              type="button"
              onClick={() => dispatchMutation.mutate(trip.id)}
              disabled={dispatchMutation.isPending}
              className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {dispatchMutation.isPending && dispatchMutation.variables === trip.id ? 'Assigning...' : 'Assign eligible driver'}
            </button>
          </article>
        ))}
        {!dispatchableTrips.length ? (
          <p className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-400">
            No trips are currently awaiting dispatch.
          </p>
        ) : null}
        {actionError ? <p role="alert" className="mt-4 text-sm text-rose-200">{actionError.message}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="text-lg font-semibold text-slate-50">Live Dispatch Queue</h2>
        <div className="mt-4 space-y-2">
          {offers.map((dispatch) => (
            <article key={dispatch.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-100">{dispatch.trip?.rider?.displayName ?? dispatch.tripId}</p>
                <StatusChip label={dispatch.status} tone="warning" />
              </div>
              <p className="mt-1 text-slate-300">
                {dispatch.driver?.name} • {dispatch.vehicle?.vehicleNumber} • ETA {dispatch.etaMinutes} min • Safety {dispatch.safetyScore}
              </p>
              <p className="mt-1 text-xs text-slate-500">{dispatch.trip?.pickupLabel} to {dispatch.trip?.dropoffLabel}</p>
            </article>
          ))}
          {!offers.length ? (
            <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-400">
              No open dispatch offers at the moment.
            </p>
          ) : null}
          {data.trips.slice(0, 10).map((trip) => (
            <article key={trip.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-100">{trip.rider?.displayName ?? trip.riderUserId}</p>
                <StatusChip label={trip.status} tone={trip.status === 'COMPLETED' ? 'success' : 'accent'} />
              </div>
              <p className="mt-1 text-slate-400">{trip.pickupLabel} to {trip.dropoffLabel}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(trip.requestedAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function DriverTripProgress(props: {
  trip: Trip
  pending: boolean
  onAdvance: (status: TripStatus) => void
}) {
  const nextStatus = nextDriverStatus[props.trip.status]
  if (!nextStatus) return null

  return (
    <article className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <p className="font-semibold text-slate-100">{props.trip.pickupLabel} to {props.trip.dropoffLabel}</p>
      <p className="mt-1 text-sm text-slate-400">Current status: {props.trip.status}</p>
      <button
        type="button"
        onClick={() => props.onAdvance(nextStatus)}
        disabled={props.pending}
        className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Mark {nextStatus.replace('_', ' ')}
      </button>
    </article>
  )
}
