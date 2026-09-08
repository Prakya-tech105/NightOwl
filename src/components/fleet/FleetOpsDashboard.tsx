import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Truck, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LiveRefreshButton } from '../shared/LiveRefreshButton'
import { StatusChip } from '../shared/StatusChip'

type FleetZoneSnapshot = {
  id: string
  zoneName: string
  demand: number
  vehiclesNeeded: number
  available: number
  shortage: number
}

type FleetOpsDashboardProps = {
  pendingRequests: number
  availableVehicles: number
  verifiedDrivers: number
  activeTrips: number
  idleVehicles: number
  delayedTrips: number
  unavailableVehicles: number
  utilizationPct: number
  healthScore: number
  blockers: Array<{ id: string; label: string; severity: 'warning' | 'danger' | 'success' }>
  urgentZones: FleetZoneSnapshot[]
  pendingDispatches: Array<{
    id: string
    zoneName: string
    vehicleLabel: string
    driverName: string
    etaMinutes: number
    status: string
    priority: 'warning' | 'danger' | 'success'
  }>
}

type RefreshStatus = {
  loading: boolean
  lastUpdated: string
}

function formatClockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function metricTone(value: number, thresholds: { high: number; mid: number }): 'success' | 'warning' | 'danger' {
  if (value >= thresholds.high) return 'success'
  if (value >= thresholds.mid) return 'warning'
  return 'danger'
}

function FleetGlassCard(props: {
  title: string
  value: string
  helper: string
  accent?: 'amber' | 'emerald' | 'rose' | 'violet'
  delta?: string
  icon?: React.ReactNode
}) {
  const accentClass =
    props.accent === 'emerald'
      ? 'border-emerald-700/50 bg-emerald-950/20 text-emerald-200'
      : props.accent === 'rose'
        ? 'border-rose-700/50 bg-rose-950/20 text-rose-200'
        : props.accent === 'violet'
          ? 'border-violet-700/50 bg-violet-950/20 text-violet-200'
          : 'border-amber-700/50 bg-amber-950/20 text-amber-200'

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-4 shadow-[0_0_24px_rgba(15,23,42,0.45)] backdrop-blur-sm transition duration-300 hover:border-slate-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{props.title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{props.value}</p>
          <p className="mt-1 text-sm text-slate-400">{props.helper}</p>
        </div>
        {props.icon ? <div className={['rounded-xl border px-3 py-2', accentClass].join(' ')}>{props.icon}</div> : null}
      </div>
      {props.delta ? (
        <span className={['mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', accentClass].join(' ')}>
          {props.delta}
        </span>
      ) : null}
    </article>
  )
}

function UtilizationGauge(props: {
  utilizationPct: number
  activeTrips: number
  idleVehicles: number
  unavailableVehicles: number
  refreshState: RefreshStatus
  onRefresh: () => void
}) {
  const clamped = Math.max(0, Math.min(100, props.utilizationPct))
  const progress = Math.round(clamped * 2.28)
  const ringTone = clamped >= 75 ? '#22c55e' : clamped >= 55 ? '#f59e0b' : '#ef4444'

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Fleet Utilization</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-50">Vehicle health and readiness</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip label={clamped >= 75 ? 'Healthy fleet' : 'Needs attention'} tone={clamped >= 75 ? 'success' : 'warning'} />
          <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[200px_1fr] md:items-center">
        <div className="relative mx-auto h-48 w-48">
          <svg viewBox="0 0 220 220" className="h-full w-full">
            <circle cx="110" cy="110" r="82" stroke="#1f2937" strokeWidth="16" fill="none" />
            <circle
              cx="110"
              cy="110"
              r="82"
              stroke={ringTone}
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${progress} 500`}
              transform="rotate(-90 110 110)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700">
            <p className="text-4xl font-bold text-slate-50">{clamped}%</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">Utilization</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 transition-all duration-700">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Active trips</p>
            <p className="mt-1 text-2xl font-bold text-slate-50">{props.activeTrips}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 transition-all duration-700">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Idle vehicles</p>
            <p className="mt-1 text-2xl font-bold text-slate-50">{props.idleVehicles}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 transition-all duration-700">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Unavailable</p>
            <p className="mt-1 text-2xl font-bold text-slate-50">{props.unavailableVehicles}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/60 bg-emerald-900/20 px-2.5 py-1 text-emerald-200">
          <CheckCircle2 size={12} /> Active trips {props.activeTrips}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-700/60 bg-amber-900/20 px-2.5 py-1 text-amber-200">
          <Clock3 size={12} /> Idle-ready {props.idleVehicles}
        </div>
      </div>
    </article>
  )
}

function StatusSpectrum(props: {
  blockers: FleetOpsDashboardProps['blockers']
  pendingRequests: number
  delayedTrips: number
  refreshState: RefreshStatus
  onRefresh: () => void
}) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Fleet Health Spectrum</p>
        <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
            <span>Pending dispatch requests</span>
            <span>{props.pendingRequests}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800">
            <div className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-700" style={{ width: `${Math.min(100, props.pendingRequests * 12)}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
            <span>Delayed trips</span>
            <span>{props.delayedTrips}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800">
            <div className="h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-700" style={{ width: `${Math.min(100, props.delayedTrips * 18)}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {props.blockers.slice(0, 4).map((blocker) => (
          <div
            key={blocker.id}
            className={[
              'rounded-xl border p-3 text-sm',
              blocker.severity === 'danger'
                ? 'border-rose-700/60 bg-rose-950/25 text-rose-200'
                : blocker.severity === 'warning'
                  ? 'border-amber-700/60 bg-amber-950/25 text-amber-200'
                  : 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200',
            ].join(' ')}
          >
            {blocker.label}
          </div>
        ))}
      </div>
    </article>
  )
}

function UrgentZones(props: { zones: FleetZoneSnapshot[]; refreshState: RefreshStatus; onRefresh: () => void }) {
  const maxShortage = Math.max(...props.zones.map((zone) => zone.shortage), 1)

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Urgent zone requests</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-50">Zones needing vehicles now</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip label="Operational priority" tone="accent" />
          <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {props.zones.slice(0, 5).map((zone, index) => (
          <div key={zone.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 transition-all duration-700">
            <div className="flex items-center justify-between gap-2 text-sm text-slate-100">
              <span className="font-semibold">
                #{index + 1} {zone.zoneName}
              </span>
              <span className="text-xs text-slate-400">Shortage {zone.shortage}</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-slate-800">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300 transition-all duration-700"
                style={{ width: `${Math.max(10, (zone.shortage / maxShortage) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Demand {zone.demand} • Needed {zone.vehiclesNeeded} • Available {zone.available}
            </p>
          </div>
        ))}
      </div>
    </article>
  )
}

function DispatchActions(props: {
  pendingDispatches: FleetOpsDashboardProps['pendingDispatches']
  refreshState: RefreshStatus
  onRefresh: () => void
}) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Immediate dispatch actions</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-50">Pending acceptance queue</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip label={`${props.pendingDispatches.length} waiting`} tone="warning" />
          <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {props.pendingDispatches.slice(0, 6).map((dispatch) => (
          <div key={dispatch.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-100">{dispatch.zoneName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {dispatch.vehicleLabel} • {dispatch.driverName} • ETA {dispatch.etaMinutes} min
                </p>
              </div>
              <StatusChip label={dispatch.status} tone={dispatch.priority} />
            </div>
            <div className="mt-3 flex gap-2">
              <button className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300">
                Accept
                <ArrowRight size={12} />
              </button>
              <button className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                Reassign
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function HealthSummary(props: {
  blockers: FleetOpsDashboardProps['blockers']
  healthScore: number
  refreshState: RefreshStatus
  onRefresh: () => void
}) {
  const tone = metricTone(props.healthScore, { high: 85, mid: 70 })
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Fleet health summary</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-50">Blockers and readiness</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip label={`Health ${props.healthScore}%`} tone={tone} />
          <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Verified', tone: 'success', value: props.blockers.filter((item) => item.severity === 'success').length },
          { label: 'Warnings', tone: 'warning', value: props.blockers.filter((item) => item.severity === 'warning').length },
          { label: 'Critical', tone: 'danger', value: props.blockers.filter((item) => item.severity === 'danger').length },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 transition-all duration-700">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
            <p className={[
              'mt-2 text-2xl font-bold',
              item.tone === 'success' ? 'text-emerald-200' : item.tone === 'warning' ? 'text-amber-200' : 'text-rose-200',
            ].join(' ')}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  )
}

export function FleetOpsDashboard(props: FleetOpsDashboardProps) {
  const [utilization, setUtilization] = useState(props.utilizationPct)
  const [activeTrips, setActiveTrips] = useState(props.activeTrips)
  const [idleVehicles, setIdleVehicles] = useState(props.idleVehicles)
  const [unavailableVehicles, setUnavailableVehicles] = useState(props.unavailableVehicles)
  const [pendingRequests, setPendingRequests] = useState(props.pendingRequests)
  const [delayedTrips, setDelayedTrips] = useState(props.delayedTrips)
  const [zones, setZones] = useState(props.urgentZones)
  const [dispatches, setDispatches] = useState(props.pendingDispatches)
  const [blockers, setBlockers] = useState(props.blockers)
  const [healthScore, setHealthScore] = useState(props.healthScore)

  const [utilizationRefresh, setUtilizationRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })
  const [spectrumRefresh, setSpectrumRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })
  const [zoneRefresh, setZoneRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })
  const [dispatchRefresh, setDispatchRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })
  const [healthRefresh, setHealthRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })

  useEffect(() => {
    setUtilization(props.utilizationPct)
    setActiveTrips(props.activeTrips)
    setIdleVehicles(props.idleVehicles)
    setUnavailableVehicles(props.unavailableVehicles)
    setPendingRequests(props.pendingRequests)
    setDelayedTrips(props.delayedTrips)
    setZones(props.urgentZones)
    setDispatches(props.pendingDispatches)
    setBlockers(props.blockers)
    setHealthScore(props.healthScore)
  }, [props])

  const refreshUtilization = () => {
    setUtilizationRefresh((current) => ({ ...current, loading: true }))
    window.setTimeout(() => {
      const nextUtilization = Math.max(42, Math.min(96, utilization + randomBetween(-5, 6)))
      const nextActiveTrips = Math.max(10, activeTrips + randomBetween(-2, 3))
      const nextIdleVehicles = Math.max(2, idleVehicles + randomBetween(-2, 2))
      const nextUnavailable = Math.max(1, unavailableVehicles + randomBetween(-1, 2))

      setUtilization(nextUtilization)
      setActiveTrips(nextActiveTrips)
      setIdleVehicles(nextIdleVehicles)
      setUnavailableVehicles(nextUnavailable)
      setUtilizationRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const refreshSpectrum = () => {
    setSpectrumRefresh((current) => ({ ...current, loading: true }))
    window.setTimeout(() => {
      const nextPending = Math.max(4, pendingRequests + randomBetween(-2, 3))
      const nextDelayed = Math.max(1, delayedTrips + randomBetween(-1, 3))
      const nextBlockers: FleetOpsDashboardProps['blockers'] = blockers.map((item, index) => {
        if (item.severity === 'success') return item
        const roll = randomBetween(0, 2)
        const nextSeverity: 'warning' | 'danger' | 'success' = roll === 0 ? 'warning' : roll === 1 ? 'danger' : 'success'
        return {
          ...item,
          severity: nextSeverity,
          label: index === 0 ? 'Dispatch window tightened by 12 minutes' : item.label,
        }
      })

      setPendingRequests(nextPending)
      setDelayedTrips(nextDelayed)
      setBlockers(nextBlockers)
      setSpectrumRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const refreshZones = () => {
    setZoneRefresh((current) => ({ ...current, loading: true }))
    window.setTimeout(() => {
      const nextZones = zones.map((zone, index) => ({
        ...zone,
        demand: Math.max(40, zone.demand + randomBetween(-15, 18)),
        vehiclesNeeded: Math.max(3, zone.vehiclesNeeded + randomBetween(-1, 2)),
        available: Math.max(1, zone.available + randomBetween(-2, 2)),
        shortage: Math.max(2, zone.shortage + randomBetween(-2, 4) + (index === 0 ? 1 : 0)),
      }))

      setZones([...nextZones].sort((a, b) => b.shortage - a.shortage))
      setZoneRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const refreshDispatches = () => {
    setDispatchRefresh((current) => ({ ...current, loading: true }))
    window.setTimeout(() => {
      const nextDispatches = dispatches.map((dispatch) => ({
        ...dispatch,
        etaMinutes: Math.max(6, dispatch.etaMinutes + randomBetween(-4, 5)),
        status: dispatch.status === 'Queued' ? 'Inspecting' : dispatch.status,
      }))
      setDispatches(nextDispatches)
      setDispatchRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const refreshHealth = () => {
    setHealthRefresh((current) => ({ ...current, loading: true }))
    window.setTimeout(() => {
      const nextHealth = Math.max(65, Math.min(96, healthScore + randomBetween(-4, 4)))
      setHealthScore(nextHealth)
      setHealthRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FleetGlassCard
          title="Available Fleet"
          value={props.availableVehicles.toString()}
          helper="Ready for immediate assignment"
          accent="emerald"
          delta="Vehicles on standby"
          icon={<Truck size={18} />}
        />
        <FleetGlassCard
          title="Pending Requests"
          value={pendingRequests.toString()}
          helper="Awaiting vehicle allocation"
          accent="amber"
          delta="Need operator action"
          icon={<Clock3 size={18} />}
        />
        <FleetGlassCard
          title="Verified Drivers"
          value={props.verifiedDrivers.toString()}
          helper="Dispatch-ready and cleared"
          accent="violet"
          delta="Identity + safety checked"
          icon={<ShieldCheck size={18} />}
        />
        <FleetGlassCard
          title="Fleet Health"
          value={`${healthScore}%`}
          helper="Readiness, blockers, and delays"
          accent={healthScore >= 85 ? 'emerald' : healthScore >= 70 ? 'amber' : 'rose'}
          delta={healthScore >= 85 ? 'Healthy' : 'Attention needed'}
          icon={<Wrench size={18} />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <UtilizationGauge
          utilizationPct={utilization}
          activeTrips={activeTrips}
          idleVehicles={idleVehicles}
          unavailableVehicles={unavailableVehicles}
          refreshState={utilizationRefresh}
          onRefresh={refreshUtilization}
        />
        <StatusSpectrum
          blockers={blockers}
          pendingRequests={pendingRequests}
          delayedTrips={delayedTrips}
          refreshState={spectrumRefresh}
          onRefresh={refreshSpectrum}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <UrgentZones zones={zones} refreshState={zoneRefresh} onRefresh={refreshZones} />
        <DispatchActions pendingDispatches={dispatches} refreshState={dispatchRefresh} onRefresh={refreshDispatches} />
      </section>

      <HealthSummary blockers={blockers} healthScore={healthScore} refreshState={healthRefresh} onRefresh={refreshHealth} />
    </div>
  )
}
