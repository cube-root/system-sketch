import { useCallback, useEffect, useRef, useState } from 'react'
import { saveDiagram } from '@/lib/storage'
import type { Diagram } from '@/types'
export type SaveStatus = 'saved' | 'saving' | 'error'
/** Debounce edits, serialize writes, and retain unsaved snapshots on failure. */
export function useAutosave(initial: Diagram) {
  const latest = useRef(initial)
  const revision = useRef(0)
  const savedRevision = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inFlight = useRef<Promise<boolean> | null>(null)
  const mounted = useRef(true)
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [error, setError] = useState<unknown>(null)
  const flush = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current)
    if (inFlight.current) {
      const success = await inFlight.current
      if (!success) return false
    }
    if (savedRevision.current === revision.current) return true
    const write = async () => {
      try {
        // Loop so navigation also flushes edits made while an earlier transaction was pending.
        while (savedRevision.current !== revision.current) {
          const writingRevision = revision.current
          const snapshot = latest.current
          await saveDiagram(snapshot)
          savedRevision.current = writingRevision
        }
        if (mounted.current) {
          setStatus('saved')
          setError(null)
        }
        return true
      } catch (cause) {
        if (mounted.current) {
          setStatus('error')
          setError(cause)
        }
        return false
      }
    }
    inFlight.current = write()
    const success = await inFlight.current
    inFlight.current = null
    return success
  }, [])
  const update = useCallback(
    (patch: Partial<Diagram>) => {
      latest.current = { ...latest.current, ...patch, updatedAt: Date.now() }
      revision.current += 1
      setStatus('saving')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 400)
    },
    [flush],
  )
  useEffect(() => {
    mounted.current = true
    const visibility = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const unload = (event: BeforeUnloadEvent) => {
      if (savedRevision.current !== revision.current) {
        event.preventDefault()
        void flush()
      }
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('beforeunload', unload)
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
      void flush()
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('beforeunload', unload)
    }
  }, [flush])
  return { latest, status, error, update, flush }
}
