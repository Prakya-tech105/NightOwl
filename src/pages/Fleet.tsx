import { useMemo, useState } from 'react'
import { StatusChip } from '../components/shared/StatusChip'
import { describeSafetyBadge, useNightOwlStore } from '../store/useNightOwlStore'

export function FleetPage() {
  const { drivers, vehicles } = useNightOwlStore()
  const [zoneFilter, setZoneFilter] = useState('all')

  const zones = useMemo(() => Array.from(new Set(vehicles.map((vehicle) => vehicle.zone))), [vehicles])

  const filteredDrivers = drivers.filter((driver) => zoneFilter === 'all' || driver.zone === zoneFilter)
  const filteredVehicles = vehicles.filter((vehicle) => zoneFilter === 'all' || vehicle.zone === zoneFilter)

  const verifiedRate = Math.round(
    (filteredDrivers.filter((driver) => driver.safetyScore >= 75).length / Math.max(filteredDrivers.length, 1)) * 100,
  )
  const utilization = Math.round(
    (filteredVehicles.filter((vehicle) => !vehicle.available).length / Math.max(filteredVehicles.length, 1)) * 100,
  )

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">Drivers: {filteredDrivers.length}</div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">Vehicles: {filteredVehicles.length}</div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">Verified: {verifiedRate}%</div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2">Utilization: {utilization}%</div>
        </div>

        <select
          value={zoneFilter}
          onChange={(event) => setZoneFilter(event.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all">All zones</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Driver Registry</h2>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
            {filteredDrivers.slice(0, 50).map((driver) => (
              <div key={driver.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-100">{driver.name}</p>
                  <StatusChip
                    label={describeSafetyBadge(driver.safetyScore)}
                    tone={driver.safetyScore >= 90 ? 'success' : driver.safetyScore >= 75 ? 'accent' : 'warning'}
                  />
                </div>
                <p className="mt-1 text-slate-400">
                  {driver.id.toUpperCase()} • {driver.zone} • Rating {driver.rating} • Incidents {driver.incidentCount}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Vehicle Inventory</h2>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
            {filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-100">{vehicle.vehicleNumber}</p>
                  <StatusChip
                    label={vehicle.available ? 'Available' : 'Assigned'}
                    tone={vehicle.available ? 'success' : 'warning'}
                  />
                </div>
                <p className="mt-1 text-slate-400">
                  {vehicle.type.toUpperCase()} • Capacity {vehicle.capacity} • {vehicle.zone} • ETA {vehicle.etaMinutes} min
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
