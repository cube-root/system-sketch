import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
  CaptureUpdateAction,
  convertToExcalidrawElements,
  getSceneVersion,
  viewportCoordsToSceneCoords,
} from '@excalidraw/excalidraw'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement, FileId } from '@excalidraw/excalidraw/element/types'
import '@excalidraw/excalidraw/index.css'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  CodeXml,
  Frame,
  Grid2X2,
  Grid3X3,
  LoaderCircle,
  Maximize,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  Shapes,
  StickyNote,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Brand } from '@/components/Brand'
import { ComponentIcon } from '@/components/ComponentIcon'
import { HelpDialog } from '@/components/HelpDialog'
import { categories, componentById, searchComponents } from '@/data/catalog'
import { buildComponent, restyleElements } from '@/lib/scene'
import { mermaidExample, validateMermaid } from '@/lib/mermaid'
import { storageError } from '@/lib/storage'
import { useAutosave } from '@/hooks/useAutosave'
import { useDiagramLock } from '@/hooks/useDiagramLock'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useComponentConnections } from '@/hooks/useComponentConnections'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Category, Diagram, DiagramStyle, SavedCanvasState, SystemComponent } from '@/types'

interface Props {
  diagram: Diagram
  onClose: () => Promise<void>
  registerFlush: (flush: (() => Promise<boolean>) | null) => void
}
export default function Editor({ diagram, onClose, registerFlush }: Props) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [name, setName] = useState(diagram.name)
  const [style, setStyle] = useState(diagram.style)
  const [grid, setGrid] = useState(diagram.appState?.gridModeEnabled ?? false)
  const [category, setCategory] = useState<Category>('Essentials')
  const [query, setQuery] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [code, setCode] = useState(mermaidExample)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [count, setCount] = useState(
    diagram.elements.filter((e) => !e.isDeleted && e.type !== 'text' && e.type !== 'image').length,
  )
  const [leaving, setLeaving] = useState(false)
  const autosave = useAutosave(diagram)
  const lock = useDiagramLock(diagram.id)
  const phone = useMediaQuery('(max-width: 700px)')
  const readOnly = phone || lock !== 'owned'
  useComponentConnections(api, readOnly)
  const signature = useRef('')
  const importActive = useRef(true)
  const { update, flush } = autosave
  useEffect(() => {
    registerFlush(flush)
    return () => registerFlush(null)
  }, [flush, registerFlush])
  useEffect(() => {
    importActive.current = true
    return () => {
      importActive.current = false
    }
  }, [])
  useEffect(() => {
    document.title = `${name} · SystemSketch`
    return () => {
      document.title = 'SystemSketch — Bring your systems to life'
    }
  }, [name])
  useEffect(() => {
    if (api && !diagram.appState) {
      const frame = requestAnimationFrame(() =>
        api.scrollToContent(undefined, { fitToContent: true, viewportZoomFactor: 0.75 }),
      )
      return () => cancelAnimationFrame(frame)
    }
  }, [api, diagram.appState])
  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], state: AppState, files: BinaryFiles) => {
      if (readOnly) return
      setGrid(state.gridModeEnabled)
      const appState: SavedCanvasState = {
        viewBackgroundColor: state.viewBackgroundColor,
        scrollX: state.scrollX,
        scrollY: state.scrollY,
        zoom: state.zoom,
        gridSize: state.gridSize,
        gridModeEnabled: state.gridModeEnabled,
        currentItemRoughness: state.currentItemRoughness,
        currentItemFontFamily: state.currentItemFontFamily,
        currentItemStrokeColor: state.currentItemStrokeColor,
        currentItemBackgroundColor: state.currentItemBackgroundColor,
        currentItemFillStyle: state.currentItemFillStyle,
      }
      const nextSignature = `${getSceneVersion(elements)}:${JSON.stringify(appState)}:${Object.keys(files).join(',')}`
      if (nextSignature === signature.current) return
      signature.current = nextSignature
      const liveElements = elements.filter((e) => !e.isDeleted)
      const usedFiles = new Set(liveElements.filter((e) => e.type === 'image').map((e) => e.fileId))
      const currentFiles = Object.fromEntries(
        Object.entries(files).filter(([id]) => usedFiles.has(id as FileId)),
      )
      update({ elements: liveElements, appState, files: currentFiles })
      setCount(liveElements.filter((e) => e.type !== 'text' && e.type !== 'image').length)
    },
    [readOnly, update],
  )
  const leave = async () => {
    setLeaving(true)
    if (await flush()) await onClose()
    else toast.error('Your latest changes are not saved yet. Please retry before leaving.')
    setLeaving(false)
  }
  const center = () => {
    if (!api) return { x: 0, y: 0 }
    const state = api.getAppState()
    return viewportCoordsToSceneCoords(
      { clientX: state.offsetLeft + state.width / 2, clientY: state.offsetTop + state.height / 2 },
      state,
    )
  }
  const addElements = (elements: readonly ExcalidrawElement[], files?: BinaryFiles) => {
    if (!api || readOnly) return
    if (files) api.addFiles(Object.values(files))
    api.updateScene({
      elements: [...api.getSceneElements(), ...elements],
      appState: { selectedElementIds: Object.fromEntries(elements.map((e) => [e.id, true])) },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    })
    api.setActiveTool({ type: 'selection' })
  }
  const addComponent = (component: SystemComponent, position?: { x: number; y: number }) => {
    if (!api || readOnly) return
    const at = position ?? center()
    if (!position) {
      const shapes = api.getSceneElements().filter((e) => e.customData?.componentId)
      const offsets = [
        [0, 0],
        [240, 0],
        [-240, 0],
        [0, 155],
        [0, -155],
        [240, 155],
        [-240, 155],
        [240, -155],
        [-240, -155],
        [480, 0],
        [-480, 0],
      ]
      const available = offsets.find(
        ([dx, dy]) =>
          !shapes.some(
            (e) =>
              at.x + dx - 95 < e.x + e.width + 15 &&
              at.x + dx + 95 > e.x - 15 &&
              at.y + dy - 56 < e.y + e.height + 15 &&
              at.y + dy + 56 > e.y - 15,
          ),
      )
      if (available) {
        at.x += available[0]
        at.y += available[1]
      }
    }
    const result = buildComponent(component, at.x - 95, at.y - 56, style)
    addElements(result.elements, result.files)
  }
  const addNote = (boundary = false) => {
    const at = center()
    const elements = convertToExcalidrawElements([
      {
        type: 'rectangle',
        x: at.x - (boundary ? 240 : 100),
        y: at.y - (boundary ? 150 : 80),
        width: boundary ? 480 : 200,
        height: boundary ? 300 : 160,
        fillStyle: 'solid',
        backgroundColor: boundary ? 'transparent' : '#fff3bd',
        strokeColor: boundary ? '#9aa0ae' : '#ead483',
        strokeStyle: boundary ? 'dashed' : 'solid',
        strokeWidth: 1,
        roughness: style === 'sketch' ? 1 : 0,
        roundness: { type: 3 },
        label: {
          text: boundary ? 'Service boundary' : 'Add a note…',
          fontSize: boundary ? 16 : 20,
          fontFamily: style === 'sketch' ? 5 : 2,
          strokeColor: boundary ? '#747b8b' : '#786a38',
          verticalAlign: boundary ? 'top' : 'middle',
          textAlign: boundary ? 'left' : 'center',
        },
      },
    ])
    addElements(elements)
  }
  const changeStyle = (next: DiagramStyle) => {
    if (!api || readOnly) return
    setStyle(next)
    update({ style: next })
    api.updateScene({
      elements: restyleElements(api.getSceneElements(), next),
      appState: {
        currentItemRoughness: next === 'sketch' ? 1 : 0,
        currentItemFontFamily: next === 'sketch' ? 5 : 2,
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    })
  }
  const importMermaid = async () => {
    if (!api || readOnly) return
    setImportError('')
    setImporting(true)
    try {
      const validated = validateMermaid(code)
      const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw')
      const parsed = await parseMermaidToExcalidraw(validated, {
        maxEdges: 150,
        maxTextSize: 20_000,
        themeVariables: { fontSize: '18px' },
      })
      if (!importActive.current) return
      if (!parsed.elements.length || parsed.elements.some((e) => e.type === 'image'))
        throw new Error(
          'This flowchart could not be converted into editable shapes. Try simpler nodes and connections.',
        )
      if (parsed.elements.length > 800)
        throw new Error(
          'This diagram is too large. Import a smaller flowchart with up to 150 connections.',
        )
      const converted = restyleElements(convertToExcalidrawElements(parsed.elements), style)
      const existing = api?.getSceneElements() ?? []
      const offset = existing.length ? Math.max(...existing.map((e) => e.x + e.width)) + 150 : 0
      const imported = converted.map((e) => ({ ...e, x: e.x + offset }))
      addElements(imported, parsed.files)
      api?.scrollToContent(imported, {
        fitToContent: true,
        viewportZoomFactor: 0.75,
        animate: true,
      })
      setImportOpen(false)
      toast.success('Flowchart added. Every node and connection is editable.')
    } catch (error) {
      if (importActive.current)
        setImportError(
          error instanceof Error
            ? error.message.slice(0, 350)
            : 'Could not read this flowchart. Check the Mermaid syntax and try again.',
        )
    } finally {
      if (importActive.current) setImporting(false)
    }
  }
  return (
    <div className="editor-shell">
      <header className="editor-header">
        <div className="editor-title-group">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to dashboard"
                onClick={() => void leave()}
                disabled={leaving}
              >
                {leaving ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <ArrowLeft size={18} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to your workspace</TooltipContent>
          </Tooltip>
          <span className="editor-brand">
            <Brand compact />
          </span>
          <span className="editor-title-divider" />
          <Input
            className="diagram-name-input"
            aria-label="Diagram name"
            value={name}
            disabled={readOnly}
            maxLength={100}
            onChange={(e) => {
              setName(e.target.value)
              if (e.target.value.trim()) update({ name: e.target.value.trim() })
            }}
            onBlur={() => {
              if (!name.trim()) setName(autosave.latest.current.name)
            }}
          />
        </div>
        <div className="editor-header-actions">
          <span
            className={cn('save-indicator', autosave.status === 'error' && 'error')}
            role="status"
            aria-label={
              readOnly
                ? 'View mode'
                : autosave.status === 'saving'
                  ? 'Saving changes'
                  : autosave.status === 'error'
                    ? 'Changes not saved'
                    : 'All changes saved'
            }
          >
            {autosave.status === 'saving' ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : autosave.status === 'error' ? (
              <CircleAlert size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            <span>
              {readOnly
                ? 'View mode'
                : autosave.status === 'saving'
                  ? 'Saving…'
                  : autosave.status === 'error'
                    ? 'Not saved'
                    : 'All changes saved'}
            </span>
          </span>
          <Button
            variant="outline"
            className="mermaid-trigger"
            disabled={readOnly}
            onClick={() => setImportOpen(true)}
          >
            <CodeXml size={16} /> Import Mermaid
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editor help"
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp size={19} />
          </Button>
        </div>
      </header>
      {autosave.status === 'error' && (
        <div className="save-error" role="alert">
          <CircleAlert size={17} />
          <span>{storageError(autosave.error)}</span>
          <Button size="sm" variant="outline" onClick={() => void flush()}>
            Retry saving
          </Button>
        </div>
      )}
      {lock === 'locked' && (
        <div className="read-only-banner">
          <CircleAlert size={15} /> This diagram is open in another tab. Close that tab and reopen
          this diagram to edit.
        </div>
      )}
      {phone && (
        <div className="read-only-banner">
          <Shapes size={15} /> You’re in view mode. Open on a tablet or desktop to keep drawing.
        </div>
      )}
      <div className="editor-subbar">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="library-toggle"
            disabled={phone}
            onClick={() => setLibraryOpen(!libraryOpen)}
          >
            {libraryOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span>Components</span>
          </Button>
          <span className="editor-subbar-divider" />
          <span className="canvas-item-count">
            {count} {count === 1 ? 'element' : 'elements'}
          </span>
        </div>
        <div>
          <span className="style-label">Drawing style</span>
          <div className="style-toggle" role="group" aria-label="Diagram style">
            <button
              disabled={readOnly}
              onClick={() => changeStyle('clean')}
              className={cn(style === 'clean' && 'active')}
              aria-pressed={style === 'clean'}
            >
              <Grid2X2 size={13} />
              Clean
            </button>
            <button
              disabled={readOnly}
              onClick={() => changeStyle('sketch')}
              className={cn(style === 'sketch' && 'active')}
              aria-pressed={style === 'sketch'}
            >
              <Pencil size={13} />
              Hand-drawn
            </button>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Snap to grid"
                aria-pressed={grid}
                disabled={readOnly}
                onClick={() =>
                  api?.updateScene({
                    appState: { gridModeEnabled: !grid },
                    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
                  })
                }
              >
                <Grid3X3 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Snap to grid</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fit diagram to screen"
                onClick={() =>
                  api?.scrollToContent(undefined, {
                    fitToContent: true,
                    viewportZoomFactor: 0.75,
                    animate: true,
                  })
                }
              >
                <Maximize size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to screen · Shift + 1</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <main className="editor-body" aria-label="Drawing workspace">
        {libraryOpen && !phone && (
          <aside className="component-sidebar" aria-label="Component library">
            <div className="component-sidebar-heading">
              <h2>
                Building blocks <span>✦</span>
              </h2>
              <p>A little structure for your big ideas.</p>
            </div>
            <div className="library-search">
              <Search size={15} />
              <Input
                aria-label="Find a component"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a component…"
              />
              {query && (
                <button aria-label="Clear component search" onClick={() => setQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="component-category-tabs">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c)
                    setQuery('')
                  }}
                  className={cn(category === c && !query && 'active')}
                >
                  {c === 'Google Cloud' ? 'GCP' : c}
                </button>
              ))}
            </div>
            <div className="component-results">
              <div className="component-list-caption">
                {query ? 'SEARCH RESULTS' : category.toUpperCase()}
                <span>{searchComponents(query, query ? undefined : category).length}</span>
              </div>
              <div className="component-tiles">
                {searchComponents(query, query ? undefined : category).map((c) => (
                  <button
                    key={c.id}
                    className="component-tile"
                    disabled={readOnly || !api}
                    draggable={!readOnly}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/systemsketch-component', c.id)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onClick={() => addComponent(c)}
                    title={`${c.name} — ${c.description}. Click or drag to add.`}
                    aria-label={`Add ${c.name}`}
                  >
                    <span className="component-tile-icon" style={{ background: c.fill }}>
                      <ComponentIcon component={c} size={23} />
                    </span>
                    <span>{c.name}</span>
                    {query && <small>{c.category}</small>}
                  </button>
                ))}
              </div>
              {!searchComponents(query, query ? undefined : category).length && (
                <div className="component-empty">
                  <Search size={22} />
                  <strong>No matches yet</strong>
                  <p>Try “database”, “Redis”, or “AWS”.</p>
                </div>
              )}
            </div>
            <div className="component-sidebar-footer">
              <div className="quick-elements">
                <button disabled={readOnly} onClick={() => addNote()}>
                  <StickyNote size={16} />
                  <span>Sticky note</span>
                </button>
                <button disabled={readOnly} onClick={() => addNote(true)}>
                  <Frame size={16} />
                  <span>Boundary</span>
                </button>
              </div>
              <p>
                <span>↗</span> Click to add. Drag to place.
              </p>
            </div>
          </aside>
        )}
        <div
          className="canvas-host"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/systemsketch-component')) {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }
          }}
          onDropCapture={(e) => {
            const id = e.dataTransfer.getData('application/systemsketch-component')
            if (id && api) {
              e.preventDefault()
              e.stopPropagation()
              if (componentById[id])
                addComponent(
                  componentById[id],
                  viewportCoordsToSceneCoords(
                    { clientX: e.clientX, clientY: e.clientY },
                    api.getAppState(),
                  ),
                )
            }
          }}
        >
          <Excalidraw
            excalidrawAPI={setApi}
            initialData={{
              elements: diagram.elements,
              files: diagram.files,
              appState: {
                ...diagram.appState,
                viewBackgroundColor: diagram.appState?.viewBackgroundColor ?? '#ffffff',
                currentItemRoughness: diagram.style === 'sketch' ? 1 : 0,
                currentItemFontFamily: diagram.style === 'sketch' ? 5 : 2,
                currentItemStrokeColor: '#535965',
                currentItemBackgroundColor: 'transparent',
                currentItemFillStyle: 'solid',
                gridSize: 20,
              },
              scrollToContent: !diagram.appState,
            }}
            onChange={onChange}
            handleKeyboardGlobally={!importOpen && !helpOpen}
            theme="light"
            viewModeEnabled={readOnly}
            autoFocus={!readOnly}
            name={diagram.name}
            validateEmbeddable={false}
            UIOptions={{
              canvasActions: {
                saveToActiveFile: false,
                loadScene: false,
                export: false,
                saveAsImage: false,
                clearCanvas: false,
                toggleTheme: false,
              },
              tools: { image: true },
            }}
          >
            <MainMenu>
              <MainMenu.Item onSelect={() => void leave()} icon={<ArrowLeft size={16} />}>
                Back to workspace
              </MainMenu.Item>
              <MainMenu.Item onSelect={() => setHelpOpen(true)} icon={<CircleHelp size={16} />}>
                Help & shortcuts
              </MainMenu.Item>
              {!readOnly && <MainMenu.DefaultItems.ChangeCanvasBackground />}
            </MainMenu>
            <WelcomeScreen>
              <WelcomeScreen.Center>
                <WelcomeScreen.Center.Logo>
                  <span className="canvas-welcome-icon">
                    <Shapes size={34} />
                  </span>
                </WelcomeScreen.Center.Logo>
                <WelcomeScreen.Center.Heading>
                  Make the first connection.
                </WelcomeScreen.Center.Heading>
                <div className="canvas-welcome-copy">
                  Add a building block from the left.
                  <br />
                  Or grab a pen and see where your idea takes you.
                </div>
                {!readOnly && (
                  <WelcomeScreen.Center.Menu>
                    <WelcomeScreen.Center.MenuItem
                      onSelect={() => setImportOpen(true)}
                      icon={<CodeXml size={19} />}
                    >
                      Start with Mermaid code
                    </WelcomeScreen.Center.MenuItem>
                  </WelcomeScreen.Center.Menu>
                )}
              </WelcomeScreen.Center>
            </WelcomeScreen>
          </Excalidraw>
        </div>
      </main>
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!importing) {
            setImportOpen(open)
            setImportError('')
          }
        }}
      >
        <DialogContent className="mermaid-dialog sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>A few lines. A whole system.</DialogTitle>
            <DialogDescription>
              Paste a Mermaid flowchart and turn it into editable nodes and connections. It will be
              added beside your current drawing.
            </DialogDescription>
          </DialogHeader>
          <label className="form-label" htmlFor="mermaid-source">
            Mermaid flowchart
          </label>
          <Textarea
            id="mermaid-source"
            spellCheck={false}
            className="mermaid-source"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setImportError('')
            }}
            maxLength={20_001}
            disabled={importing}
          />
          {importError && (
            <div className="import-error" role="alert">
              <CircleAlert size={17} />
              <pre>{importError}</pre>
            </div>
          )}
          <div className="mermaid-footer">
            <span>Flowcharts only · up to 150 connections</span>
            <Button
              onClick={() => void importMermaid()}
              disabled={readOnly || importing || !code.trim()}
            >
              {importing ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Creating your diagram…
                </>
              ) : (
                <>
                  Add to canvas <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
