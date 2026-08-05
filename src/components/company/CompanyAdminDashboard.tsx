import { CheckCircle2, ShieldCheck, Users } from 'lucide-react'

import { StatusChip } from '../shared/StatusChip'

type SummaryCardProps = {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
}

function SummaryCard({ title, value, subtitle, icon }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/75 p-4 shadow-[0_0_24px_rgba(15,23,42,0.35)] transition duration-300 hover:border-slate-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{value}</p>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 text-amber-300">
          {icon}
        </div>
      </div>
    </article>
  )
}

export function CompanyAdminDashboard() {
  const coveragePct = 100

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <section className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          title="Employees Needing Rides Tonight"
          value="860"
          subtitle="Tonight’s transport demand"
          icon={<Users size={18} strokeWidth={2.2} />}
        />
        <SummaryCard
          title="Assigned Vehicles"
          value="5"
          subtitle="Allocated for the evening shift"
          icon={<ShieldCheck size={18} strokeWidth={2.2} />}
        />
      </section>

      <section className="rounded-2xl border border-emerald-700/55 bg-slate-900/75 p-5 shadow-[0_0_24px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Allocation Result</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">Transport covered for tonight</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              The planned vehicle allocation is sufficient for the current ride demand.
            </p>
          </div>
          <StatusChip label="Covered" tone="success" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.25fr_0.75fr] md:items-center">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Allocation coverage</span>
              <span>{coveragePct}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-200 shadow-[0_0_18px_rgba(34,197,94,0.35)]"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-700/45 bg-emerald-900/20 p-4">
            <div className="flex items-center gap-2 text-emerald-200">
              <CheckCircle2 size={18} strokeWidth={2.3} />
              <p className="font-semibold">Ready for dispatch</p>
            </div>
            <p className="mt-2 text-sm text-emerald-100/85">
              No extra escalation needed. The night transport plan is fully covered.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}