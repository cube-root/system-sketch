import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { Dashboard } from '@/components/Dashboard'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Brand } from '@/components/Brand'
import { createDiagram, deleteDiagram, getDiagram, listDiagrams, saveDiagram } from '@/lib/storage'
import type { Diagram, DiagramStyle, Template } from '@/types'
import { withDiagramLock } from '@/lib/workspace-lock'
import '@/app.css'
const Editor = lazy(() => import('@/components/Editor'))
function Loading({ message = 'Getting your workspace ready…' }: { message?: string }) {
  return (
    <div className="app-loading">
      <Brand />
      <LoaderCircle size={24} className="animate-spin" />
      <p>{message}</p>
    </div>
  )
}
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SystemSketch rendering error', error, info.componentStack)
  }
  render() {
    if (this.state.error)
      return (
        <div className="app-loading">
          <TriangleAlert size={34} />
          <h1>Something interrupted your workspace.</h1>
          <p>Your saved diagrams are still in this browser. Reload to try again.</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Reload workspace
          </Button>
        </div>
      )
    return this.props.children
  }
}
function Workspace() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([])
  const [active, setActive] = useState<Diagram | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState(false)
  const flushRef = useRef<(() => Promise<boolean>) | null>(null)
  const registerFlush = useCallback((flush: (() => Promise<boolean>) | null) => {
    flushRef.current = flush
  }, [])
  const refresh = useCallback(async () => {
    const records = await listDiagrams()
    setDiagrams(records)
    return records
  }, [])
  const boot = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const records = await refresh()
      const id = decodeURIComponent(window.location.hash.replace(/^#\/diagram\//, ''))
      const requested = records.find((d) => d.id === id)
      if (requested) setActive(requested)
      else if (window.location.hash.startsWith('#/diagram/')) {
        toast.error('That diagram was not found in this browser.')
        history.replaceState(null, '', location.pathname + location.search)
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [refresh])
  useEffect(() => {
    void boot()
  }, [boot])
  useEffect(() => {
    const navigate = async () => {
      if (flushRef.current && !(await flushRef.current())) {
        toast.error('Please save your changes before leaving.')
        return
      }
      const id = window.location.hash.startsWith('#/diagram/')
        ? decodeURIComponent(window.location.hash.slice(10))
        : null
      try {
        setActive(id ? ((await getDiagram(id)) ?? null) : null)
        await refresh()
      } catch {
        toast.error('Could not open the diagram. Please try again.')
      }
    }
    window.addEventListener('popstate', navigate)
    const focus = () => {
      if (!flushRef.current) void refresh().catch(() => {})
    }
    window.addEventListener('focus', focus)
    return () => {
      window.removeEventListener('popstate', navigate)
      window.removeEventListener('focus', focus)
    }
  }, [refresh])
  const open = (diagram: Diagram) => {
    void getDiagram(diagram.id)
      .then((current) => {
        if (!current) {
          toast.error('This diagram no longer exists.')
          void refresh()
          return
        }
        history.pushState(null, '', `#/diagram/${diagram.id}`)
        setActive(current)
      })
      .catch(() => toast.error('Could not open the diagram. Please try again.'))
  }
  const close = async () => {
    await refresh()
    history.pushState(null, '', location.pathname + location.search)
    setActive(null)
  }
  const create = async (name: string, style: DiagramStyle, template?: Template) => {
    if (busy) return false
    setBusy(true)
    try {
      const diagram = createDiagram(name, template?.id)
      diagram.style = style
      if (template) {
        const { buildTemplate } = await import('@/lib/scene')
        Object.assign(diagram, buildTemplate(template, style))
      }
      await saveDiagram(diagram)
      await refresh()
      open(diagram)
      return true
    } catch {
      toast.error('Could not create the diagram. Check that browser storage is available.')
      return false
    } finally {
      setBusy(false)
    }
  }
  // Metadata changes read the latest record, preserving the most recent canvas data.
  const change = async (diagram: Diagram, patch: Partial<Diagram>) => {
    try {
      await withDiagramLock(diagram.id, async () => {
        const current = await getDiagram(diagram.id)
        if (!current) throw new Error('Diagram not found.')
        await saveDiagram({ ...current, ...patch })
      })
      await refresh()
      return true
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update this diagram. Please try again.',
      )
      return false
    }
  }
  if (loading) return <Loading />
  if (loadError)
    return (
      <div className="app-loading">
        <TriangleAlert size={30} />
        <h1>Your workspace couldn’t be opened.</h1>
        <p>Check that this browser allows site storage, then try again.</p>
        <Button onClick={() => void boot()}>Try again</Button>
      </div>
    )
  return active ? (
    <Suspense fallback={<Loading message="Opening your canvas…" />}>
      <Editor key={active.id} diagram={active} onClose={close} registerFlush={registerFlush} />
    </Suspense>
  ) : (
    <Dashboard
      diagrams={diagrams}
      busy={busy}
      onOpen={open}
      onCreate={create}
      onRename={async (diagram, name) => {
        return change(diagram, { name: name.trim(), updatedAt: Date.now() })
      }}
      onStar={async (diagram) => {
        await change(diagram, { starred: !diagram.starred })
      }}
      onDuplicate={async (diagram) => {
        try {
          const current = await getDiagram(diagram.id)
          if (!current) throw new Error('missing')
          const copy = {
            ...structuredClone(current),
            id: crypto.randomUUID(),
            name: `${current.name} (copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            starred: false,
          }
          await saveDiagram(copy)
          await refresh()
          toast.success('A fresh copy, ready for a new direction.')
        } catch {
          toast.error('Could not duplicate this diagram. Please try again.')
        }
      }}
      onDelete={async (diagram) => {
        try {
          await withDiagramLock(diagram.id, () => deleteDiagram(diagram.id))
          await refresh()
          toast.success('Diagram deleted.')
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Could not delete this diagram. Please try again.',
          )
        }
      }}
    />
  )
}
export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <Workspace />
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </ErrorBoundary>
  )
}
