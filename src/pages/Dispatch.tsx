import { useMemo, useState } from 'react'
import { CarFront, Clock3, MapPin, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusChip } from '../components/shared/StatusChip'
import { describeSafetyBadge, useNightOwlStore } from '../store/useNightOwlStore'

export function DispatchPage() {
  const navigate = useNavigate()
  const state = useNightOwlStore()
  const createDispatches = useNightOwlStore((store) => store.createDispatches)
  const recommendVehicles = useNightOwlStore((store) => store.recommendVehicles)
  const updateDispatchStatus = useNightOwlStore((store) => store.updateDispatchStatus)

  const [selectedZone, setSelectedZone] = useState('geo-bengaluru-ward-72')
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [fleetAssigned, setFleetAssigned] = useState(false)

  const zone = state.geographies.find((item) => item.id === selectedZone)
  const demand = state.demand.find((item) => item.geographyId === selectedZone)
  const recommended = useMemo(() => recommendVehicles(selectedZone), [recommendVehicles, selectedZone])
  const zoneDispatches = state.dispatches.filter((dispatch) => dispatch.geographyId === selectedZone)

  const riderProfile = state.riders[0]
  const riderDispatch = state.dispatches.find((dispatch) => dispatch.id === riderProfile?.assignedDispatchId)
  const riderDriver = state.drivers.find((driver) => driver.id === riderDispatch?.driverId)
  const riderVehicle = state.vehicles.find((vehicle) => vehicle.id === riderDispatch?.vehicleId)

  if (state.role === 'fleet_operator') {
    const pendingQueue = state.dispatches
      .filter((dispatch) => ['assigned', 'en_route', 'arrived'].includes(dispatch.status))
      .slice(0, 1)
    const firstPending = pendingQueue[0]
    const firstPendingDriver = state.drivers.find((driver) => driver.id === firstPending?.driverId)
    const firstPendingVehicle = state.vehicles.find((vehicle) => vehicle.id === firstPending?.vehicleId)
    const etaMinutes = 7
    const etaProgress = Math.min(100, (etaMinutes / 10) * 100)

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5 sm:p-6 shadow-[0_0_24px_rgba(15,23,42,0.4)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">Dispatch Queue</h2>
              <p className="mt-1 text-sm text-slate-400">One live request, charted for quick scan.</p>
            </div>
            <StatusChip label="Fleet Operator" tone="accent" />
          </div>

          {!firstPending ? (
            <p className="mt-5 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              No pending requests at the moment.
            </p>
          ) : (
            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-semibold text-slate-100">Dispatch ID: {firstPending.id.toUpperCase()}</p>
                <StatusChip label="Pending" tone="warning" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Vehicle</p>
                  <p className="mt-1 font-semibold text-slate-100">{firstPendingVehicle?.vehicleNumber ?? firstPending.vehicleId.toUpperCase()}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Driver</p>
                  <p className="mt-1 font-semibold text-slate-100">{firstPendingDriver?.name ?? firstPending.driverId.toUpperCase()}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">ETA</p>
                  <p className="mt-1 font-semibold text-amber-200">7 min</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>ETA progress</span>
                  <span>7 minutes</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
                    style={{ width: `${etaProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>Single dispatch view for quick action</span>
                <span>Minimal scan mode</span>
              </div>

              <button
                onClick={() => {
                  updateDispatchStatus(firstPending.id, 'en_route')
                  setFleetAssigned(true)
                }}
                className="mt-4 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300"
              >
                Assign Vehicle
              </button>
            </div>
          )}
        </section>

        {fleetAssigned ? (
          <section className="rounded-2xl border border-emerald-700/60 bg-emerald-900/20 p-4">
            <h3 className="text-lg font-semibold text-emerald-100">Assignment Confirmed</h3>
            <p className="mt-1 text-sm text-emerald-100">Vehicle assigned successfully.</p>
          </section>
        ) : null}
      </div>
    )
  }

  if (state.role === 'rider') {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">My Dispatch</h2>
              <p className="mt-1 text-sm text-slate-400">Only your booked ride is shown in rider perspective.</p>
            </div>
            <StatusChip label={riderDispatch ? 'Ride assigned' : 'No active ride'} tone={riderDispatch ? 'success' : 'warning'} />
          </header>

          {!riderDispatch ? (
            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-6 text-center">
              <p className="text-base font-medium text-slate-200">No dispatched ride yet.</p>
              <p className="mt-1 text-sm text-slate-400">Book your ride to see live dispatch details here.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600"
              >
                Book a Ride Now
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-indigo-800/70 bg-indigo-950/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-100">Dispatch ID: {riderDispatch.id.toUpperCase()}</p>
                  <StatusChip
                    label={riderDispatch.status.replace('_', ' ')}
                    tone={riderDispatch.status === 'completed' ? 'success' : riderDispatch.status === 'cancelled' ? 'danger' : 'accent'}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
                  <p className="text-slate-400">Driver</p>
                  <p className="mt-1 font-semibold text-slate-100">{riderDriver?.name ?? 'Assigned'}</p>
                  {riderDriver ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-emerald-300">
                      <ShieldCheck size={14} />
                      Safety {describeSafetyBadge(riderDriver.safetyScore)}
                    </p>
                  ) : null}
                </article>

                <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
                  <p className="text-slate-400">Vehicle</p>
                  <p className="mt-1 inline-flex items-center gap-2 font-semibold text-slate-100">
                    <CarFront size={14} />
                    {riderVehicle?.vehicleNumber ?? riderDispatch.vehicleId.toUpperCase()}
                  </p>
                </article>

                <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
                  <p className="text-slate-400">ETA</p>
                  <p className="mt-1 inline-flex items-center gap-2 font-semibold text-slate-100">
                    <Clock3 size={14} />
                    {riderDispatch.etaMinutes} min
                  </p>
                </article>

                <article className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
                  <p className="text-slate-400">Pickup Locality</p>
                  <p className="mt-1 inline-flex items-center gap-2 font-semibold text-slate-100">
                    <MapPin size={14} />
                    {state.selectedPickupLocality}
                  </p>
                </article>
              </div>
            </div>
          )}
        </section>
      </div>
    )
  }

  const toggleVehicle = (vehicleId: string) => {
    setSelectedVehicles((current) =>
      current.includes(vehicleId) ? current.filter((item) => item !== vehicleId) : [...current, vehicleId],
    )
  }

  const runDispatch = () => {
    const targetVehicles = selectedVehicles.length > 0 ? selectedVehicles : recommended.map((vehicle) => vehicle.id)
    const created = createDispatches(selectedZone, targetVehicles)
    if (created > 0) {
      setMessage(`Dispatched ${created} verified vehicles in ${zone?.ward ?? zone?.district}.`)
      setSelectedVehicles([])
      return
    }
    setMessage('No eligible vehicles available. Check readiness and safety threshold.')
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-50">Dispatch Command</h2>
          <select
            value={selectedZone}
            onChange={(event) => {
              setSelectedZone(event.target.value)
              setSelectedVehicles([])
            }}
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            {state.geographies.map((geo) => (
              <option key={geo.id} value={geo.id}>
                {geo.ward ?? geo.district}
              </option>
            ))}
          </select>
        </header>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
          <p className="text-slate-300">Estimated rides needed: {demand?.estimatedRideDemand ?? 0}</p>
          <p className="text-slate-300">Vehicles recommended: {demand?.vehiclesNeeded ?? 0}</p>
          <p className="text-slate-300">Available verified vehicles: {recommended.length}</p>
        </div>

        <div className="mt-4 space-y-2">
          {recommended.map((vehicle) => {
            const driver = state.drivers.find((item) => item.id === vehicle.driverId)
            const safety = driver?.safetyScore ?? 0

            return (
              <label
                key={vehicle.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 p-3"
              >
                <div>
                  <p className="font-semibold text-slate-100">{vehicle.id.toUpperCase()} • {vehicle.vehicleNumber}</p>
                  <p className="text-sm text-slate-400">
                    {driver?.name} • ETA {vehicle.etaMinutes} min • Safety {safety}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip
                    label={describeSafetyBadge(safety)}
                    tone={safety >= 90 ? 'success' : safety >= 75 ? 'accent' : 'warning'}
                  />
                  <input
                    type="checkbox"
                    checked={selectedVehicles.includes(vehicle.id)}
                    onChange={() => toggleVehicle(vehicle.id)}
                  />
                </div>
              </label>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={runDispatch}
            className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300"
          >
            Dispatch Vehicles
          </button>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="text-lg font-semibold text-slate-50">Live Dispatch Queue</h2>
        <div className="mt-4 space-y-2">
          {zoneDispatches.slice(0, 8).map((dispatch) => (
            <div key={dispatch.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-100">{dispatch.vehicleId.toUpperCase()}</p>
                <StatusChip
                  label={dispatch.status.replace('_', ' ')}
                  tone={dispatch.status === 'completed' ? 'success' : dispatch.status === 'cancelled' ? 'danger' : 'default'}
                />
              </div>
              <p className="mt-1 text-slate-400">
                Driver {dispatch.driverId.toUpperCase()} • ETA {dispatch.etaMinutes} min • Safety {dispatch.safetyScore}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => updateDispatchStatus(dispatch.id, 'en_route')}
                  className="rounded-md border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                >
                  En route
                </button>
                <button
                  onClick={() => updateDispatchStatus(dispatch.id, 'arrived')}
                  className="rounded-md border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                >
                  Arrived
                </button>
                <button
                  onClick={() => updateDispatchStatus(dispatch.id, 'completed')}
                  className="rounded-md border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                >
                  Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
