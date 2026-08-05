import { CarFront, MessageCircle, Phone, Share2, ShieldCheck } from 'lucide-react'
import type { DriverSnapshot } from './types'

type DriverArrivalCardProps = {
  driver: DriverSnapshot
  onStartTrip: () => void
}

export function DriverArrivalCard(props: DriverArrivalCardProps) {
  return (
    <article className="rounded-2xl border border-violet-700/60 bg-slate-900/70 p-5 shadow-[0_0_24px_rgba(124,58,237,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-800 text-slate-200">
            <CarFront size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-100">{props.driver.name}</p>
            <p className="text-sm text-slate-400">
              {props.driver.vehicleType} • {props.driver.vehicleNumber}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-700/70 bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-200">
          ETA {props.driver.etaMinutes} min
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-violet-700/70 bg-violet-900/30 px-2.5 py-1 text-violet-100">
          Safety confidence {props.driver.safetyConfidence}%
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1 text-emerald-200">
          <ShieldCheck size={12} />
          Verified driver
        </span>
        {props.driver.backgroundChecked ? (
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200">
            Background checked
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 hover:bg-slate-800">
          <Phone size={14} />
          Call
        </button>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 hover:bg-slate-800">
          <MessageCircle size={14} />
          Chat
        </button>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 hover:bg-slate-800">
          <Share2 size={14} />
          Share trip
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className="min-h-11 rounded-xl border border-rose-700/70 bg-rose-900/30 px-3 text-sm font-semibold text-rose-200 hover:bg-rose-900/50">
          Cancel ride
        </button>
        <button
          onClick={props.onStartTrip}
          className="min-h-11 rounded-xl border border-violet-700/60 bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-600"
        >
          Driver has arrived
        </button>
      </div>
    </article>
  )
}
