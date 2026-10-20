# SystemSketch

A Vite + React + TypeScript workspace for drawing system architecture. The interface uses shadcn/ui and Radix primitives, with a colorful component library and Excalidraw as the drawing engine.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. No API keys, accounts, backend, or environment variables are required. The `predev` and `prebuild` scripts prepare local brand icons and canvas fonts from installed packages.

## Included

- Dashboard with search, sorting, starring, renaming, duplication, and confirmed deletion.
- Infinite canvas with selection, bound connectors, freehand drawing, editable text, shapes, grouping, alignment, undo/redo, zoom, and pan.
- 116 searchable components across generic systems, technologies, AWS, Azure, and Google Cloud, including networking, observability, workflow, and data infrastructure. Click to add or drag into position. Some cloud services use their provider logo with a service label.
- Draw an arrow from one component to another, placing endpoints on or near the cards. Connections attach to the cards and follow when either component moves. Hold ⌘ / Ctrl to draw without attaching.
- 12 original, editable templates: scalable web application, microservices, event-driven system, data pipeline, chat, video streaming, URL shortener, e-commerce, notifications, AWS serverless API, Azure web platform, and Google Cloud analytics.
- Clean and hand-drawn diagram styles, sticky notes, and service boundaries.
- Mermaid **flowchart** import into editable shapes and bound connections. Import appends to the current diagram. Syntax errors preserve the existing canvas. Configuration directives, external embeds, and interactive links are excluded; imports are limited to 20,000 characters and 150 connections.
- IndexedDB autosave with serialized writes, save status, retry feedback, navigation flushing, and unsaved-change protection. Web Locks protect an open diagram from another editor tab in browsers supporting that API.
- Desktop and tablet editing. Phones can browse the workspace and view diagrams.
- Locally served fonts and icons, lazy-loaded editor, accessible dialogs, and reduced-motion support.

**Deferred by design:** export/download module, Mermaid export, native draw.io/Excalidraw file interoperability, accounts, cloud sync, and real-time collaboration. This is a browser-local application, not an offline-installable PWA.

Diagrams belong to the browser profile and origin where they were created. Clearing site data, using another browser, changing host/port, or using private browsing affects availability. There is no cloud backup in this version.

## Checks

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Run `npm run build` before browser tests; Playwright starts a production preview on port 4173. Tests use isolated browser contexts and never modify the normal workspace. To use an existing compatible Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path.

Unit tests cover local persistence, template integrity, component search, and Mermaid import boundaries. Browser tests cover editing, undo/redo, freehand input, reload recovery, style switching, Mermaid import, dashboard actions, tab ownership, responsive layouts, and automated accessibility checks.

## Production build and deployment

```sh
npm ci
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static HTTPS host. No server runtime is required. Diagram routes use URL hashes, so no SPA path rewrite is necessary. A `public/_headers` file supplies security headers for hosts that support that format; configure equivalent headers on other hosts. Keep the deployment origin stable to preserve access to users' local data.

The editor and Mermaid renderer are substantial libraries and are loaded on demand. Vite reports large-chunk notices for these vendor bundles; the dashboard does not load the canvas engine on its initial route. This project does not claim cross-browser certification; the checked-in browser suite runs on Chromium. Test Safari/Firefox and your target touch hardware before a public rollout.

## Project structure

- `src/components/Dashboard.tsx`: workspace and library browsing.
- `src/components/Editor.tsx`: canvas integration, component insertion, and Mermaid import.
- `src/components/ui/`: locally owned shadcn components.
- `src/data/catalog.ts`: component definitions and search.
- `src/data/templates.ts`: editable architecture blueprints.
- `src/lib/scene.ts`: component/blueprint conversion into canvas elements.
- `src/lib/storage.ts`, `src/hooks/useAutosave.ts`: IndexedDB persistence and save lifecycle.
- `src/hooks/useDiagramLock.ts`, `src/lib/workspace-lock.ts`: tab ownership safeguards.
- `tests/`: unit tests and browser checks.

## References and acknowledgments

The product direction takes inspiration from [draw.io](https://github.com/jgraph/drawio), [Excalidraw](https://github.com/excalidraw/excalidraw), [Mermaid](https://github.com/mermaid-js/mermaid), [System Design Primer](https://github.com/donnemartin/system-design-primer), and [System Design 101](https://github.com/ByteByteGoHq/system-design-101). The architecture templates are original simplified examples, not copied diagrams or production deployment specifications.

Canvas: Excalidraw and mermaid-to-excalidraw (MIT). Interface: shadcn/ui and Radix (MIT). Generic icons: Lucide (ISC). Brand icons: SVG Logos via Iconify; see `THIRD_PARTY_NOTICES.md`. Fonts: DM Sans and Manrope (OFL).
