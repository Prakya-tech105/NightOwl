import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Crosshair, Search } from 'lucide-react'

type RiderLocationFieldProps = {
  label: string
  placeholder: string
  value: string
  options: string[]
  icon: LucideIcon
  onChange: (value: string) => void
  allowCurrentLocation?: boolean
  currentLocationLabel?: string
  onUseCurrentLocation?: () => void
  isUsingCurrentLocation?: boolean
  fetchSuggestions?: (query: string) => Promise<string[]>
}

export function RiderLocationField(props: RiderLocationFieldProps) {
  const Icon = props.icon
  const [isOpen, setIsOpen] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [remoteOptions, setRemoteOptions] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    if (!props.fetchSuggestions || props.value.trim().length < 2) {
      setRemoteOptions([])
      setIsLoadingSuggestions(false)
      return () => {
        cancelled = true
      }
    }

    setIsLoadingSuggestions(true)

    const timer = setTimeout(() => {
      props
        .fetchSuggestions?.(props.value)
        .then((suggestions) => {
          if (cancelled) return
          setRemoteOptions(suggestions)
        })
        .catch(() => {
          if (cancelled) return
          setRemoteOptions([])
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingSuggestions(false)
          }
        })
    }, 260)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [props.fetchSuggestions, props.value])

  const filteredOptions = useMemo(() => {
    const needle = props.value.trim().toLowerCase()
    const local = !needle
      ? props.options.slice(0, 8)
      : props.options.filter((option) => option.toLowerCase().includes(needle)).slice(0, 8)

    if (!remoteOptions.length) return local
    return Array.from(new Set([...remoteOptions, ...local])).slice(0, 10)
  }, [props.options, props.value, remoteOptions])

  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
      {props.label}
      <div className="relative mt-3">
        <Icon
          size={18}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          value={props.value}
          placeholder={props.placeholder}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            props.onChange(event.target.value)
            setIsOpen(true)
          }}
          className="h-16 w-full rounded-2xl border border-indigo-900/70 bg-[#020826] pl-12 pr-12 text-lg font-medium text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-500"
        />
        <Search
          size={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
        />

        {isOpen ? (
          <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-indigo-900/70 bg-[#060f31] shadow-[0_18px_40px_rgba(2,6,23,0.72)]">
            {props.allowCurrentLocation && props.onUseCurrentLocation ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={props.onUseCurrentLocation}
                className="flex w-full items-center gap-2 border-b border-indigo-900/60 px-4 py-3 text-left text-sm text-violet-200 hover:bg-violet-900/30"
              >
                <Crosshair size={14} />
                {props.currentLocationLabel ?? 'Use current location'}
                {props.isUsingCurrentLocation ? '...' : ''}
              </button>
            ) : null}

            {isLoadingSuggestions ? (
              <p className="px-4 py-3 text-sm text-slate-400">Searching Google Maps...</p>
            ) : filteredOptions.length ? (
              <div className="max-h-64 overflow-y-auto">
                {filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      props.onChange(option)
                      setIsOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800/80"
                  >
                    <Icon size={14} className="text-slate-400" />
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-slate-400">No matching locations. Continue typing for a specific spot.</p>
            )}
          </div>
        ) : null}
      </div>
    </label>
  )
}
