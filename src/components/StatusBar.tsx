import { useEffect, useState } from 'react'
import { useStatusStore } from '../store/statusStore'

export function StatusBar() {
  const status = useStatusStore((s) => s.status)

  // Reset visibility whenever a new status arrives, using the render-time
  // state-adjustment pattern (not an effect) since this responds to a prop/state
  // change rather than synchronizing with an external system.
  const [lastSeenId, setLastSeenId] = useState(status.id)
  const [hidden, setHidden] = useState(false)
  if (status.id !== lastSeenId) {
    setLastSeenId(status.id)
    setHidden(false)
  }

  // The timer itself is the external system being synchronized here.
  useEffect(() => {
    if (status.kind === 'loading' || status.kind === 'idle') return
    const delay = status.kind === 'error' ? 6000 : 2500
    const timer = setTimeout(() => setHidden(true), delay)
    return () => clearTimeout(timer)
  }, [status.id, status.kind])

  const visible = status.kind !== 'idle' && !hidden

  const dotClass =
    status.kind === 'loading'
      ? 'bg-amber-400 animate-pulse'
      : status.kind === 'success'
        ? 'bg-emerald-400'
        : status.kind === 'error'
          ? 'bg-red-400'
          : 'bg-neutral-600'

  const textClass =
    status.kind === 'error'
      ? 'text-red-600 dark:text-red-300'
      : status.kind === 'loading'
        ? 'text-amber-600 dark:text-amber-200'
        : 'text-neutral-600 dark:text-neutral-300'

  return (
    <footer className="flex h-6 shrink-0 items-center gap-2 border-t border-neutral-200 bg-neutral-50 px-3 text-xs dark:border-neutral-800 dark:bg-neutral-950">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      <span className={`truncate ${visible ? textClass : 'text-neutral-400 dark:text-neutral-600'}`}>
        {visible ? status.message : 'Ready'}
      </span>
    </footer>
  )
}
