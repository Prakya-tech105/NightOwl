import { Shield } from 'lucide-react'

type SafetyAdvisoryCardProps = {
  title: string
  message: string
}

export function SafetyAdvisoryCard(props: SafetyAdvisoryCardProps) {
  return (
    <article className="rounded-2xl border border-indigo-800/70 bg-gradient-to-r from-indigo-950/70 to-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-700/30 text-violet-200">
          <Shield size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">{props.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{props.message}</p>
        </div>
      </div>
    </article>
  )
}
