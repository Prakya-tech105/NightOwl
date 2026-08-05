import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import type { RideOption } from './types'

type SafeRideOptionCardProps = {
  ride: RideOption
  selected: boolean
  onSelect: (rideId: string) => void
}

export function SafeRideOptionCard(props: SafeRideOptionCardProps) {
  const { ride } = props

  return (
    <button
      type="button"
      onClick={() => props.onSelect(ride.id)}
      className={[
        'w-full rounded-2xl border p-4 text-left transition',
        props.selected
          ? 'border-violet-400 bg-violet-900/30 shadow-[0_0_24px_rgba(124,58,237,0.25)]'
          : 'border-slate-700 bg-slate-900/70 hover:border-violet-700/70',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-slate-100">{ride.name}</p>
            {ride.recommendedTag ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/70 bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                <Sparkles size={12} />
                {ride.recommendedTag}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-400">ETA {ride.etaMinutes} min • Capacity {ride.capacity}</p>
        </div>
        <p className="text-lg font-semibold text-slate-100">INR {ride.fare}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-violet-700/70 bg-violet-900/30 px-2.5 py-1 text-violet-100">
          Safety score {ride.safetyScore}
        </span>
        {ride.verifiedOnly ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1 text-emerald-200">
            <ShieldCheck size={12} />
            Verified only
          </span>
        ) : null}
        {props.selected ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-700/70 bg-sky-900/30 px-2.5 py-1 text-sky-200">
            <CheckCircle2 size={12} />
            Selected
          </span>
        ) : null}
      </div>
    </button>
  )
}
