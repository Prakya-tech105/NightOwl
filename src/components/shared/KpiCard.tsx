type KpiCardProps = {
  title: string
  value: string
  helper?: string
}

export function KpiCard({ title, value, helper }: KpiCardProps) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-soft">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-50">{value}</p>
      {helper ? <p className="mt-1 text-sm text-slate-400">{helper}</p> : null}
    </article>
  )
}
