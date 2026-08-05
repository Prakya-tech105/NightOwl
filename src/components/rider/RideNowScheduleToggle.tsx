import type { TripMode } from './types'

type RideNowScheduleToggleProps = {
  value: TripMode
  onChange: (mode: TripMode) => void
  scheduledAt: string
  onScheduleChange: (value: string) => void
}

export function RideNowScheduleToggle(props: RideNowScheduleToggleProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trip Timing</p>
      <div className="inline-flex rounded-2xl border border-indigo-900/70 bg-[#020826] p-1">
        {(['now', 'later'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => props.onChange(mode)}
            className={[
              'rounded-xl px-5 py-2.5 text-sm font-semibold transition',
              props.value === mode
                ? 'bg-violet-700 text-white shadow-[0_0_18px_rgba(124,58,237,0.45)]'
                : 'text-slate-300 hover:bg-slate-800',
            ].join(' ')}
          >
            {mode === 'now' ? 'Ride now' : 'Schedule later'}
          </button>
        ))}
      </div>

      {props.value === 'later' ? (
        <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Pickup Time
          <input
            type="datetime-local"
            value={props.scheduledAt}
            onChange={(event) => props.onScheduleChange(event.target.value)}
            className="mt-3 h-12 w-full rounded-xl border border-indigo-900/70 bg-[#020826] px-3 text-sm text-slate-100 outline-none focus:border-violet-500"
          />
        </label>
      ) : null}
    </div>
  )
}
