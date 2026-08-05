import clsx from 'clsx'

type StatusChipProps = {
  label: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent'
}

const tones: Record<NonNullable<StatusChipProps['tone']>, string> = {
  default: 'border-slate-500/60 bg-slate-800/70 text-slate-100',
  success: 'border-emerald-700/80 bg-emerald-900/40 text-emerald-200',
  warning: 'border-amber-700/80 bg-amber-900/40 text-amber-200',
  danger: 'border-rose-700/80 bg-rose-900/40 text-rose-200',
  accent: 'border-violet-700/80 bg-violet-900/40 text-violet-200',
}

export function StatusChip({ label, tone = 'default' }: StatusChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide',
        tones[tone],
      )}
    >
      {label}
    </span>
  )
}
