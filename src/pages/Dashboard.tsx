import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FleetOpsDashboard } from '../components/fleet/FleetOpsDashboard'
import { CompanyAdminDashboard } from '../components/company/CompanyAdminDashboard'
import { GovOpsDashboard } from '../components/government/GovOpsDashboard'
import { RiderPassengerFlow } from '../components/rider/RiderPassengerFlow'
import { KpiCard } from '../components/shared/KpiCard'
import { StatusChip } from '../components/shared/StatusChip'
import { buildKpiSnapshot, getZonePriorityRows, useNightOwlStore } from '../store/useNightOwlStore'
import { usePilotData } from '../hooks/usePilotData'

const trendData = [
  { day: 'Mon', demand: 940, served: 780 },
  { day: 'Tue', demand: 960, served: 803 },
  { day: 'Wed', demand: 1020, served: 860 },
  { day: 'Thu', demand: 1080, served: 905 },
  { day: 'Fri', demand: 1210, served: 1002 },
  { day: 'Sat', demand: 1130, served: 918 },
]

export function DashboardPage() {
  const state = useNightOwlStore()
  const data = usePilotData()
  const kpis = useMemo(() => buildKpiSnapshot(state, data.drivers, data.vehicles, data.dispatches), [state, data])
  const priorityZones = useMemo(
    () => getZonePriorityRows(state, data.vehicles, data.dispatches).slice(0, 5),
    [state, data.vehicles, data.dispatches],
  )

  if (state.role === 'rider') {
    return (
      <RiderPassengerFlow
        riderName={state.currentUser?.displayName ?? 'NightOwl Rider'}
        emergencyContacts={[]}
      />
    )
  }

  if (data.isLoading) {
    return <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Loading pilot operations...</p>
  }
  if (data.error) {
    return <p role="alert" className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-4 text-sm text-rose-200">{data.error.message}</p>
  }

  if (state.role === 'fleet_operator') {
    const pendingRequests = data.dispatches.filter((dispatch) => dispatch.status === 'OFFERED').length
    const activeTrips = data.trips.filter((trip) => ['ASSIGNED', 'ARRIVING', 'IN_TRIP'].includes(trip.status)).length
    const delayedTrips = data.dispatches.filter((dispatch) => dispatch.etaMinutes >= 18 && dispatch.trip?.status !== 'COMPLETED').length
    const availableVehicles = data.vehicles.filter((vehicle) => vehicle.available && vehicle.readiness === 'ready').length
    const idleVehicles = data.vehicles.filter((vehicle) => vehicle.available && vehicle.readiness === 'ready' && vehicle.etaMinutes < 12).length
    const unavailableVehicles = data.vehicles.filter((vehicle) => !vehicle.available || vehicle.readiness !== 'ready').length
    const verifiedDrivers = data.drivers.filter((driver) => driver.safetyScore >= 75 && driver.status !== 'offline').length
    const utilizationPct = Math.round(
      (data.vehicles.filter((vehicle) => !vehicle.available).length / Math.max(data.vehicles.length, 1)) * 100,
    )

    const blockerRows = [
      {
        id: 'verification',
        label: `${data.drivers.filter((driver) => driver.safetyScore < 75 || driver.status === 'offline').length} driver verification blockers`,
        severity: data.drivers.some((driver) => driver.safetyScore < 75 || driver.status === 'offline') ? 'danger' : 'success',
      },
      {
        id: 'pending',
        label: `${pendingRequests} pending dispatch requests need acceptance`,
        severity: pendingRequests > 0 ? 'warning' : 'success',
      },
      {
        id: 'delays',
        label: `${delayedTrips} trips need ETA attention`,
        severity: delayedTrips > 0 ? 'warning' : 'success',
      },
    ] as const

    const urgentZones = state.demand
      .map((record) => {
        const geo = state.geographies.find((item) => item.id === record.geographyId)
        const zoneName = geo?.ward ?? geo?.district ?? 'Unknown'
        const available = data.vehicles.filter((vehicle) => vehicle.zone === zoneName && vehicle.available && vehicle.readiness === 'ready').length
        return {
          id: record.geographyId,
          zoneName,
          demand: record.estimatedRideDemand,
          vehiclesNeeded: record.vehiclesNeeded,
          available,
          shortage: Math.max(0, record.vehiclesNeeded - available),
        }
      })
      .filter((zone) => zone.shortage > 0)
      .sort((a, b) => b.shortage - a.shortage)

    const pendingDispatches = data.dispatches
      .filter((dispatch) => dispatch.status === 'OFFERED' || dispatch.etaMinutes >= 15)
      .map((dispatch) => {
        const zoneName = dispatch.trip?.pickupLabel ?? 'Unknown pickup'

        return {
          id: dispatch.id,
          zoneName,
          vehicleLabel: dispatch.vehicle?.vehicleNumber ?? dispatch.vehicleId.toUpperCase(),
          driverName: dispatch.driver?.name ?? dispatch.driverId.toUpperCase(),
          etaMinutes: dispatch.etaMinutes,
          status: dispatch.status === 'OFFERED' ? 'Awaiting acceptance' : 'Watch ETA',
          priority: (dispatch.etaMinutes >= 18 ? 'danger' : 'warning') as 'warning' | 'danger',
        }
      })

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            unavailableVehicles * 1.1 -
            delayedTrips * 3 -
            blockerRows.filter((row) => row.severity === 'danger').length * 12 -
            blockerRows.filter((row) => row.severity === 'warning').length * 5,
        ),
      ),
    )

    return (
      <FleetOpsDashboard
        pendingRequests={pendingRequests}
        availableVehicles={availableVehicles}
        verifiedDrivers={verifiedDrivers}
        activeTrips={activeTrips}
        idleVehicles={idleVehicles}
        delayedTrips={delayedTrips}
        unavailableVehicles={unavailableVehicles}
        utilizationPct={utilizationPct}
        healthScore={healthScore}
        blockers={blockerRows.map((row) => ({ id: row.id, label: row.label, severity: row.severity }))}
        urgentZones={urgentZones}
        pendingDispatches={pendingDispatches}
      />
    )
  }

  if (state.role === 'company_admin') {
    return <CompanyAdminDashboard />
  }

  if (state.role === 'government_admin') {
    const totalDemand = state.demand.reduce((total, record) => total + record.estimatedRideDemand, 0)
    const totalNeeded = state.demand.reduce((total, record) => total + record.vehiclesNeeded, 0)
    const activeVehicles = data.vehicles.filter((vehicle) => vehicle.available && vehicle.readiness === 'ready').length
    const coveragePct = totalNeeded > 0 ? Math.round((activeVehicles / totalNeeded) * 100) : 0
    const zones = state.demand.map((record) => {
      const geo = state.geographies.find((item) => item.id === record.geographyId)
      const zone = geo?.ward ?? geo?.district ?? 'Unknown'
      const available = data.vehicles.filter((vehicle) => vehicle.zone === zone && vehicle.available).length
      return {
        id: record.geographyId,
        zone,
        district: geo?.district ?? 'Unknown',
        demand: record.estimatedRideDemand,
        neededVehicles: record.vehiclesNeeded,
        availableVehicles: available,
        shortage: Math.max(0, record.vehiclesNeeded - available),
      }
    })

    const shortageZones = zones.filter((zone) => zone.shortage > 0).length

    return (
      <GovOpsDashboard
        totalDemand={totalDemand}
        totalNeededVehicles={totalNeeded}
        activeVehicles={activeVehicles}
        coveragePct={coveragePct}
        shortageZones={shortageZones}
        zones={zones}
      />
    )
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard title="Expected Riders Tonight" value={kpis.expectedRiders.toLocaleString()} helper="Demand estimate" />
        <KpiCard title="Vehicles Needed" value={kpis.vehiclesNeeded.toString()} helper="Recommended capacity" />
        <KpiCard title="Active Vehicles" value={kpis.activeVehicles.toString()} helper="Ready and available" />
        <KpiCard title="Coverage" value={`${kpis.coverage}%`} helper="Available vs required" />
        <KpiCard title="Avg ETA" value={`${kpis.avgEta} min`} helper="All active dispatches" />
        <KpiCard title="Verified Driver Rate" value={`${kpis.verifiedDriverRate}%`} helper="Safety score >= 75" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">Demand vs Served Trend</h2>
            <StatusChip label="Live monitoring" tone="accent" />
          </header>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                <Legend />
                <Line dataKey="demand" stroke="#fbbf24" strokeWidth={2.2} />
                <Line dataKey="served" stroke="#a78bfa" strokeWidth={2.2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Top Priority Zones</h2>
          <p className="mt-1 text-sm text-slate-400">Ranked by demand, coverage gap, risk, and ETA stress.</p>
          <div className="mt-4 space-y-3">
            {priorityZones.map((zone) => (
              <div key={zone.geographyId} className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-100">{zone.zoneName}</p>
                  <StatusChip
                    label={`Score ${zone.score}`}
                    tone={zone.score > 110 ? 'danger' : zone.score > 80 ? 'warning' : 'success'}
                  />
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Demand {zone.demand} • Coverage gap {zone.coverageGap} • Avg ETA {zone.avgEta} min
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Zone Demand Snapshot</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer>
              <BarChart
                data={state.demand.map((record) => {
                  const zone = state.geographies.find((geo) => geo.id === record.geographyId)
                  return {
                    zone: zone?.ward ?? zone?.district ?? 'Zone',
                    demand: record.estimatedRideDemand,
                    needed: record.vehiclesNeeded,
                  }
                })}
              >
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="zone" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                <Legend />
                <Bar dataKey="demand" fill="#fbbf24" radius={[6, 6, 0, 0]} />
                <Bar dataKey="needed" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Alerts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-3 text-rose-200">
              3 high-demand zones exceed available verified supply.
            </li>
            <li className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-3 text-amber-200">
              Avg ETA crossed 15 min in Ward 72 during 22:00-23:00 window.
            </li>
            <li className="rounded-xl border border-violet-700/60 bg-violet-950/30 p-3 text-violet-200">
              6 driver verification records expire in the next 7 days.
            </li>
          </ul>
        </article>
      </section>
    </div>
  )
}
