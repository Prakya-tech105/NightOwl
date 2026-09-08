import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

export type LiveRefreshButtonProps = {
  loading: boolean
  lastUpdated: string
  onRefresh: () => void | Promise<void>
  className?: string
}

export function LiveRefreshButton({ loading, lastUpdated, onRefresh, className = '' }: LiveRefreshButtonProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(mediaQuery.matches)

    updatePreference()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference)
      return () => mediaQuery.removeEventListener('change', updatePreference)
    }

    mediaQuery.addListener(updatePreference)
    return () => mediaQuery.removeListener(updatePreference)
  }, [])

  return (
    <div className={['flex items-center gap-2', className].join(' ')}>
      <span aria-live="polite" className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
        {loading ? 'Updating…' : 'Updated just now'}
      </span>
      <button
        type="button"
        aria-label="Refresh live data"
        title="Refresh live data"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950/80 text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={['h-3.5 w-3.5', loading && 'animate-spin', reducedMotion && 'animate-none'].join(' ')} />
      </button>
      <span className="text-[10px] text-slate-400">Last updated: {lastUpdated}</span>
    </div>
  )
}
