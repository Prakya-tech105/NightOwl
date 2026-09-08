import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CircleCheck,
  Download,
  Eye,
  Gauge,
  IndianRupee,
  MapPin,
  PhoneCall,
  Route,
  ShieldAlert,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ToastState = {
  title: string
  message: string
  tone: 'success' | 'info'
}

type MetricCardProps = {
  title: string
  value: string
  subtitle: string
  chipLabel?: string
  chipTone?: 'neutral' | 'success' | 'warning' | 'info'
  icon: ReactNode
  trendData?: { day: string; value: number }[]
}

function ToastNotification({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return

    const timeout = window.setTimeout(() => onClose(), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast, onClose])

  if (!toast) return null

  const toneClasses =
    toast.tone === 'success'
      ? 'border-emerald-500/60 bg-emerald-900/80 text-emerald-50'
      : 'border-sky-500/60 bg-sky-900/80 text-sky-50'

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60]">
      <div role="status" aria-live="polite" className={['min-w-[220px] rounded-xl border p-3 shadow-2xl', toneClasses].join(' ')}>
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="mt-1 text-xs opacity-90">{toast.message}</p>
      </div>
    </div>
  )
}

function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmLoading,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  confirmLoading?: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="confirmation-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <h3 id="confirmation-title" className="text-lg font-semibold text-slate-50">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{description}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmLoading}
            className="min-h-11 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {confirmLoading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function SheetFrame({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
      <aside role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="h-full w-full max-w-md border-l border-slate-700 bg-slate-900/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="sheet-title" className="text-lg font-semibold text-slate-50">{title}</h3>
          <button type="button" aria-label="Close panel" title="Close panel" onClick={onClose} className="rounded-full p-2 text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <X size={18} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}

function SmallTrendChart({ data, color }: { data: { day: string; value: number }[]; color: string }) {
  return (
    <div className="mt-3 h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#fill-${color.replace('#', '')})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricCard({ title, value, subtitle, chipLabel, chipTone = 'neutral', icon, trendData }: MetricCardProps) {
  const chipStyles = {
    neutral: 'border-slate-700 bg-slate-800/70 text-slate-100',
    success: 'border-emerald-700/70 bg-emerald-900/30 text-emerald-200',
    warning: 'border-amber-700/70 bg-amber-900/30 text-amber-200',
    info: 'border-sky-700/70 bg-sky-900/30 text-sky-200',
  }

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-[0_0_24px_rgba(15,23,42,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 text-violet-300">
          {icon}
        </div>
      </div>

      {trendData ? <SmallTrendChart data={trendData} color={title.includes('Revenue') ? '#38bdf8' : '#94a3b8'} /> : null}

      {chipLabel ? (
        <div className="mt-3 flex justify-start">
          <span className={['inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', chipStyles[chipTone]].join(' ')}>
            {chipLabel}
          </span>
        </div>
      ) : null}
    </article>
  )
}

function CoverageCard() {
  const [pendingOpen, setPendingOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const pendingEmployees = [
    { name: 'Meera Iyer', shift: '22:00 - 02:00', pickupArea: 'Koramangala', status: 'Awaiting allocation' },
    { name: 'Nisha Kulkarni', shift: '21:30 - 01:30', pickupArea: 'Whitefield', status: 'Awaiting allocation' },
    { name: 'Asha Nair', shift: '23:00 - 03:00', pickupArea: 'Indiranagar', status: 'Awaiting allocation' },
    { name: 'Rhea Menon', shift: '22:30 - 02:30', pickupArea: 'HSR Layout', status: 'Awaiting allocation' },
  ]

  const sendNotification = async () => {
    setIsSending(true)
    setConfirmOpen(false)
    await new Promise((resolve) => window.setTimeout(resolve, 900))
    setIsSending(false)
    setToast({
      title: 'Fleet operator notified',
      message: 'Fleet operator notified about pending employee allocations.',
      tone: 'success',
    })
  }

  return (
    <>
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <ConfirmationModal
        open={confirmOpen}
        title="Notify Fleet Operator"
        description="This will notify the fleet team about the 40 employees still waiting for allocation before the 22:00 peak shift."
        confirmLabel="Confirm notification"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { void sendNotification() }}
        confirmLoading={isSending}
      />

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-[0_0_24px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <Gauge size={14} />
              <p>Coverage</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">Tonight's Transport Coverage</h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-200">
            <CircleCheck size={12} />
            95% covered
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <p className="text-4xl font-semibold tracking-tight text-slate-50">95%</p>
          <p className="text-xs text-slate-400">Target: 98% coverage</p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-[95%] rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-200" />
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <div className="flex items-center justify-between gap-2"><span>860 employees need transport</span><span>860</span></div>
          <div className="flex items-center justify-between gap-2"><span>820 employees allocated</span><span>820</span></div>
          <div className="flex items-center justify-between gap-2"><span>40 employees awaiting allocation</span><span>40</span></div>
        </div>

        <p className="mt-4 text-sm text-slate-400">40 employees still need allocation before the 22:00 peak shift.</p>

        <button type="button" onClick={() => setPendingOpen(true)} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500">
          <Eye size={16} />
          Review Pending Employees
          <ArrowRight size={16} />
        </button>
      </section>

      <SheetFrame open={pendingOpen} title="Pending employees" onClose={() => setPendingOpen(false)}>
        <div className="space-y-3">
          {pendingEmployees.map((employee) => (
            <div key={employee.name} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">{employee.name}</p>
                  <p className="text-xs text-slate-400">{employee.shift}</p>
                </div>
                <span className="rounded-full border border-amber-700/70 bg-amber-900/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                  {employee.status}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <MapPin size={12} />
                <span>{employee.pickupArea}</span>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setConfirmOpen(true)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
          <PhoneCall size={16} />
          Notify Fleet Operator
        </button>
      </SheetFrame>
    </>
  )
}

function StatusSummaryCard({ title, rows, actionLabel, onAction, highlight }: {
  title: string
  rows: { label: string; value: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }[]
  actionLabel: string
  onAction: () => void
  highlight?: { severity: string; type: string; employee: string; status: string }
}) {
  const toneClasses = {
    neutral: 'border-slate-700 bg-slate-950/60 text-slate-200',
    success: 'border-emerald-700/70 bg-emerald-900/20 text-emerald-200',
    warning: 'border-amber-700/70 bg-amber-900/25 text-amber-200',
    danger: 'border-rose-700/70 bg-rose-900/25 text-rose-200',
    info: 'border-sky-700/70 bg-sky-900/25 text-sky-200',
  }

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-[0_0_22px_rgba(2,6,23,0.2)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        <button type="button" aria-label={actionLabel} title={actionLabel} onClick={onAction} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500">
          <Eye size={14} />
          {actionLabel}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
            <span className="text-slate-300">{row.label}</span>
            <span className={['rounded-full border px-2 py-1 text-[11px] font-semibold', toneClasses[row.tone ?? 'neutral']].join(' ')}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {highlight ? (
        <div className="mt-4 rounded-xl border border-rose-700/60 bg-rose-950/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-700/70 bg-rose-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-200">
              <TriangleAlert size={10} />
              {highlight.severity}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-100">
              <ShieldAlert size={10} />
              {highlight.status}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-rose-100">{highlight.type}</p>
          <p className="mt-1 text-xs text-rose-100/80">Employee: {highlight.employee}</p>
        </div>
      ) : null}
    </article>
  )
}

function RevenueCard() {
  const [reportGenerating, setReportGenerating] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const generateReport = async () => {
    setReportGenerating(true)
    await new Promise((resolve) => window.setTimeout(resolve, 1000))
    setReportGenerating(false)
    setToast({
      title: 'Report generated',
      message: "Tonight's report is ready to download.",
      tone: 'success',
    })
  }

  return (
    <>
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-[0_0_22px_rgba(2,6,23,0.2)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-50">Revenue and Transport Performance</h3>
          <button type="button" onClick={() => { void generateReport() }} disabled={reportGenerating} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-violet-500">
            <Download size={14} />
            {reportGenerating ? 'Generating...' : "Download Tonight's Report"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-2 text-sm text-slate-300">
              <span>Revenue collected tonight</span>
              <span className="inline-flex items-center gap-1 text-emerald-200"><IndianRupee size={14} /> 1,72,000</span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p>Completed rides: <span className="font-semibold text-slate-100">763</span></p>
              <p>Average revenue per completed ride: <span className="font-semibold text-slate-100">₹225</span></p>
            </div>

            <div className="mt-4 h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { day: 'Mon', value: 120000 },
                  { day: 'Tue', value: 128000 },
                  { day: 'Wed', value: 135000 },
                  { day: 'Thu', value: 141000 },
                  { day: 'Fri', value: 156000 },
                  { day: 'Sat', value: 172000 },
                ]} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                  <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-3 text-xs text-slate-400">Revenue is 12% higher than yesterday, driven by the 22:00 to 23:00 shift peak.</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Service quality</h4>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                  <span>On-time pickups</span>
                  <span className="font-semibold text-slate-100">92%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
                <span className="text-slate-300">Average pickup delay</span>
                <span className="font-semibold text-amber-200">6 min</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
                <span className="text-slate-300">Average employee rating</span>
                <span className="font-semibold text-emerald-200">4.6 / 5</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-amber-200">Pickup punctuality is below the company target of 95%.</p>
          </div>
        </div>
      </section>
    </>
  )
}

function LiveTripsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trips = [
    { employee: 'Priya Rao', vehicleNumber: 'KA-09-KL-2114', status: 'Driver arriving', eta: '4 min' },
    { employee: 'Anu Singh', vehicleNumber: 'KA-11-MN-8842', status: 'In trip', eta: '12 min' },
    { employee: 'Nandini G', vehicleNumber: 'KA-12-TY-6421', status: 'Delayed', eta: '18 min' },
    { employee: 'Sonia Varghese', vehicleNumber: 'KA-07-BQ-3921', status: 'In trip', eta: '9 min' },
  ]

  return (
    <SheetFrame open={open} title="Live trips" onClose={onClose}>
      <div className="space-y-3">
        {trips.map((trip) => (
          <div key={`${trip.employee}-${trip.vehicleNumber}`} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-100">{trip.employee}</p>
              <span className={['rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]', trip.status === 'Delayed' ? 'border-amber-700/70 bg-amber-900/30 text-amber-200' : trip.status === 'Driver arriving' ? 'border-sky-700/70 bg-sky-900/30 text-sky-200' : 'border-emerald-700/70 bg-emerald-900/30 text-emerald-200'].join(' ')}>
                {trip.status}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
              <span>{trip.vehicleNumber}</span>
              <span>ETA {trip.eta}</span>
            </div>
          </div>
        ))}
      </div>
    </SheetFrame>
  )
}

function SafetyAlertsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const alerts = [
    { id: 'SOS-104', type: 'SOS activated', employee: 'Priya Rao', time: '21:34', status: 'Fleet operator notified' },
    { id: 'DELAY-210', type: 'Delayed pickup', employee: 'Anu Singh', time: '21:22', status: 'Monitor in progress' },
    { id: 'COMPLAINT-301', type: 'Driver check-in timeout', employee: 'Riya Nair', time: '20:58', status: 'Under review' },
  ]

  const contactOperator = async () => {
    setIsSending(true)
    setConfirmOpen(false)
    await new Promise((resolve) => window.setTimeout(resolve, 900))
    setIsSending(false)
    setToast({
      title: 'Fleet operator contacted',
      message: 'The fleet operator has been notified about the active safety alert.',
      tone: 'success',
    })
  }

  return (
    <>
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <ConfirmationModal
        open={confirmOpen}
        title="Contact Fleet Operator"
        description="This will notify the fleet operator about the active safety alert and ensure the issue remains under active monitoring."
        confirmLabel="Confirm contact"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { void contactOperator() }}
        confirmLoading={isSending}
      />

      <SheetFrame open={open} title="Safety alerts" onClose={onClose}>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{alert.type}</p>
                <span className={['rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]', alert.type === 'SOS activated' ? 'border-rose-700/70 bg-rose-900/30 text-rose-200' : 'border-amber-700/70 bg-amber-900/30 text-amber-200'].join(' ')}>
                  {alert.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Employee: {alert.employee}</p>
              <p className="mt-1 text-xs text-slate-400">Time: {alert.time}</p>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setConfirmOpen(true)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
          Contact Fleet Operator
        </button>
      </SheetFrame>
    </>
  )
}

export function CompanyAdminDashboard() {
  const [liveTripsOpen, setLiveTripsOpen] = useState(false)
  const [safetyOpen, setSafetyOpen] = useState(false)
  const [pendingNotifyOpen, setPendingNotifyOpen] = useState(false)
  const [pendingLoading, setPendingLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const overview = useMemo(
    () => [
      {
        title: 'Employees Needing Rides',
        value: '860',
        subtitle: 'Scheduled for night shifts',
        chipLabel: 'Demand trend',
        chipTone: 'neutral' as const,
        icon: <Users size={17} />,
        trendData: [
          { day: 'Mon', value: 710 },
          { day: 'Tue', value: 740 },
          { day: 'Wed', value: 760 },
          { day: 'Thu', value: 780 },
          { day: 'Fri', value: 810 },
          { day: 'Sat', value: 860 },
        ],
      },
      {
        title: 'Employees Allocated',
        value: '820',
        subtitle: 'Assigned to verified transport',
        chipLabel: '95% covered',
        chipTone: 'success' as const,
        icon: <CircleCheck size={17} />,
      },
      {
        title: 'Active Trips',
        value: '42',
        subtitle: 'Currently in transit',
        chipLabel: '3 delayed',
        chipTone: 'warning' as const,
        icon: <Route size={17} />,
      },
      {
        title: 'Revenue Collected',
        value: '₹1,72,000',
        subtitle: "Tonight's completed and confirmed rides",
        chipLabel: '+12% vs yesterday',
        chipTone: 'success' as const,
        icon: <IndianRupee size={17} />,
        trendData: [
          { day: 'Mon', value: 120000 },
          { day: 'Tue', value: 128000 },
          { day: 'Wed', value: 135000 },
          { day: 'Thu', value: 141000 },
          { day: 'Fri', value: 156000 },
          { day: 'Sat', value: 172000 },
        ],
      },
    ],
    [],
  )

  const tripRows = [
    { label: 'Driver arriving', value: '18', tone: 'info' as const },
    { label: 'In trip', value: '42', tone: 'neutral' as const },
    { label: 'Completed', value: '763', tone: 'success' as const },
    { label: 'Delayed', value: '3', tone: 'danger' as const },
  ]

  const safetyRows = [
    { label: 'Active alerts', value: '1', tone: 'danger' as const },
    { label: 'Delayed pickups', value: '3', tone: 'warning' as const },
    { label: 'Resolved today', value: '4', tone: 'success' as const },
  ]

  const notifyPendingFleet = async () => {
    setPendingLoading(true)
    setPendingNotifyOpen(false)
    await new Promise((resolve) => window.setTimeout(resolve, 900))
    setPendingLoading(false)
    setToast({
      title: 'Fleet operator notified',
      message: 'Fleet operator notified about pending employee allocations.',
      tone: 'success',
    })
  }

  return (
    <>
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <ConfirmationModal
        open={pendingNotifyOpen}
        title="Notify Fleet Operator"
        description="This will notify the fleet team about the 40 employees still waiting for allocation before the 22:00 peak shift."
        confirmLabel="Confirm notification"
        onCancel={() => setPendingNotifyOpen(false)}
        onConfirm={() => { void notifyPendingFleet() }}
        confirmLoading={pendingLoading}
      />

      <LiveTripsSheet open={liveTripsOpen} onClose={() => setLiveTripsOpen(false)} />
      <SafetyAlertsSheet open={safetyOpen} onClose={() => setSafetyOpen(false)} />

      <div className="mx-auto w-full max-w-6xl space-y-4">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => (
            <MetricCard
              key={item.title}
              title={item.title}
              value={item.value}
              subtitle={item.subtitle}
              chipLabel={item.chipLabel}
              chipTone={item.chipTone}
              icon={item.icon}
              trendData={item.trendData}
            />
          ))}
        </section>

        <CoverageCard />

        <section className="grid gap-4 lg:grid-cols-2">
          <StatusSummaryCard
            title="Live Trip Status"
            rows={tripRows}
            actionLabel="View Live Trips"
            onAction={() => setLiveTripsOpen(true)}
            highlight={{ severity: 'Critical', type: 'SOS activated', employee: 'Priya Rao', status: 'Fleet operator notified' }}
          />

          <StatusSummaryCard
            title="Safety Attention"
            rows={safetyRows}
            actionLabel="View Safety Alerts"
            onAction={() => setSafetyOpen(true)}
            highlight={{ severity: 'Critical', type: 'SOS activated', employee: 'Priya Rao', status: 'Fleet operator notified' }}
          />
        </section>

        <RevenueCard />
      </div>
    </>
  )
}