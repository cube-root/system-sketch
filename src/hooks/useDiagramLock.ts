import { useEffect, useState } from 'react'
/** Prevent two tabs from silently overwriting the same local diagram. */
export function useDiagramLock(id: string) {
  const [state, setState] = useState<'waiting' | 'owned' | 'locked'>('waiting')
  useEffect(() => {
    let cancelled = false
    let release: (() => void) | undefined
    setState('waiting')
    // Defer acquisition until after StrictMode's synchronous setup/cleanup probe.
    void Promise.resolve()
      .then(async () => {
        if (cancelled) return
        if (!navigator.locks) {
          setState('owned')
          return
        }
        await navigator.locks.request(`systemsketch:${id}`, { ifAvailable: true }, async (lock) => {
          if (cancelled) return
          if (!lock) {
            setState('locked')
            return
          }
          setState('owned')
          await new Promise<void>((resolve) => {
            release = resolve
          })
        })
      })
      .catch(() => {
        if (!cancelled) setState('locked')
      })
    return () => {
      cancelled = true
      release?.()
    }
  }, [id])
  return state
}
