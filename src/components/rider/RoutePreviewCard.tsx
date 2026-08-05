import { Route } from 'lucide-react'
import type { RouteSummary } from './types'

type RoutePreviewCardProps = {
  from: string
  to: string
  summary: RouteSummary
}

export function RoutePreviewCard(props: RoutePreviewCardProps) {
  return (
    <article className="rounded-2xl border border-indigo-900/70 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Route size={16} className="text-violet-400" />
        Route Preview
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
          <p className="text-slate-400">Pickup</p>
          <p className="mt-1 font-semibold text-slate-100">{props.from}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
          <p className="text-slate-400">Destination</p>
          <p className="mt-1 font-semibold text-slate-100">{props.to}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200">
          ETA {props.summary.durationMinutes} min
        </span>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200">
          {props.summary.distanceKm.toFixed(1)} km
        </span>
        <span className="rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1 text-emerald-200">
          {props.summary.corridorHint}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-indigo-900/70 bg-gradient-to-r from-indigo-950/80 to-slate-900/60 p-3 text-xs text-slate-300">
        NightOwl prioritizes safer roads at night and keeps route risk scoring active throughout your trip.
      </div>
    </article>
  )
}
