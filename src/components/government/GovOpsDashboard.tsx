import { ArrowRight, ShieldAlert, Siren, Truck } from 'lucide-react'

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
      <span className={[
        'mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        trendToneClass,
      ].join(' ')}>
        {props.trendLabel}
      </span>
    </article>
  )
}

function CoverageGauge(props: { coveragePct: number; activeVehicles: number; neededVehicles: number }) {
  const clamped = Math.max(0, Math.min(100, props.coveragePct))
  const start = -Math.PI * 0.75
  const end = Math.PI * 0.75
  const filledEnd = start + ((end - start) * clamped) / 100

  return (
    <article className="rounded-xl border border-indigo-800/70 bg-slate-900/80 p-5 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Coverage Command Gauge</p>
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
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl font-bold text-slate-50">{clamped}%</p>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Coverage</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <p className="text-slate-400">Active vehicles</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{props.activeVehicles}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <p className="text-slate-400">Vehicles required</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{props.neededVehicles}</p>
          </div>
          <p className="text-sm text-slate-300">Target threshold: maintain at least 90% for safe night coverage.</p>
        </div>
      </div>
    </article>
  )
}

function ShortageHeatmap(props: { zones: ZoneSnapshot[] }) {
  const top = props.zones.slice(0, 12)
  const maxShortage = Math.max(...top.map((zone) => zone.shortage), 1)

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Shortage Mini Heatmap</p>
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
              className="rounded-md border border-slate-700/80 px-2 py-2 text-[11px] font-medium text-slate-100"
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

function DemandCapacityComparison(props: { totalDemand: number; totalNeededVehicles: number; activeVehicles: number }) {
  const max = Math.max(props.totalDemand, props.totalNeededVehicles, props.activeVehicles, 1)

  const bar = (value: number, tone: string) => (
    <div className="h-3 w-full rounded-full bg-slate-800">
      <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: tone }} />
    </div>
  )

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Demand vs Capacity Comparison</p>
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
    </article>
  )
}

function RankedWardBars(props: { zones: ZoneSnapshot[] }) {
  const topShortages = props.zones.slice(0, 6)
  const maxShortage = Math.max(...topShortages.map((zone) => zone.shortage), 1)

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ranked Ward Shortage Bars</p>
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
                className="h-2.5 rounded-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300"
                style={{ width: `${Math.max(8, (zone.shortage / maxShortage) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function RecommendationFlow(props: { highlightedZone: string }) {
  return (
    <article className="rounded-xl border border-amber-700/60 bg-[linear-gradient(180deg,rgba(120,53,15,0.24)_0%,rgba(15,23,42,0.75)_100%)] p-5 shadow-[0_0_28px_rgba(245,158,11,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-amber-100">Deployment Recommendation Flow</h3>
        <span className="rounded-full border border-rose-700/80 bg-rose-900/40 px-3 py-1 text-xs font-semibold text-rose-200">
          Priority Action
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <p className="font-semibold">Shortage scan</p>
          <p className="mt-1 text-xs text-slate-400">Monitor ward-level demand deficit.</p>
        </div>
        <ArrowRight className="mx-auto text-amber-300" size={16} />
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <p className="font-semibold">Deploy support</p>
          <p className="mt-1 text-xs text-slate-400">Move 8 verified vehicles to {props.highlightedZone}.</p>
        </div>
        <ArrowRight className="mx-auto text-amber-300" size={16} />
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <p className="font-semibold">Track impact</p>
          <p className="mt-1 text-xs text-slate-400">Recheck coverage and ETA stress after deployment.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-3.5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
          <Truck size={15} />
          Deploy 8 Vehicles
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-rose-700/70 bg-rose-900/30 px-3.5 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-900/50">
          <Siren size={15} />
          Trigger Incident Watch
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3.5 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800">
          <ShieldAlert size={15} />
          Send Patrol Alert
        </button>
      </div>
    </article>
  )
}

export function GovOpsDashboard(props: GovOpsDashboardProps) {
  const rankedZones = [...props.zones].sort((a, b) => b.shortage - a.shortage)
  const hotspot = rankedZones[0]?.zone ?? 'Ward 72'

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3">
        <EnhancedKpiCard
          title="Total Night Demand"
          value={props.totalDemand.toLocaleString()}
          helper="Projected city-wide requests tonight"
          trendLabel="Peak window 22:00-23:00"
          trendTone="rose"
        />
        <EnhancedKpiCard
          title="Coverage"
          value={`${Math.min(100, props.coveragePct)}%`}
          helper="Active fleet against required support"
          trendLabel={props.coveragePct >= 90 ? 'Within target' : 'Below safety target'}
          trendTone={props.coveragePct >= 90 ? 'emerald' : 'amber'}
        />
        <EnhancedKpiCard
          title="Shortage Zones"
          value={props.shortageZones.toString()}
          helper="Wards requiring urgent allocation"
          trendLabel={`${hotspot} highest risk`}
          trendTone="amber"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <CoverageGauge
          coveragePct={props.coveragePct}
          activeVehicles={props.activeVehicles}
          neededVehicles={props.totalNeededVehicles}
        />
        <ShortageHeatmap zones={rankedZones} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DemandCapacityComparison
          totalDemand={props.totalDemand}
          totalNeededVehicles={props.totalNeededVehicles}
          activeVehicles={props.activeVehicles}
        />
        <RankedWardBars zones={rankedZones} />
      </section>

      <RecommendationFlow highlightedZone={hotspot} />
    </div>
  )
}
