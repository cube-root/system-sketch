import {
  convertToExcalidrawElements,
  newElementWith,
  restoreElements,
} from '@excalidraw/excalidraw'
import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/data/transform'
import type { BinaryFileData, BinaryFiles, DataURL } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement, FileId } from '@excalidraw/excalidraw/element/types'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { brands, iconMap } from '@/components/ComponentIcon'
import { componentById } from '@/data/catalog'
import type { DiagramStyle, SystemComponent, Template } from '@/types'

import { NODE_WIDTH, NODE_HEIGHT, routeBlueprintEdge } from '@/lib/routing'
function iconFile(component: SystemComponent): BinaryFileData {
  const brand = component.brand && brands[component.brand]
  const svg = brand
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${brand.width} ${brand.height}" width="64" height="64">${brand.body}</svg>`
    : renderToStaticMarkup(
        createElement(iconMap[component.icon] ?? iconMap.Box, {
          size: 64,
          color: component.color,
          strokeWidth: 1.6,
        }),
      )
  return {
    id: `systemsketch-icon-${component.id}` as FileId,
    mimeType: 'image/svg+xml',
    dataURL: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}` as DataURL,
    created: 1,
  }
}
function componentSkeleton(
  component: SystemComponent,
  x: number,
  y: number,
  id: string,
  label: string,
  style: DiagramStyle,
) {
  const groupId = `${id}-group`
  const file = iconFile(component)
  const data = { groupIds: [groupId], roughness: style === 'sketch' ? 1 : 0 }
  const elements: ExcalidrawElementSkeleton[] = [
    {
      type: 'rectangle',
      id,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      strokeColor: component.color,
      backgroundColor: component.fill,
      fillStyle: 'solid',
      strokeWidth: 1.5,
      roundness: { type: 3 },
      customData: { componentId: component.id },
      ...data,
      label: {
        text: label,
        fontSize: 17,
        fontFamily: style === 'sketch' ? 5 : 2,
        strokeColor: '#343840',
        verticalAlign: 'bottom',
        textAlign: 'center',
      },
    },
    {
      type: 'image',
      id: `${id}-icon`,
      x: x + 77,
      y: y + 17,
      width: 36,
      height: 36,
      fileId: file.id,
      status: 'saved',
      ...data,
    },
  ]
  return { elements, file }
}
export function buildComponent(
  component: SystemComponent,
  x: number,
  y: number,
  style: DiagramStyle,
) {
  const result = componentSkeleton(component, x, y, crypto.randomUUID(), component.name, style)
  return {
    elements: convertToExcalidrawElements(result.elements, { regenerateIds: false }),
    files: { [result.file.id]: result.file },
  }
}
export function buildTemplate(template: Template, style: DiagramStyle = 'clean') {
  const all: ExcalidrawElementSkeleton[] = []
  const files: BinaryFiles = {}
  const prefix = crypto.randomUUID()
  for (const node of template.nodes) {
    const component = componentById[node.component]
    const result = componentSkeleton(
      component,
      node.x,
      node.y,
      `${prefix}-${node.id}`,
      node.label ?? component.name,
      style,
    )
    all.push(...result.elements)
    files[result.file.id] = result.file
  }
  for (const edge of template.edges) {
    const route = routeBlueprintEdge(template, edge)
    const [startX, startY] = route[0]
    all.push({
      type: 'arrow',
      x: startX,
      y: startY,
      width: Math.max(...route.map(([x]) => x)) - Math.min(...route.map(([x]) => x)),
      height: Math.max(...route.map(([, y]) => y)) - Math.min(...route.map(([, y]) => y)),
      points: route.map(([x, y]) => [x - startX, y - startY]),
      start: { id: `${prefix}-${edge.from}` },
      end: { id: `${prefix}-${edge.to}` },
      roundness: null,
      strokeColor: '#9299a7',
      strokeWidth: 1.5,
      strokeStyle: edge.dashed ? 'dashed' : 'solid',
      roughness: style === 'sketch' ? 1 : 0,
      endArrowhead: 'arrow',
      ...(edge.label
        ? { label: { text: edge.label, fontSize: 12, fontFamily: 2, strokeColor: '#727987' } }
        : {}),
    })
  }
  return { elements: convertToExcalidrawElements(all, { regenerateIds: false }), files }
}
export function restyleElements(elements: readonly ExcalidrawElement[], style: DiagramStyle) {
  const updated = elements.map((element) =>
    newElementWith(element, {
      roughness: style === 'sketch' ? 1 : 0,
      ...(element.type === 'text' ? { fontFamily: style === 'sketch' ? 5 : 2 } : {}),
    }),
  )
  return restoreElements(updated, null, { refreshDimensions: true, repairBindings: true })
}
