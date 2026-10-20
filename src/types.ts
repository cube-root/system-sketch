import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
export type DiagramStyle = 'clean' | 'sketch'
export type SavedCanvasState = Pick<
  AppState,
  | 'viewBackgroundColor'
  | 'scrollX'
  | 'scrollY'
  | 'zoom'
  | 'gridSize'
  | 'gridModeEnabled'
  | 'currentItemRoughness'
  | 'currentItemFontFamily'
  | 'currentItemStrokeColor'
  | 'currentItemBackgroundColor'
  | 'currentItemFillStyle'
>
export interface Diagram {
  id: string
  schemaVersion: 1
  name: string
  description: string
  createdAt: number
  updatedAt: number
  starred: boolean
  style: DiagramStyle
  templateId?: string
  elements: readonly ExcalidrawElement[]
  files: BinaryFiles
  appState?: SavedCanvasState
}
export type Category = 'Essentials' | 'Technologies' | 'AWS' | 'Azure' | 'Google Cloud'
export interface SystemComponent {
  id: string
  name: string
  category: Category
  description: string
  icon: string
  color: string
  fill: string
  brand?: string
  keywords?: string
}
export interface BlueprintNode {
  id: string
  component: string
  label?: string
  x: number
  y: number
}
export interface BlueprintEdge {
  from: string
  to: string
  label?: string
  dashed?: boolean
}
export interface Template {
  id: string
  name: string
  description: string
  category: 'Foundations' | 'Applications' | 'Cloud & data'
  color: string
  nodes: BlueprintNode[]
  edges: BlueprintEdge[]
}
