import {
  CarFront,
  Clock3,
  Copy,
  MessageCircle,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DriverSnapshot } from './types'

type DriverArrivalCardProps = {
  driver: DriverSnapshot
  fromLocation: string
  toLocation: string
  etaMinutes?: number
  onStartTrip: () => void
}

type ToastState = {
  title: string
  message: string
  tone: 'success' | 'info'
}

type ChatMessage = {
  id: string
  sender: 'driver' | 'rider'
  text: string
}

function ToastNotification(props: { toast: ToastState | null; onClose: () => void }) {
  useEffect(() => {
    if (!props.toast) return

    const timeout = window.setTimeout(() => props.onClose(), 2600)
    return () => window.clearTimeout(timeout)
  }, [props.toast, props.onClose])

  if (!props.toast) return null

  const toneClass =
    props.toast.tone === 'success'
      ? 'border-emerald-500/60 bg-emerald-900/80 text-emerald-50'
      : 'border-sky-500/60 bg-sky-900/80 text-sky-50'

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80]">
      <div role="status" aria-live="polite" className={['min-w-[220px] rounded-xl border p-3 shadow-xl', toneClass].join(' ')}>
        <p className="text-sm font-semibold">{props.toast.title}</p>
        <p className="mt-1 text-xs opacity-90">{props.toast.message}</p>
      </div>
    </div>
  )
}

function ConfirmationModal(props: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    if (!props.open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onCancel()
      if (event.key === 'Enter') props.onConfirm()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props])

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="call-confirmation-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3 id="call-confirmation-title" className="text-lg font-semibold text-slate-50">{props.title}</h3>
          <button type="button" onClick={props.onCancel} className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100" aria-label="Close confirmation">
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-300">{props.description}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={props.onCancel} className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700">
            Cancel
          </button>
          <button type="button" onClick={props.onConfirm} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function BottomSheet(props: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!props.open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props])

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="bottom-sheet-title" className="w-full max-w-md rounded-t-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="bottom-sheet-title" className="text-lg font-semibold text-slate-100">{props.title}</h3>
          <button type="button" onClick={props.onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100" aria-label="Close sheet">
            <X size={16} />
          </button>
        </div>
        {props.children}
      </div>
    </div>
  )
}

export function DriverArrivalCard(props: DriverArrivalCardProps) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [shareSheetOpen, setShareSheetOpen] = useState(false)
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const [callSeconds, setCallSeconds] = useState(0)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'driver-1', sender: 'driver', text: 'I am on the way to your pickup point. I will arrive in 3 minutes.' },
    { id: 'driver-2', sender: 'driver', text: 'Please keep your phone nearby and share your exact landmark if needed.' },
  ])

  const tripSummary = useMemo(
    () => ({
      title: 'Safe Night Ride Summary',
      route: `${props.fromLocation} to ${props.toLocation}`,
      driver: `${props.driver.name} • ${props.driver.vehicleNumber}`,
      eta: `${props.etaMinutes ?? props.driver.etaMinutes} min`,
      link: 'https://nightowl.app/trip/secure/ride-4821',
    }),
    [props.driver.etaMinutes, props.driver.name, props.driver.vehicleNumber, props.fromLocation, props.toLocation, props.etaMinutes],
  )

  useEffect(() => {
    if (callState !== 'connected') return

    const interval = window.setInterval(() => setCallSeconds((current) => current + 1), 1000)
    return () => window.clearInterval(interval)
  }, [callState])

  const openChat = () => setChatOpen(true)
  const closeChat = () => setChatOpen(false)

  const sendChatMessage = () => {
    const trimmed = chatInput.trim()
    if (!trimmed) return

    const nextUserMessage = {
      id: `rider-${Date.now()}`,
      sender: 'rider' as const,
      text: trimmed,
    }

    setMessages((current) => [...current, nextUserMessage])
    setChatInput('')

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: `driver-${Date.now()}`,
          sender: 'driver' as const,
          text: 'Got it. I am almost there and will keep you updated on my exact arrival spot.',
        },
      ])
    }, 700)
  }

  const handleCallConfirm = () => {
    setCallModalOpen(false)
    setCallState('connecting')

    window.setTimeout(() => {
      setCallState('connected')
      setToast({
        title: 'Call connected',
        message: 'Your driver is now connected via a masked number.',
        tone: 'success',
      })
    }, 1200)
  }

  const endCall = () => {
    setCallState('idle')
    setCallSeconds(0)
    setToast({
      title: 'Call ended',
      message: 'The call session has ended.',
      tone: 'info',
    })
  }

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const copyTripLink = async () => {
    try {
      await navigator.clipboard.writeText(tripSummary.link)
      setToast({
        title: 'Safe trip link copied',
        message: 'The trip link is saved to your clipboard.',
        tone: 'success',
      })
    } catch {
      setToast({
        title: 'Copy failed',
        message: 'Unable to copy the link right now.',
        tone: 'info',
      })
    }
  }

  const shareTripDetails = async () => {
    const shareText = `${tripSummary.title}\nRoute: ${tripSummary.route}\nDriver: ${tripSummary.driver}\nETA: ${tripSummary.eta}\nAccess expires after the trip ends.`

    try {
      if (navigator.share) {
        await navigator.share({
          title: tripSummary.title,
          text: shareText,
          url: tripSummary.link,
        })
        setToast({
          title: 'Trip details shared',
          message: 'Shared securely with your selected contact.',
          tone: 'success',
        })
        return
      }

      await navigator.clipboard.writeText(`${shareText}\nLink: ${tripSummary.link}`)
      setToast({
        title: 'Share fallback used',
        message: 'Trip details were copied because sharing is unavailable here.',
        tone: 'info',
      })
    } catch {
      setToast({
        title: 'Share unavailable',
        message: 'Sharing could not be completed on this device.',
        tone: 'info',
      })
    }
  }

  return (
    <>
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <ConfirmationModal
        open={callModalOpen}
        title="Call driver"
        description="This call uses a masked number to protect both rider and driver privacy. You can end the call at any time once connected."
        confirmLabel="Confirm call"
        onCancel={() => setCallModalOpen(false)}
        onConfirm={handleCallConfirm}
      />

      <BottomSheet open={chatOpen} title="Driver chat" onClose={closeChat}>
        <div className="space-y-3">
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            {messages.map((message) => (
              <div key={message.id} className={['flex', message.sender === 'rider' ? 'justify-end' : 'justify-start'].join(' ')}>
                <div className={['max-w-[80%] rounded-xl px-3 py-2 text-sm', message.sender === 'rider' ? 'bg-violet-700 text-white' : 'bg-slate-800 text-slate-100'].join(' ')}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              aria-label="Message the driver"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') sendChatMessage()
              }}
              placeholder="Type a message"
              className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500"
            />
            <button type="button" onClick={sendChatMessage} disabled={!chatInput.trim()} className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-700 px-3 text-white disabled:cursor-not-allowed disabled:opacity-60">
              <Send size={15} />
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={shareSheetOpen} title="Share trip details" onClose={() => setShareSheetOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
            <p className="font-semibold text-slate-100">Trip summary</p>
            <p className="mt-2">{tripSummary.route}</p>
            <p className="mt-1 text-slate-400">Driver: {tripSummary.driver}</p>
            <p className="mt-1 text-slate-400">ETA: {tripSummary.eta}</p>
            <p className="mt-2 text-xs text-amber-200">Shared access expires after the trip ends.</p>
          </div>

          <div className="space-y-2">
            <button type="button" onClick={copyTripLink} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-800">
              <Copy size={15} />
              Copy Safe Trip Link
            </button>
            <button type="button" onClick={shareTripDetails} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-800">
              <Share2 size={15} />
              Share with Contact
            </button>
          </div>
        </div>
      </BottomSheet>

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
          <button
            type="button"
            onClick={() => setCallModalOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 hover:bg-slate-800"
          >
            <Phone size={14} />
            Call
          </button>
          <button
            type="button"
            onClick={openChat}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 hover:bg-slate-800"
          >
            <MessageCircle size={14} />
            Chat
          </button>
          <button
            type="button"
            onClick={() => setShareSheetOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 hover:bg-slate-800"
          >
            <Share2 size={14} />
            Share Trip Details
          </button>
        </div>

        {callState !== 'idle' ? (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-violet-300" />
                <span>{callState === 'connecting' ? 'Connecting...' : 'Connected'}</span>
              </div>
              {callState === 'connected' ? (
                <button type="button" onClick={endCall} className="rounded-lg border border-rose-700/70 bg-rose-900/40 px-2.5 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-900/60">
                  End Call
                </button>
              ) : null}
            </div>
            {callState === 'connected' ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-200">
                <Clock3 size={12} />
                {formatCallTime(callSeconds)}
              </div>
            ) : null}
          </div>
        ) : null}

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
    </>
  )
}
