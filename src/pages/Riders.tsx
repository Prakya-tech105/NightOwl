import { useMemo, useState } from 'react'
import { Phone, Share2, Siren, Star, UserRound } from 'lucide-react'
import { StatusChip } from '../components/shared/StatusChip'
import { describeSafetyBadge, useNightOwlStore } from '../store/useNightOwlStore'

function RidersOperationsView() {
  const state = useNightOwlStore()
  const [selectedRiderId, setSelectedRiderId] = useState(state.riders[0]?.id ?? '')
  const [sosTriggered, setSosTriggered] = useState(false)

  const selectedRider = state.riders.find((rider) => rider.id === selectedRiderId)
  const assignedDispatch = state.dispatches.find((dispatch) => dispatch.id === selectedRider?.assignedDispatchId)
  const driver = state.drivers.find((item) => item.id === assignedDispatch?.driverId)
  const vehicle = state.vehicles.find((item) => item.id === assignedDispatch?.vehicleId)

  const statusText = useMemo(() => {
    if (!assignedDispatch) return 'No ride assigned'
    if (assignedDispatch.status === 'assigned') return 'Ride assigned'
    if (assignedDispatch.status === 'en_route') return 'Driver arriving'
    if (assignedDispatch.status === 'trip_started') return 'Trip in progress'
    if (assignedDispatch.status === 'completed') return 'Trip completed'
    return assignedDispatch.status.replace('_', ' ')
  }, [assignedDispatch])

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="text-lg font-semibold text-slate-50">Rider List</h2>
        <div className="mt-3 space-y-2">
          {state.riders.slice(0, 14).map((rider) => (
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
  const state = useNightOwlStore()
  const riderProfile = state.riders[0]

  const previousDrivers = useMemo(
    () =>
      state.drivers
        .filter((driver) => driver.status !== 'offline')
        .slice(0, 8)
        .map((driver, index) => ({
          id: `hist-${driver.id}`,
          name: driver.name,
          rating: Math.max(3.8, Math.min(5, Number(driver.rating.toFixed(1)))),
          experienceYears: 2 + ((index * 3) % 9),
          tripsWithYou: 1 + (index % 4),
          lastRideAt: new Date(Date.now() - (index + 2) * 86_400_000).toLocaleDateString(),
          safetyBadge: describeSafetyBadge(driver.safetyScore),
        })),
    [state.drivers],
  )

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">Your Previous Drivers</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ratings and experience from your previous NightOwl rides.
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

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                  <p className="text-slate-400">Rating</p>
                  <p className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-300">
                    <Star size={12} />
                    {item.rating}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                  <p className="text-slate-400">Experience</p>
                  <p className="mt-1 inline-flex items-center gap-1 font-semibold text-slate-100">
                    <UserRound size={12} />
                    {item.experienceYears} yrs
                  </p>
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
