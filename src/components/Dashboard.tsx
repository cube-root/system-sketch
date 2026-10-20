import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  FolderOpen,
  Grid2X2,
  HardDrive,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shapes,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Brand } from '@/components/Brand'
import { BlueprintPreview, ScenePreview } from '@/components/BlueprintPreview'
import { ComponentIcon } from '@/components/ComponentIcon'
import { HelpDialog } from '@/components/HelpDialog'
import { categories, components, searchComponents } from '@/data/catalog'
import { templates } from '@/data/templates'
import { cn, relativeTime } from '@/lib/utils'
import type { Category, Diagram, DiagramStyle, Template } from '@/types'

export type DashboardPage = 'overview' | 'diagrams' | 'starred' | 'templates' | 'components'
interface Props {
  diagrams: Diagram[]
  busy: boolean
  onOpen: (diagram: Diagram) => void
  onCreate: (name: string, style: DiagramStyle, template?: Template) => Promise<boolean>
  onRename: (diagram: Diagram, name: string) => Promise<boolean>
  onStar: (diagram: Diagram) => Promise<void>
  onDuplicate: (diagram: Diagram) => Promise<void>
  onDelete: (diagram: Diagram) => Promise<void>
}
const pageTitles: Record<DashboardPage, string> = {
  overview: 'Overview',
  diagrams: 'My diagrams',
  starred: 'Starred',
  templates: 'Templates',
  components: 'Component library',
}
export function Dashboard({
  diagrams,
  busy,
  onOpen,
  onCreate,
  onRename,
  onStar,
  onDuplicate,
  onDelete,
}: Props) {
  const [page, setPage] = useState<DashboardPage>('overview')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [newOpen, setNewOpen] = useState(false)
  const [name, setName] = useState('Untitled diagram')
  const [style, setStyle] = useState<DiagramStyle>('clean')
  const [template, setTemplate] = useState<Template | null>(null)
  const [renaming, setRenaming] = useState<Diagram | null>(null)
  const [deleting, setDeleting] = useState<Diagram | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [templateCategory, setTemplateCategory] = useState('All templates')
  const [componentCategory, setComponentCategory] = useState<Category | undefined>()
  const searchRef = useRef<HTMLInputElement>(null)
  const navigate = (next: DashboardPage) => {
    setPage(next)
    setQuery('')
    setMobileNav(false)
  }
  const newDiagram = () => {
    setName('Untitled diagram')
    setStyle('clean')
    setNewOpen(true)
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  const filteredDiagrams = diagrams
    .filter(
      (d) =>
        (page !== 'starred' || d.starred) &&
        `${d.name} ${d.description}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt))
  const filteredTemplates = templates.filter(
    (t) =>
      (templateCategory === 'All templates' || t.category === templateCategory) &&
      `${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase()),
  )
  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'diagrams', icon: FolderOpen, label: 'My diagrams', count: diagrams.length },
    {
      id: 'starred',
      icon: Star,
      label: 'Starred',
      count: diagrams.filter((d) => d.starred).length,
    },
  ] as const
  return (
    <div className="workspace-shell">
      {mobileNav && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={cn('workspace-sidebar', mobileNav && 'is-open')}
        aria-label="Workspace navigation"
      >
        <button
          className="brand-button"
          onClick={() => navigate('overview')}
          aria-label="SystemSketch overview"
        >
          <Brand />
        </button>
        <div className="workspace-switcher">
          <span className="workspace-avatar">
            <Shapes size={19} />
          </span>
          <div>
            <strong>Personal workspace</strong>
            <span>Your ideas, all in one place</span>
          </div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {navItems.map(({ id, icon: Icon, label, ...item }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={cn('nav-item', page === id && 'active')}
              aria-current={page === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {'count' in item && item.count > 0 && <span className="nav-count">{item.count}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-caption explore-caption">CREATE & EXPLORE</div>
        <nav>
          <button
            className={cn('nav-item', page === 'templates' && 'active')}
            onClick={() => navigate('templates')}
            aria-current={page === 'templates' ? 'page' : undefined}
          >
            <LayoutTemplate size={18} />
            <span>Templates</span>
            <span className="new-badge">12</span>
          </button>
          <button
            className={cn('nav-item', page === 'components' && 'active')}
            onClick={() => navigate('components')}
            aria-current={page === 'components' ? 'page' : undefined}
          >
            <Shapes size={18} />
            <span>Components</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="little-tip">
            <span className="tip-icon">
              <Sparkles size={19} />
            </span>
            <strong>Less setup. More ideas.</strong>
            <p>Start with a template and make it your own.</p>
            <button onClick={() => navigate('templates')}>
              Find your starting point <ArrowRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={18} />
            <span>Help & shortcuts</span>
          </button>
          <div className="local-workspace">
            <span className="local-indicator" />
            <div>
              <strong>Stored on this device</strong>
              <span>No account needed. Just create.</span>
            </div>
            <HardDrive size={16} />
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{pageTitles[page]}</strong>
          </div>
          <div className="topbar-right">
            <span className="private-label">
              <span /> Personal & private
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="Open help"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp size={19} />
            </button>
            <span className="user-avatar" role="img" aria-label="Local workspace">
              <Shapes size={19} />
            </span>
          </div>
        </header>
        <main className="dashboard-content" id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</div>
              <h1>{page === 'overview' ? 'Big ideas. Clearly connected.' : pageTitles[page]}</h1>
              <p>
                {page === 'overview'
                  ? 'Your space to sketch, connect, and bring systems to life.'
                  : page === 'templates'
                    ? 'Skip the blank canvas. Find a starting point, then make it yours.'
                    : page === 'components'
                      ? 'The building blocks of your next great system.'
                      : page === 'starred'
                        ? 'Keep your favorite ideas close.'
                        : 'Every architecture starts with an idea. Here are yours.'}
              </p>
            </div>
            <Button onClick={newDiagram} disabled={busy} className="create-button">
              <Plus size={17} /> New diagram
            </Button>
          </div>
          {page === 'overview' && (
            <section className="welcome-banner" aria-label="Get started">
              <div className="welcome-copy">
                <span className="welcome-pill">
                  <Sparkles size={13} /> A head start for your next idea
                </span>
                <h2>
                  Great systems start
                  <br />
                  with a simple sketch<span>.</span>
                </h2>
                <p>
                  Pick a few components. Connect the dots.
                  <br />
                  See the bigger picture.
                </p>
                <Button
                  variant="outline"
                  className="hero-button"
                  onClick={() => navigate('templates')}
                >
                  Explore templates <ArrowRight size={16} />
                </Button>
              </div>
              <HeroIllustration />
            </section>
          )}
          {page === 'overview' && (
            <section className="starter-section">
              <div className="section-heading">
                <div>
                  <h2>
                    Start with a little inspiration <span className="tiny-sparkle">✦</span>
                  </h2>
                  <p>A few foundations to build something great.</p>
                </div>
                <button className="text-link" onClick={() => navigate('templates')}>
                  View all templates <ArrowRight size={15} />
                </button>
              </div>
              <div className="starter-grid">
                {templates.slice(0, 4).map((t) => (
                  <button key={t.id} className="starter-card" onClick={() => setTemplate(t)}>
                    <div className="starter-art" style={{ backgroundColor: t.color }}>
                      <BlueprintPreview template={t} />
                      <span className="template-open">
                        <ArrowRight size={16} />
                      </span>
                    </div>
                    <div className="starter-label">
                      <span>{t.name}</span>
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
          {(page === 'overview' || page === 'diagrams' || page === 'starred') && (
            <section className="diagrams-section">
              <div className="section-heading diagrams-heading">
                <div>
                  <h2>
                    {page === 'overview' ? 'Your diagrams' : pageTitles[page]}{' '}
                    <span className="count-badge">{filteredDiagrams.length}</span>
                  </h2>
                  {page === 'overview' && <p>Pick up where your imagination left off.</p>}
                </div>
                <div className="diagram-controls">
                  <div className="search-field">
                    <Search size={16} />
                    <Input
                      ref={searchRef}
                      aria-label="Search diagrams"
                      placeholder="Search diagrams..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd>⌘ K</kbd>
                  </div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Sort diagrams">
                        <ArrowDownWideNarrow size={17} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setSort('recent')}>
                        <Clock3 />
                        Recently edited {sort === 'recent' && <Check className="ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setSort('name')}>
                        Name A–Z {sort === 'name' && <Check className="ml-auto" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {filteredDiagrams.length > 0 ? (
                <div className="diagram-grid">
                  {filteredDiagrams.map((diagram) => (
                    <article key={diagram.id} className="diagram-card">
                      <button
                        className="diagram-preview-button"
                        onClick={() => onOpen(diagram)}
                        aria-label={`Open ${diagram.name}`}
                      >
                        <ScenePreview diagram={diagram} />
                        <span className="diagram-open-label">
                          Open diagram <ArrowRight size={14} />
                        </span>
                      </button>
                      <div className="diagram-card-info">
                        <div className="diagram-card-title">
                          <button onClick={() => onOpen(diagram)}>{diagram.name}</button>
                          <button
                            className={cn('star-button', diagram.starred && 'starred')}
                            aria-label={`${diagram.starred ? 'Unstar' : 'Star'} ${diagram.name}`}
                            onClick={() => void onStar(diagram)}
                          >
                            <Star size={16} fill={diagram.starred ? 'currentColor' : 'none'} />
                          </button>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="icon-button small"
                                aria-label={`Actions for ${diagram.name}`}
                              >
                                <MoreHorizontal size={19} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => {
                                  setName(diagram.name)
                                  setRenaming(diagram)
                                }}
                              >
                                <Pencil />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void onDuplicate(diagram)}>
                                <Copy />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleting(diagram)}
                              >
                                <Trash2 />
                                Delete diagram
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="diagram-meta">
                          <span>
                            <span className={cn('style-dot', diagram.style)} />
                            {diagram.style === 'clean' ? 'Clean' : 'Hand-drawn'}
                          </span>
                          <span>Edited {relativeTime(diagram.updatedAt)}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                  <button className="new-diagram-card" onClick={newDiagram}>
                    <span>
                      <Plus size={24} />
                    </span>
                    <strong>Something new?</strong>
                    <p>Make room for your next idea</p>
                  </button>
                </div>
              ) : (
                <div className="empty-diagrams">
                  <span className="empty-icon">
                    {page === 'starred' ? (
                      <Star size={24} />
                    ) : query ? (
                      <Search size={24} />
                    ) : (
                      <Pencil size={24} />
                    )}
                  </span>
                  <div>
                    <h3>
                      {query
                        ? 'No diagrams found'
                        : page === 'starred'
                          ? 'Your favorites will feel right at home'
                          : 'Your first great idea belongs here'}
                    </h3>
                    <p>
                      {query
                        ? 'Try a different name or clear your search.'
                        : page === 'starred'
                          ? 'Star a diagram to find it quickly next time.'
                          : 'Create a fresh canvas or start with a template above.'}
                    </p>
                  </div>
                  {query ? (
                    <Button variant="outline" onClick={() => setQuery('')}>
                      Clear search
                    </Button>
                  ) : page === 'starred' ? (
                    <Button variant="outline" onClick={() => navigate('diagrams')}>
                      Browse diagrams
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={newDiagram}>
                      <Plus size={16} /> Create your first diagram
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}
          {page === 'templates' && (
            <>
              <div className="gallery-toolbar">
                <div className="filter-tabs">
                  {['All templates', 'Foundations', 'Applications', 'Cloud & data'].map((c) => (
                    <button
                      key={c}
                      className={cn(templateCategory === c && 'selected')}
                      onClick={() => setTemplateCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="search-field">
                  <Search size={16} />
                  <Input
                    ref={searchRef}
                    aria-label="Search templates"
                    placeholder="Find a template..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="template-gallery">
                {filteredTemplates.map((t) => (
                  <button key={t.id} className="gallery-card" onClick={() => setTemplate(t)}>
                    <div className="gallery-art" style={{ background: t.color }}>
                      <BlueprintPreview template={t} />
                    </div>
                    <div className="gallery-card-copy">
                      <Badge variant="secondary">{t.category}</Badge>
                      <h3>{t.name}</h3>
                      <p>{t.description}</p>
                      <span>
                        {t.nodes.length} components <ArrowRight size={16} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {!filteredTemplates.length && (
                <div className="empty-results">No templates match. Try a different search.</div>
              )}
              <p className="template-footnote">
                <BookOpen size={15} /> Thoughtful starting points for architecture discussions.
                Adapt each system to your requirements.
              </p>
            </>
          )}
          {page === 'components' && (
            <>
              <div className="gallery-toolbar">
                <div className="filter-tabs">
                  {[undefined, ...categories].map((c) => (
                    <button
                      key={c ?? 'all'}
                      className={cn(componentCategory === c && 'selected')}
                      onClick={() => setComponentCategory(c)}
                    >
                      {c ?? 'All components'}
                    </button>
                  ))}
                </div>
                <div className="search-field">
                  <Search size={16} />
                  <Input
                    ref={searchRef}
                    aria-label="Search components"
                    placeholder="Redis, database, AWS..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="component-gallery">
                {searchComponents(query, componentCategory).map((c) => (
                  <article key={c.id} className="component-gallery-card">
                    <span className="catalog-icon" style={{ background: c.fill }}>
                      <ComponentIcon component={c} size={28} />
                    </span>
                    <div>
                      <span className="component-provider">{c.category}</span>
                      <h3>{c.name}</h3>
                      <p>{c.description}</p>
                    </div>
                  </article>
                ))}
              </div>
              {!searchComponents(query, componentCategory).length && (
                <div className="empty-results">No components match. Try a broader search.</div>
              )}
              <div className="library-footer">
                <Shapes size={19} />
                <span>
                  All {components.length} components are ready to use in the editor. Click to add,
                  or drag one onto your canvas.
                </span>
                <Button variant="outline" onClick={newDiagram}>
                  Start drawing <ArrowRight size={15} />
                </Button>
              </div>
            </>
          )}
          <footer className="dashboard-footer">
            <span>
              <span className="footer-flower">✳</span> A little structure. A lot of possibility.
            </span>
            <span>Made for the way you think.</span>
          </footer>
        </main>
      </div>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>A fresh canvas, a new possibility.</DialogTitle>
            <DialogDescription>
              Give your diagram a name. You can change it anytime.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (await onCreate(name, style)) setNewOpen(false)
            }}
          >
            <label className="form-label" htmlFor="new-name">
              Diagram name
            </label>
            <Input
              id="new-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            <label className="form-label mt-5">Drawing style</label>
            <div className="style-options">
              <button
                type="button"
                aria-pressed={style === 'clean'}
                className={cn(style === 'clean' && 'selected')}
                onClick={() => setStyle('clean')}
              >
                <Grid2X2 size={22} />
                <strong>Clean & precise</strong>
                <span>Keep things crisp</span>
              </button>
              <button
                type="button"
                aria-pressed={style === 'sketch'}
                className={cn(style === 'sketch' && 'selected')}
                onClick={() => setStyle('sketch')}
              >
                <Pencil size={22} />
                <strong>Hand-drawn</strong>
                <span>A little room to play</span>
              </button>
            </div>
            <Button className="w-full mt-6" disabled={busy || !name.trim()} type="submit">
              {busy ? 'Creating…' : 'Create diagram'}
              <ArrowRight size={16} />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!template} onOpenChange={(open) => !open && setTemplate(null)}>
        <DialogContent className="sm:max-w-2xl">
          {template && (
            <>
              <DialogHeader>
                <DialogTitle>{template.name}</DialogTitle>
                <DialogDescription>{template.description}</DialogDescription>
              </DialogHeader>
              <div className="template-detail-art" style={{ background: template.color }}>
                <BlueprintPreview template={template} large />
              </div>
              <div className="template-detail-footer">
                <span>
                  {template.nodes.length} editable components · {template.edges.length} connections
                </span>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    if (await onCreate(template.name, 'clean', template)) setTemplate(null)
                  }}
                >
                  {busy ? 'Creating…' : 'Use this template'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename diagram</DialogTitle>
            <DialogDescription>A name that makes it easy to find.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (renaming) {
                if (await onRename(renaming, name)) setRenaming(null)
              }
            }}
          >
            <Input
              aria-label="Diagram name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <Button className="mt-4 w-full" disabled={!name.trim()} type="submit">
              Save name
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the diagram from this browser. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep diagram</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleting) void onDelete(deleting)
              }}
            >
              Delete diagram
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
function HeroIllustration() {
  return (
    <div className="hero-illustration" aria-hidden="true">
      <svg viewBox="0 0 560 245">
        <defs>
          <marker
            id="hero-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
          >
            <path d="M0,0 L5,2.5 L0,5" fill="none" stroke="#a5a5a1" />
          </marker>
        </defs>
        <g fill="none" stroke="#adaeaa" strokeWidth="1.5" markerEnd="url(#hero-arrow)">
          <path d="M132 126 H216" />
          <path d="M316 126 H356 Q366 126 366 116 V64 Q366 54 376 54 H402" />
          <path d="M316 126 H356 Q366 126 366 136 V187 Q366 197 376 197 H402" />
        </g>
        <text x="161" y="115" fontSize="10" fill="#9a9c94">
          request
        </text>
        <text x="372" y="115" fontSize="10" fill="#9a9c94">
          connect
        </text>
        <g transform="translate(34 78) rotate(-5 50 45)">
          <rect width="100" height="93" rx="14" fill="#fff" stroke="#d8deee" />
          <rect
            x="34"
            y="18"
            width="32"
            height="25"
            rx="4"
            fill="#edf1fc"
            stroke="#7e97c8"
            strokeWidth="1.6"
          />
          <path d="M50 43 v7 m-10 0 h20" stroke="#7e97c8" strokeWidth="1.6" />
          <text x="50" y="72" textAnchor="middle" fontSize="12" fill="#627391">
            Web client
          </text>
        </g>
        <g transform="translate(215 78) rotate(3 50 45)">
          <rect width="103" height="94" rx="14" fill="#e5f3e8" stroke="#bdd8c3" />
          <path
            d="M44 23 l-9 10 9 10 m16-20 9 10-9 10 m-5-24-6 29"
            fill="none"
            stroke="#679776"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <text x="51" y="73" textAnchor="middle" fontSize="12" fill="#52745b">
            API service
          </text>
        </g>
        <g transform="translate(405 10) rotate(5 50 45)">
          <rect width="105" height="90" rx="14" fill="#fff2ca" stroke="#e5d6a4" />
          <path
            d="M55 17 l-15 20 h12 l-4 16 16-23 H52 Z"
            fill="none"
            stroke="#b39b55"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <text x="52" y="72" textAnchor="middle" fontSize="12" fill="#8c7944">
            Cache
          </text>
        </g>
        <g transform="translate(407 153) rotate(-4 50 40)">
          <rect width="105" height="90" rx="14" fill="#f0eafb" stroke="#d4c9e9" />
          <path
            d="M36 26 v24 c0 10 32 10 32 0 V26 m-32 12 c0 10 32 10 32 0"
            fill="none"
            stroke="#9a82b9"
            strokeWidth="1.7"
          />
          <ellipse cx="52" cy="26" rx="16" ry="6" fill="none" stroke="#9a82b9" strokeWidth="1.7" />
          <text x="52" y="75" textAnchor="middle" fontSize="12" fill="#87719d">
            Database
          </text>
        </g>
        <g fill="#cfab82">
          <path d="M180 36 l3 7 7 3-7 3-3 7-3-7-7-3 7-3 Z" />
          <circle cx="540" cy="136" r="3" />
          <circle cx="150" cy="215" r="2" />
        </g>
        <path
          d="M235 210 q26 12 53-3"
          stroke="#c6b9a6"
          fill="none"
          strokeWidth="1.4"
          strokeDasharray="3 4"
        />
        <text
          x="198"
          y="230"
          fontSize="12"
          fill="#b09a80"
          fontFamily="cursive"
          transform="rotate(-5 198 230)"
        >
          a little idea, connected.
        </text>
      </svg>
      <span className="hero-cursor">
        <svg width="17" height="21" viewBox="0 0 17 21">
          <path
            d="M2 1 L2 17 L7 13 L11 20 L14 18 L10 11 L16 10 Z"
            fill="#e67650"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>
        <span>You, making things click</span>
      </span>
    </div>
  )
}
