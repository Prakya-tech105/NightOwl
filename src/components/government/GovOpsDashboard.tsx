import { ArrowRight, ShieldAlert, Siren, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LiveRefreshButton } from '../shared/LiveRefreshButton'

type ZoneSnapshot = {
  id: string
  zone: string
  district: string
  demand: number
  neededVehicles: number
  availableVehicles: number
  shortage: number
}

type GovOpsDashboardProps = {
  totalDemand: number
  totalNeededVehicles: number
  activeVehicles: number
  coveragePct: number
  shortageZones: number
  zones: ZoneSnapshot[]
}

type ActionKey = 'deploy' | 'incident' | 'alert'

type ConfirmationState = {
  action: ActionKey
  open: boolean
}

type ToastState = {
  id: number
  title: string
  message: string
  tone: 'success' | 'warning' | 'info'
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

function ringArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = {
    x: cx + r * Math.cos(startAngle),
    y: cy + r * Math.sin(startAngle),
  }
  const end = {
    x: cx + r * Math.cos(endAngle),
    y: cy + r * Math.sin(endAngle),
  }
  const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

function ConfirmationModal(props: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { open, loading, onCancel, onConfirm } = props

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }

      if (event.key === 'Enter' && !loading) {
        onConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel, onConfirm])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="confirmation-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <h3 id="confirmation-title" className="text-lg font-semibold text-slate-50">{props.title}</h3>
        <p className="mt-2 text-sm text-slate-300">{props.description}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onCancel}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={props.loading}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-200"
          >
            {props.loading ? 'Processing...' : props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToastNotification(props: { toast: ToastState | null; onClose: () => void }) {
  const { toast, onClose } = props

  useEffect(() => {
    if (!toast) return

    const timeout = window.setTimeout(onClose, 2600)
    return () => window.clearTimeout(timeout)
  }, [toast, onClose])

  if (!toast) return null

  const toneClass =
    toast.tone === 'success'
      ? 'border-emerald-500/60 bg-emerald-900/70 text-emerald-100'
      : toast.tone === 'warning'
        ? 'border-amber-500/60 bg-amber-900/70 text-amber-100'
        : 'border-sky-500/60 bg-sky-900/70 text-sky-100'

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60]">
      <div role="status" aria-live="polite" className={['min-w-[240px] rounded-xl border p-3 shadow-xl backdrop-blur-sm', toneClass].join(' ')}>
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="mt-1 text-xs opacity-90">{toast.message}</p>
      </div>
    </div>
  )
}

function EnhancedKpiCard(props: {
  title: string
  value: string
  helper: string
  trendLabel: string
  trendTone: 'amber' | 'rose' | 'emerald'
}) {
  const trendToneClass =
    props.trendTone === 'amber'
      ? 'border-amber-700/70 bg-amber-900/30 text-amber-200'
      : props.trendTone === 'rose'
        ? 'border-rose-700/70 bg-rose-900/30 text-rose-200'
        : 'border-emerald-700/70 bg-emerald-900/30 text-emerald-200'

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm transition duration-300 hover:border-slate-500">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{props.title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-50">{props.value}</p>
      <p className="mt-1 text-sm text-slate-300">{props.helper}</p>
      <span className={['mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', trendToneClass].join(' ')}>
        {props.trendLabel}
      </span>
    </article>
  )
}

function CoverageGauge(props: {
  coveragePct: number
  activeVehicles: number
  neededVehicles: number
  refreshState: RefreshStatus
  onRefresh: () => void
}) {
  const clamped = Math.max(0, Math.min(100, props.coveragePct))
  const start = -Math.PI * 0.75
  const end = Math.PI * 0.75
  const filledEnd = start + ((end - start) * clamped) / 100

  return (
    <article className="rounded-xl border border-indigo-800/70 bg-slate-900/80 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Coverage Command Gauge</p>
        <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="relative mx-auto h-44 w-44">
          <svg viewBox="0 0 220 220" className="h-full w-full">
            <path d={ringArcPath(110, 110, 78, start, end)} stroke="#1f2937" strokeWidth="16" fill="none" />
            <path
              d={ringArcPath(110, 110, 78, start, filledEnd)}
              stroke={clamped > 85 ? '#22c55e' : clamped > 65 ? '#f59e0b' : '#ef4444'}
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700">
            <p className="text-4xl font-bold text-slate-50">{clamped}%</p>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Coverage</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm transition-all duration-700">
            <p className="text-slate-400">Active vehicles</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{props.activeVehicles}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm transition-all duration-700">
            <p className="text-slate-400">Vehicles required</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{props.neededVehicles}</p>
          </div>
          <p className="text-sm text-slate-300">Target threshold: maintain at least 90% for safe night coverage.</p>
        </div>
      </div>
    </article>
  )
}

function ShortageHeatmap(props: {
  zones: ZoneSnapshot[]
  refreshState: RefreshStatus
  onRefresh: () => void
  highestRiskWard: string
}) {
  const top = props.zones.slice(0, 12)
  const maxShortage = Math.max(...top.map((zone) => zone.shortage), 1)

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Shortage Mini Heatmap</p>
        <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
        <span>Highest-risk ward</span>
        <span className="font-semibold text-amber-200">{props.highestRiskWard}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {top.map((zone) => {
          const intensity = zone.shortage / maxShortage
          const color =
            intensity >= 0.75
              ? 'rgba(239,68,68,0.85)'
              : intensity >= 0.45
                ? 'rgba(245,158,11,0.78)'
                : 'rgba(56,189,248,0.55)'

          return (
            <div
              key={zone.id}
              title={`${zone.zone}: shortage ${zone.shortage}`}
              className="rounded-md border border-slate-700/80 px-2 py-2 text-[11px] font-medium text-slate-100 transition-all duration-700"
              style={{ backgroundColor: color }}
            >
              {zone.zone}
            </div>
          )
        })}
      </div>
    </article>
  )
}

function DemandCapacityComparison(props: {
  totalDemand: number
  totalNeededVehicles: number
  activeVehicles: number
  coveragePct: number
  insight: string
  refreshState: RefreshStatus
  onRefresh: () => void
}) {
  const max = Math.max(props.totalDemand, props.totalNeededVehicles, props.activeVehicles, 1)

  const bar = (value: number, tone: string) => (
    <div className="h-3 w-full rounded-full bg-slate-800">
      <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: tone }} />
    </div>
  )

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Demand vs Capacity Comparison</p>
        <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Demand (rides)</span>
            <span>{props.totalDemand.toLocaleString()}</span>
          </div>
          {bar(props.totalDemand, 'linear-gradient(90deg,#ef4444 0%, #f97316 100%)')}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Vehicle requirement</span>
            <span>{props.totalNeededVehicles}</span>
          </div>
          {bar(props.totalNeededVehicles, 'linear-gradient(90deg,#f59e0b 0%, #fbbf24 100%)')}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Active capacity</span>
            <span>{props.activeVehicles}</span>
          </div>
          {bar(props.activeVehicles, 'linear-gradient(90deg,#22c55e 0%, #38bdf8 100%)')}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200 transition-all duration-700">
        <p className="text-slate-400">Coverage</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xl font-semibold text-slate-50">{props.coveragePct}%</span>
          <span className="text-xs text-slate-400">Projected</span>
        </div>
        <p className="mt-2 text-sm text-slate-300">{props.insight}</p>
      </div>
    </article>
  )
}

function RankedWardBars(props: {
  zones: ZoneSnapshot[]
  refreshState: RefreshStatus
  onRefresh: () => void
}) {
  const topShortages = props.zones.slice(0, 6)
  const maxShortage = Math.max(...topShortages.map((zone) => zone.shortage), 1)

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ranked Ward Shortage Bars</p>
        <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
      </div>

      <div className="mt-3 space-y-2.5">
        {topShortages.map((zone, index) => (
          <div key={zone.id}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
              <span>
                #{index + 1} {zone.zone}
              </span>
              <span>Gap {zone.shortage}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300 transition-all duration-700"
                style={{ width: `${Math.max(8, (zone.shortage / maxShortage) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function RecommendationFlow(props: {
  highlightedZone: string
  deploymentFlowText: string
  ward72Status: string
  actions: {
    deploy: { loading: boolean; completed: boolean }
    incident: { loading: boolean; completed: boolean }
    alert: { loading: boolean; completed: boolean }
  }
  targetWard: string
  vehicleCount: number
  actionSeverity: string
  primaryCta: string
  summaryText: string
  refreshState: RefreshStatus
  onRefresh: () => void
  onConfirmAction: (action: ActionKey) => void
}) {
  const buttonClass = {
    deploy: props.actions.deploy.completed
      ? 'border-emerald-500/80 bg-emerald-500 text-slate-950'
      : props.actions.deploy.loading
        ? 'border-amber-300/70 bg-amber-300 text-slate-950'
        : 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    incident: props.actions.incident.completed
      ? 'border-rose-500/80 bg-rose-500 text-slate-50'
      : props.actions.incident.loading
        ? 'border-rose-300/70 bg-rose-300 text-slate-950'
        : 'border border-rose-700/70 bg-rose-900/30 text-rose-100 hover:bg-rose-900/50',
    alert: props.actions.alert.completed
      ? 'border-sky-500/80 bg-sky-500 text-slate-950'
      : props.actions.alert.loading
        ? 'border-sky-300/70 bg-sky-300 text-slate-950'
        : 'border border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800',
  }

  const buttonLabel = {
    deploy: props.actions.deploy.completed ? 'Support deployed' : props.actions.deploy.loading ? 'Deploying…' : props.primaryCta,
    incident: props.actions.incident.completed ? 'Incident watch active' : props.actions.incident.loading ? 'Triggering…' : 'Trigger Incident Watch',
    alert: props.actions.alert.completed ? 'Patrol alert sent' : props.actions.alert.loading ? 'Sending…' : 'Send Patrol Alert',
  }

  const isDisabled = (action: ActionKey) => {
    const state = props.actions[action]
    return state.loading || state.completed
  }

  return (
    <article className="rounded-xl border border-amber-700/60 bg-[linear-gradient(180deg,rgba(120,53,15,0.24)_0%,rgba(15,23,42,0.75)_100%)] p-5 shadow-[0_0_28px_rgba(245,158,11,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-amber-100">Deployment Recommendation Flow</h3>
        <LiveRefreshButton loading={props.refreshState.loading} lastUpdated={props.refreshState.lastUpdated} onRefresh={props.onRefresh} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <p className="font-semibold">Shortage scan</p>
          <p className="mt-1 text-xs text-slate-400">Monitor ward-level demand deficit.</p>
        </div>
        <ArrowRight className="mx-auto text-amber-300" size={16} />
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <p className="font-semibold">{props.deploymentFlowText}</p>
          <p className="mt-1 text-xs text-slate-400">Move {props.vehicleCount} verified vehicles to {props.highlightedZone}.</p>
        </div>
        <ArrowRight className="mx-auto text-amber-300" size={16} />
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <p className="font-semibold">Track impact</p>
          <p className="mt-1 text-xs text-slate-400">Recheck coverage and ETA stress after deployment.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-600 bg-slate-950/75 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
          {props.targetWard}
        </span>
        <span className="rounded-full border border-rose-700/80 bg-rose-900/40 px-2.5 py-1 text-xs font-semibold text-rose-200">
          {props.actionSeverity}
        </span>
        <span className="rounded-full border border-emerald-500/60 bg-emerald-900/40 px-2.5 py-1 text-xs font-semibold text-emerald-200">
          {props.ward72Status}
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-200">{props.summaryText}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isDisabled('deploy')}
          onClick={() => props.onConfirmAction('deploy')}
          className={['inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-80', buttonClass.deploy].join(' ')}
        >
          <Truck size={15} />
          {buttonLabel.deploy}
        </button>
        <button
          type="button"
          disabled={isDisabled('incident')}
          onClick={() => props.onConfirmAction('incident')}
          className={['inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-80', buttonClass.incident].join(' ')}
        >
          <Siren size={15} />
          {buttonLabel.incident}
        </button>
        <button
          type="button"
          disabled={isDisabled('alert')}
          onClick={() => props.onConfirmAction('alert')}
          className={['inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-80', buttonClass.alert].join(' ')}
        >
          <ShieldAlert size={15} />
          {buttonLabel.alert}
        </button>
      </div>
    </article>
  )
}

export function GovOpsDashboard(props: GovOpsDashboardProps) {
  const sourceKey = JSON.stringify([
    props.activeVehicles,
    props.coveragePct,
    props.totalDemand,
    props.totalNeededVehicles,
    props.zones,
  ])

  return <GovOpsDashboardContent key={sourceKey} {...props} />
}

function GovOpsDashboardContent(props: GovOpsDashboardProps) {
  const rankedZones = useMemo(() => [...props.zones].sort((a, b) => b.shortage - a.shortage), [props.zones])
  const hotspot = rankedZones[0]?.zone ?? 'Ward 72'

  const [localActiveVehicles, setLocalActiveVehicles] = useState(props.activeVehicles)
  const [localCoverage, setLocalCoverage] = useState(props.coveragePct)
  const [localDemand, setLocalDemand] = useState(props.totalDemand)
  const [localRequiredVehicles, setLocalRequiredVehicles] = useState(props.totalNeededVehicles)
  const [localZones, setLocalZones] = useState(rankedZones)
  const [highestRiskWard, setHighestRiskWard] = useState(hotspot)
  const [insight, setInsight] = useState('Projected demand remains above current capacity. Dispatch support remains necessary before the next peak.')
  const [deploymentFlowText, setDeploymentFlowText] = useState('Deploy support')
  const [ward72Status, setWard72Status] = useState('Priority response')
  const [recommendationTarget, setRecommendationTarget] = useState(hotspot)
  const [recommendationCount, setRecommendationCount] = useState(8)
  const [recommendationSeverity, setRecommendationSeverity] = useState('High priority')
  const [recommendationCta, setRecommendationCta] = useState('Deploy 8 Vehicles')
  const [recommendationSummary, setRecommendationSummary] = useState('Ward demand is trending above capacity. Priority support should be redirected to the highest-risk area before the next shift surge.')
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ action: 'deploy', open: false })
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null)
  const [completed, setCompleted] = useState<Record<ActionKey, boolean>>({ deploy: false, incident: false, alert: false })
  const [toast, setToast] = useState<ToastState | null>(null)
  const [coverageRefresh, setCoverageRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })
  const [heatmapRefresh, setHeatmapRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })
  const [demandRefresh, setDemandRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })
  const [barRefresh, setBarRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })
  const [recommendationRefresh, setRecommendationRefresh] = useState<RefreshStatus>({ loading: false, lastUpdated: formatClockTime() })

  const refreshCoverage = () => {
    setCoverageRefresh((current) => ({ ...current, loading: true }))

    window.setTimeout(() => {
      const nextRequired = Math.max(1, props.totalNeededVehicles + randomBetween(-2, 2))
      const nextActive = Math.max(1, Math.min(80, localActiveVehicles + randomBetween(-3, 4)))
      const nextCoverage = Math.round((nextActive / nextRequired) * 100)

      setLocalActiveVehicles(nextActive)
      setLocalRequiredVehicles(nextRequired)
      setLocalCoverage(nextCoverage)
      setCoverageRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const refreshHeatmap = () => {
    setHeatmapRefresh((current) => ({ ...current, loading: true }))

    window.setTimeout(() => {
      const shiftedZones = [...localZones].map((zone, index) => {
        const delta = randomBetween(-2, 3)
        const adjustedShortage = Math.max(1, zone.shortage + delta + (index === 0 ? 1 : 0))
        return {
          ...zone,
          shortage: adjustedShortage,
        }
      })

      const sortedZones = [...shiftedZones].sort((a, b) => b.shortage - a.shortage)
      const nextHotspot = sortedZones[0]?.zone ?? 'Ward 72'

      setLocalZones(sortedZones)
      setHighestRiskWard(nextHotspot)
      setHeatmapRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const refreshDemandComparison = () => {
    setDemandRefresh((current) => ({ ...current, loading: true }))

    window.setTimeout(() => {
      const nextDemand = Math.max(300, localDemand + randomBetween(-18, 24))
      const nextRequired = Math.max(12, localRequiredVehicles + randomBetween(-2, 3))
      const nextActive = Math.max(1, localActiveVehicles + randomBetween(-2, 4))
      const nextCoverage = Math.round((nextActive / nextRequired) * 100)
      const gap = nextDemand - nextActive * 14
      const nextInsight = gap > 0
        ? `Projected demand still exceeds active capacity by ${Math.abs(gap)} rides; dispatch support is needed before the next peak window.`
        : `Projected demand is now aligned with active capacity; maintain current coverage and monitor the next shift.`

      setLocalDemand(nextDemand)
      setLocalRequiredVehicles(nextRequired)
      setLocalActiveVehicles(nextActive)
      setLocalCoverage(nextCoverage)
      setInsight(nextInsight)
      setDemandRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const refreshWardBars = () => {
    setBarRefresh((current) => ({ ...current, loading: true }))

    window.setTimeout(() => {
      const nextZones = [...localZones]
        .map((zone) => ({
          ...zone,
          shortage: Math.max(3, zone.shortage + randomBetween(-3, 4)),
        }))
        .sort((a, b) => b.shortage - a.shortage)
        .slice(0, 6)

      setLocalZones(nextZones)
      setBarRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const refreshRecommendation = () => {
    setRecommendationRefresh((current) => ({ ...current, loading: true }))

    window.setTimeout(() => {
      const targetWard = highestRiskWard || hotspot
      const laneAdjustment = Math.max(5, Math.min(12, Math.round((localCoverage / 10) + randomBetween(1, 3))))
      const nextVehicleCount = Math.max(6, laneAdjustment)
      const severity = localCoverage < 80 ? 'Critical priority' : localCoverage < 90 ? 'High priority' : 'Moderate priority'
      const nextText = `Dispatch ${nextVehicleCount} vehicles to ${targetWard} to close the current coverage gap before the next peak shift.`
      const nextCta = `Deploy ${nextVehicleCount} Vehicles`

      setRecommendationTarget(targetWard)
      setRecommendationCount(nextVehicleCount)
      setRecommendationSeverity(severity)
      setRecommendationCta(nextCta)
      setRecommendationSummary(nextText)
      setDeploymentFlowText(nextText)
      setWard72Status(severity)
      setRecommendationRefresh({ loading: false, lastUpdated: formatClockTime() })
    }, randomBetween(600, 1000))
  }

  const openConfirmation = (action: ActionKey) => {
    if (pendingAction || completed[action]) return
    setConfirmation({ action, open: true })
  }

  const onConfirmAction = async (action: ActionKey) => {
    if (pendingAction || completed[action]) return

    setPendingAction(action)
    setConfirmation((current) => ({ ...current, open: false }))

    await new Promise((resolve) => window.setTimeout(resolve, 1100))

    if (action === 'deploy') {
      const nextActive = Math.max(20, Math.min(60, localActiveVehicles + 4))
      const nextCoverage = Math.round((nextActive / Math.max(localRequiredVehicles, 1)) * 100)
      setLocalActiveVehicles(nextActive)
      setLocalCoverage(nextCoverage)
      setDeploymentFlowText('Support deployed')
      setWard72Status('Support deployed')
    }

    if (action === 'incident') {
      setWard72Status('Incident watch active')
    }

    if (action === 'alert') {
      setWard72Status('Patrol alert sent')
    }

    setCompleted((current) => ({ ...current, [action]: true }))
    setToast({
      id: Date.now(),
      title: action === 'deploy' ? 'Deployment confirmed' : action === 'incident' ? 'Incident watch active' : 'Patrol alert sent',
      message:
        action === 'deploy'
          ? `${recommendationCount} verified vehicles were dispatched to ${recommendationTarget}.`
          : action === 'incident'
            ? 'The incident watch is active across the high-risk corridor.'
            : 'Patrol units have been notified and are moving to priority positions.',
      tone: 'success',
    })
    setPendingAction(null)
  }

  const actionState = {
    deploy: { loading: pendingAction === 'deploy', completed: completed.deploy },
    incident: { loading: pendingAction === 'incident', completed: completed.incident },
    alert: { loading: pendingAction === 'alert', completed: completed.alert },
  }

  const confirmationDetails: Record<ActionKey, { title: string; description: string; confirmLabel: string }> = {
    deploy: {
      title: 'Deploy 8 Vehicles',
      description: 'This will assign 8 verified vehicles to Ward 72 and refresh the live coverage estimate.',
      confirmLabel: 'Confirm deployment',
    },
    incident: {
      title: 'Trigger Incident Watch',
      description: 'This will enable an incident watch across the highest-risk corridor and notify command staff.',
      confirmLabel: 'Confirm incident watch',
    },
    alert: {
      title: 'Send Patrol Alert',
      description: 'This will dispatch the patrol alert to active sectors and prime teams for rapid response.',
      confirmLabel: 'Confirm patrol alert',
    },
  }

  return (
    <div className="space-y-4">
      <ConfirmationModal
        open={confirmation.open}
        title={confirmationDetails[confirmation.action].title}
        description={confirmationDetails[confirmation.action].description}
        confirmLabel={confirmationDetails[confirmation.action].confirmLabel}
        loading={pendingAction === confirmation.action}
        onCancel={() => setConfirmation((current) => ({ ...current, open: false }))}
        onConfirm={() => {
          void onConfirmAction(confirmation.action)
        }}
      />

      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <section className="grid gap-3 md:grid-cols-3">
        <EnhancedKpiCard
          title="Total Night Demand"
          value={localDemand.toLocaleString()}
          helper="Projected city-wide requests tonight"
          trendLabel="Peak window 22:00-23:00"
          trendTone="rose"
        />
        <EnhancedKpiCard
          title="Coverage"
          value={`${Math.min(100, localCoverage)}%`}
          helper="Active fleet against required support"
          trendLabel={localCoverage >= 90 ? 'Within target' : 'Below safety target'}
          trendTone={localCoverage >= 90 ? 'emerald' : 'amber'}
        />
        <EnhancedKpiCard
          title="Shortage Zones"
          value={props.shortageZones.toString()}
          helper="Wards requiring urgent allocation"
          trendLabel={`${highestRiskWard} highest risk`}
          trendTone="amber"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <CoverageGauge
          coveragePct={localCoverage}
          activeVehicles={localActiveVehicles}
          neededVehicles={localRequiredVehicles}
          refreshState={coverageRefresh}
          onRefresh={refreshCoverage}
        />
        <ShortageHeatmap
          zones={localZones}
          refreshState={heatmapRefresh}
          onRefresh={refreshHeatmap}
          highestRiskWard={highestRiskWard}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DemandCapacityComparison
          totalDemand={localDemand}
          totalNeededVehicles={localRequiredVehicles}
          activeVehicles={localActiveVehicles}
          coveragePct={localCoverage}
          insight={insight}
          refreshState={demandRefresh}
          onRefresh={refreshDemandComparison}
        />
        <RankedWardBars zones={localZones} refreshState={barRefresh} onRefresh={refreshWardBars} />
      </section>

      <RecommendationFlow
        highlightedZone={recommendationTarget}
        deploymentFlowText={deploymentFlowText}
        ward72Status={ward72Status}
        actions={actionState}
        targetWard={recommendationTarget}
        vehicleCount={recommendationCount}
        actionSeverity={recommendationSeverity}
        primaryCta={recommendationCta}
        summaryText={recommendationSummary}
        refreshState={recommendationRefresh}
        onRefresh={refreshRecommendation}
        onConfirmAction={(action) => openConfirmation(action)}
      />
    </div>
  )
}
