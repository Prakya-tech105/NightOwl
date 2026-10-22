import { useMemo, useState } from 'react'
import { Phone, Share2, Siren } from 'lucide-react'
import { StatusChip } from '../components/shared/StatusChip'
import { describeSafetyBadge, useNightOwlStore } from '../store/useNightOwlStore'
import { usePilotData } from '../hooks/usePilotData'

function RidersOperationsView() {
  const data = usePilotData()
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [sosTriggered, setSosTriggered] = useState(false)

  const selectedRider = data.riders.find((rider) => rider.id === selectedRiderId) ?? data.riders[0]
  const assignedDispatch = data.dispatches.find((dispatch) => dispatch.id === selectedRider?.assignedDispatchId)
  const driver = assignedDispatch?.driver
  const vehicle = assignedDispatch?.vehicle

  const statusText = (() => {
    if (!assignedDispatch) return 'No ride assigned'
    if (assignedDispatch.trip?.status === 'ASSIGNED') return 'Ride assigned'
    if (assignedDispatch.trip?.status === 'ARRIVING') return 'Driver arriving'
    if (assignedDispatch.trip?.status === 'IN_TRIP') return 'Trip in progress'
    if (assignedDispatch.trip?.status === 'COMPLETED') return 'Trip completed'
    return assignedDispatch.trip?.status.replace('_', ' ') ?? assignedDispatch.status
  })()

  if (data.isLoading) {
    return <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Loading riders...</p>
  }
  if (data.error) {
    return <p role="alert" className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-4 text-sm text-rose-200">{data.error.message}</p>
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="text-lg font-semibold text-slate-50">Rider List</h2>
        <div className="mt-3 space-y-2">
          {data.riders.slice(0, 14).map((rider) => (
            <button
              key={rider.id}
              onClick={() => {
                setSelectedRiderId(rider.id)
                setSosTriggered(false)
              }}
              className={[
                'w-full rounded-xl border p-3 text-left text-sm',
                rider.id === selectedRiderId
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-950/70 hover:border-slate-500',
              ].join(' ')}
            >
              <p className="font-semibold text-slate-100">{rider.name}</p>
              <p className="text-slate-400">
                {rider.pickupZone} • Shift {rider.shiftEndTime}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        {!selectedRider ? (
          <p className="text-sm text-slate-300">Select a rider to see details.</p>
        ) : (
          <div className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">{selectedRider.name}</h2>
                <p className="text-sm text-slate-400">
                  {selectedRider.phone} • {selectedRider.pickupZone}
                </p>
              </div>
              <StatusChip label={statusText} tone={assignedDispatch ? 'success' : 'warning'} />
            </header>

            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
                <p className="text-slate-400">Assigned Vehicle</p>
                <p className="mt-1 font-semibold text-slate-100">
                  {vehicle?.vehicleNumber ?? 'Pending assignment'}
                </p>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
                <p className="text-slate-400">Driver</p>
                <p className="mt-1 font-semibold text-slate-100">{driver?.name ?? 'Pending assignment'}</p>
                {driver ? <p className="text-slate-400">{driver.phone}</p> : null}
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
                <p className="text-slate-400">ETA / Safety</p>
                <p className="mt-1 font-semibold text-slate-100">{assignedDispatch?.etaMinutes ?? '--'} min</p>
                <p className="text-slate-300">{driver ? describeSafetyBadge(driver.safetyScore) : '--'}</p>
              </article>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <button
                onClick={() => setSosTriggered(true)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-500"
              >
                <Siren size={18} />
                SOS
              </button>
              <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 hover:bg-slate-800">
                <Share2 size={16} />
                Share Trip
              </button>
              <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-slate-100 hover:bg-slate-800">
                <Phone size={16} />
                I Reached Safely
              </button>
            </div>

            {sosTriggered ? (
              <p className="rounded-xl border border-rose-700/80 bg-rose-950/40 p-3 text-sm text-rose-200">
                SOS triggered. Control room and emergency contacts notified (demo simulation).
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}

function RiderHistoryView() {
  const user = useNightOwlStore((state) => state.currentUser)
  const data = usePilotData()
  const riderProfile = data.riders.find((rider) => rider.id === user?.id)

  const previousDrivers = useMemo(
    () => {
      const drivers = new Map<string, {
        id: string
        name: string
        safetyScore: number
        tripsWithYou: number
        lastRideAt: string
        safetyBadge: string
      }>()

      for (const trip of data.trips) {
        for (const dispatch of trip.dispatches) {
          if (!dispatch.driver) continue
          const previous = drivers.get(dispatch.driver.id)
          drivers.set(dispatch.driver.id, {
            id: dispatch.driver.id,
            name: dispatch.driver.name,
            safetyScore: dispatch.safetyScore,
            tripsWithYou: (previous?.tripsWithYou ?? 0) + 1,
            lastRideAt: previous?.lastRideAt ?? new Date(trip.requestedAt).toLocaleDateString(),
            safetyBadge: describeSafetyBadge(dispatch.safetyScore),
          })
        }
      }

      return Array.from(drivers.values()).slice(0, 8)
    },
    [data.trips],
  )

  if (data.isLoading) {
    return <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Loading ride history...</p>
  }
  if (data.error) {
    return <p role="alert" className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-4 text-sm text-rose-200">{data.error.message}</p>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">Drivers from Your Trips</h2>
            <p className="mt-1 text-sm text-slate-400">
              Driver safety scores and ride counts from recorded trips.
            </p>
          </div>
          <span className="rounded-xl border border-indigo-700/60 bg-indigo-900/30 px-3 py-1.5 text-xs font-semibold text-indigo-100">
            Rider history
          </span>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {previousDrivers.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-100">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-400">Last ride: {item.lastRideAt}</p>
                </div>
                <StatusChip
                  label={item.safetyBadge}
                  tone={item.safetyBadge === 'Trusted' ? 'success' : item.safetyBadge === 'Safe' ? 'accent' : 'warning'}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                  <p className="text-slate-400">Safety score</p>
                  <p className="mt-1 font-semibold text-amber-300">{item.safetyScore}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                  <p className="text-slate-400">Rides with you</p>
                  <p className="mt-1 font-semibold text-slate-100">{item.tripsWithYou}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!previousDrivers.length ? (
          <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-400">
            No previous ride history yet. Book your first NightOwl ride to build driver history.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-emerald-700/60 bg-emerald-900/20 p-4 text-sm text-emerald-100">
        Rider: {riderProfile?.name ?? 'NightOwl Rider'} • Emergency contacts: {riderProfile?.emergencyContacts.join(', ') ?? 'Not available'}
      </section>
    </div>
  )
}

export function RidersPage() {
  const state = useNightOwlStore()

  if (state.role === 'rider') {
    return <RiderHistoryView />
  }

  return <RidersOperationsView />
}
