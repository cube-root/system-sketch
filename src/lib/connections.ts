import { convertToExcalidrawElements, newElementWith } from '@excalidraw/excalidraw'
import type {
  ExcalidrawElement,
  ExcalidrawLinearElement,
  ExcalidrawGenericElement,
} from '@excalidraw/excalidraw/element/types'

type Point = [number, number]
type Component = ExcalidrawGenericElement & { type: 'rectangle' }

function rotate([x, y]: Point, [cx, cy]: Point, angle: number): Point {
  const cos = Math.cos(angle),
    sin = Math.sin(angle)
  return [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]
}
function center(element: ExcalidrawElement): Point {
  return [element.x + element.width / 2, element.y + element.height / 2]
}
function worldPoints(arrow: ExcalidrawLinearElement): Point[] {
  const xs = arrow.points.map(([x]) => x),
    ys = arrow.points.map(([, y]) => y)
  const origin: Point = [
    arrow.x + (Math.min(...xs) + Math.max(...xs)) / 2,
    arrow.y + (Math.min(...ys) + Math.max(...ys)) / 2,
  ]
  return arrow.points.map(([x, y]) => rotate([arrow.x + x, arrow.y + y], origin, arrow.angle))
}
function distanceToCard(point: Point, node: Component) {
  const [x, y] = rotate(point, center(node), -node.angle)
  return Math.hypot(
    Math.max(node.x - x, 0, x - node.x - node.width),
    Math.max(node.y - y, 0, y - node.y - node.height),
  )
}
function snapToCard(point: Point, adjacent: Point, node: Component): Point {
  const c = center(node)
  const outside = rotate(adjacent, c, -node.angle)
  const local = rotate(point, c, -node.angle)
  // Attach on the side facing the next segment, just outside the card.
  const dx = outside[0] - c[0] || local[0] - c[0],
    dy = outside[1] - c[1] || local[1] - c[1]
  const scale =
    1 / Math.max(Math.abs(dx) / (node.width / 2 + 5), Math.abs(dy) / (node.height / 2 + 5), 0.0001)
  return rotate([c[0] + dx * scale, c[1] + dy * scale], c, node.angle)
}

/** Complete native arrow bindings for component interiors and nearby endpoints. */
export function attachComponentArrows(
  elements: readonly ExcalidrawElement[],
  arrowIds: ReadonlySet<string>,
  zoom: number,
): readonly ExcalidrawElement[] {
  const nodes = elements.filter(
    (e): e is Component => !e.isDeleted && e.type === 'rectangle' && !!e.customData?.componentId,
  )
  if (!nodes.length || !arrowIds.size) return elements
  const changes = new Map<string, ExcalidrawElement>()
  for (const element of elements) {
    if (
      element.isDeleted ||
      element.type !== 'arrow' ||
      !arrowIds.has(element.id) ||
      element.points.length < 2
    )
      continue
    const points = worldPoints(element)
    const last = points.length - 1
    const find = (point: Point) =>
      [...nodes]
        .reverse()
        .map((node) => ({ node, distance: distanceToCard(point, node) }))
        .filter(({ distance }) => distance <= Math.min(32, 24 / zoom))
        .sort((a, b) => a.distance - b.distance)[0]?.node
    const start = find(points[0]),
      end = find(points[last])
    // Preserve existing native connections, free endpoints, and intentional self-loops.
    // Native diagonal strokes can produce an out-of-range focus when entering
    // through the card before reaching its top/bottom border. Such bindings
    // appear attached but cannot track a subsequent move.
    const needsBinding = (node: Component, binding: ExcalidrawLinearElement['startBinding']) =>
      node.id !== binding?.elementId ||
      !Number.isFinite(binding.focus) ||
      Math.abs(binding.focus) > 1
    const startNode = start && needsBinding(start, element.startBinding) ? start : undefined
    const endNode = end && needsBinding(end, element.endBinding) ? end : undefined
    if ((!startNode && !endNode) || (start?.id === end?.id && points.length === 2)) continue
    const original = points.map((p) => [...p] as Point)
    if (startNode) points[0] = snapToCard(original[0], original[1], startNode)
    if (endNode) points[last] = snapToCard(original[last], original[last - 1], endNode)
    // Use the public converter to compute native focus/gap (and elbow fixed-point)
    // bindings, so Excalidraw handles subsequent drag, resize, and rotation itself.
    const targets = [
      ...new Map(
        [startNode, endNode].filter((n): n is Component => !!n).map((n) => [n.id, n]),
      ).values(),
    ]
    const converted = convertToExcalidrawElements(
      [
        ...targets,
        {
          ...element,
          x: points[0][0],
          y: points[0][1],
          angle: 0,
          points: points.map(
            ([x, y]) =>
              [
                x - points[0][0],
                y - points[0][1],
              ] as unknown as ExcalidrawLinearElement['points'][number],
          ),
          ...(startNode ? { start: { id: startNode.id } } : {}),
          ...(endNode ? { end: { id: endNode.id } } : {}),
        },
      ],
      { regenerateIds: false },
    )
    const arrow = converted.find((e) => e.id === element.id)
    if (!arrow || arrow.type !== 'arrow') continue
    const updated = newElementWith(element, {
      x: arrow.x,
      y: arrow.y,
      angle: arrow.angle,
      width: arrow.width,
      height: arrow.height,
      points: arrow.points,
      startBinding: startNode ? arrow.startBinding : element.startBinding,
      endBinding: endNode ? arrow.endBinding : element.endBinding,
    })
    changes.set(element.id, updated)
    // Keep both sides of the relationship consistent, including former icon bindings.
    const targetIds = new Set([updated.startBinding?.elementId, updated.endBinding?.elementId])
    for (const item of elements) {
      const current = changes.get(item.id) ?? item
      const hasArrow = current.boundElements?.some((binding) => binding.id === element.id)
      const shouldBind = targetIds.has(current.id)
      if (!!hasArrow === shouldBind) continue
      const boundElements = (current.boundElements ?? []).filter(
        (binding) => binding.id !== element.id,
      )
      if (shouldBind) boundElements.push({ id: element.id, type: 'arrow' })
      changes.set(current.id, newElementWith(current, { boundElements }))
    }
  }
  return changes.size ? elements.map((e) => changes.get(e.id) ?? e) : elements
}
