import type { BlueprintEdge, Template } from '@/types'
export const NODE_WIDTH = 190
export const NODE_HEIGHT = 112
export type RoutePoint = [number, number]
/** Orthogonal paths for our deliberately spaced blueprint columns. */
export function routeBlueprintEdge(template: Template, edge: BlueprintEdge): RoutePoint[] {
  const from = template.nodes.find((node) => node.id === edge.from)!
  const to = template.nodes.find((node) => node.id === edge.to)!
  let points: RoutePoint[]
  if (from.x === to.x) {
    const down = to.y > from.y
    const x = from.x + NODE_WIDTH / 2
    const y1 = from.y + (down ? NODE_HEIGHT : 0)
    const y2 = to.y + (down ? 0 : NODE_HEIGHT)
    const blocked = template.nodes.some(
      (node) =>
        node.id !== from.id &&
        node.id !== to.id &&
        x > node.x &&
        x < node.x + NODE_WIDTH &&
        Math.max(y1, y2) > node.y &&
        Math.min(y1, y2) < node.y + NODE_HEIGHT,
    )
    if (blocked) {
      const right = from.x + NODE_WIDTH
      const lane = right + 55
      points = [
        [right, from.y + 56],
        [lane, from.y + 56],
        [lane, to.y + 56],
        [right, to.y + 56],
      ]
    } else
      points = [
        [x, y1],
        [x, y2],
      ]
  } else {
    const rightward = to.x > from.x
    const x1 = from.x + (rightward ? NODE_WIDTH : 0)
    const x2 = to.x + (rightward ? 0 : NODE_WIDTH)
    const y1 = from.y + NODE_HEIGHT / 2
    const y2 = to.y + NODE_HEIGHT / 2
    const lane = (x1 + x2) / 2
    points =
      y1 === y2
        ? [
            [x1, y1],
            [x2, y2],
          ]
        : [
            [x1, y1],
            [lane, y1],
            [lane, y2],
            [x2, y2],
          ]
  }
  return points
}
