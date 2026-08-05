import { Siren } from 'lucide-react'

type FloatingSOSButtonProps = {
  onClick: () => void
}

export function FloatingSOSButton(props: FloatingSOSButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/70 bg-rose-600 text-white shadow-[0_0_22px_rgba(225,29,72,0.6)] transition hover:bg-rose-500"
      aria-label="Trigger SOS"
    >
      <Siren size={20} />
    </button>
  )
}
