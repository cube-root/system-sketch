import { useId } from 'react'
import { routeBlueprintEdge } from '@/lib/routing'
import { componentById } from '@/data/catalog'
import type { Template, Diagram } from '@/types'
export function BlueprintPreview({
  template,
  large = false,
}: {
  template: Template
  large?: boolean
}) {
  const marker = useId().replaceAll(':', '')
  const maxX = Math.max(...template.nodes.map((n) => n.x)) + 190
  const maxY = Math.max(...template.nodes.map((n) => n.y)) + 112
  return (
    <svg
      className={`blueprint-preview ${large ? 'large' : ''}`}
      viewBox={`-45 -40 ${maxX + 90} ${maxY + 80}`}
      aria-hidden="true"
    >
      <defs>
        <marker id={marker} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5" fill="none" stroke="#adb4c1" />
        </marker>
      </defs>
      {template.edges.map((edge, i) => {
        const path = routeBlueprintEdge(template, edge)
          .map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`)
          .join(' ')
        return (
          <path
            key={i}
            d={path}
            stroke="#adb4c1"
            strokeWidth="2"
            strokeDasharray={edge.dashed ? '8 5' : undefined}
            fill="none"
            markerEnd={`url(#${marker})`}
          />
        )
      })}
      {template.nodes.map((node) => {
        const c = componentById[node.component]
        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width="190"
              height="112"
              rx="12"
              fill={c.fill}
              stroke={c.color}
              strokeOpacity=".55"
              strokeWidth="2"
            />
            {c.icon.includes('Database') ? (
              <g fill="none" stroke={c.color} strokeWidth="2.5">
                <path d={`M${node.x + 79},${node.y + 31} v22 c0,10 32,10 32,0 v-22`} />
                <ellipse cx={node.x + 95} cy={node.y + 31} rx="16" ry="6" />
              </g>
            ) : (
              <g stroke={c.color} strokeWidth="2.5" fill="none">
                <rect x={node.x + 79} y={node.y + 24} width="32" height="30" rx="5" />
                <path d={`M${node.x + 86},${node.y + 34} h18 m-18,10 h12`} />
              </g>
            )}
            <text
              x={node.x + 95}
              y={node.y + 87}
              textAnchor="middle"
              fontSize="17"
              fill="#505663"
              fontFamily="DM Sans Variable, sans-serif"
            >
              {node.label ?? c.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
export function ScenePreview({ diagram }: { diagram: Diagram }) {
  const elements = diagram.elements.filter((e) => !e.isDeleted)
  if (!elements.length)
    return (
      <div className="blank-preview">
        <span>＋</span>
        <p>A little space for a big idea</p>
      </div>
    )
  const minX = Math.min(...elements.map((e) => e.x)),
    minY = Math.min(...elements.map((e) => e.y))
  const width = Math.max(...elements.map((e) => e.x + e.width)) - minX,
    height = Math.max(...elements.map((e) => e.y + e.height)) - minY
  return (
    <svg
      className="blueprint-preview"
      viewBox={`${minX - 30} ${minY - 30} ${Math.max(width + 60, 100)} ${Math.max(height + 60, 100)}`}
      aria-hidden="true"
    >
      {elements.map((e) => {
        const common = {
          fill: e.backgroundColor,
          stroke: e.strokeColor,
          strokeWidth: e.strokeWidth,
          opacity: e.opacity / 100,
        }
        if (e.type === 'rectangle' || e.type === 'frame')
          return (
            <rect
              key={e.id}
              x={e.x}
              y={e.y}
              width={e.width}
              height={e.height}
              rx={e.roundness ? 10 : 0}
              {...common}
            />
          )
        if (e.type === 'ellipse')
          return (
            <ellipse
              key={e.id}
              cx={e.x + e.width / 2}
              cy={e.y + e.height / 2}
              rx={e.width / 2}
              ry={e.height / 2}
              {...common}
            />
          )
        if (e.type === 'diamond')
          return (
            <polygon
              key={e.id}
              points={`${e.x + e.width / 2},${e.y} ${e.x + e.width},${e.y + e.height / 2} ${e.x + e.width / 2},${e.y + e.height} ${e.x},${e.y + e.height / 2}`}
              {...common}
            />
          )
        if (e.type === 'text')
          return (
            <text
              key={e.id}
              x={e.x}
              y={e.y + e.fontSize}
              fill={e.strokeColor}
              fontSize={e.fontSize}
            >
              {e.text.split('\n').map((line, i) => (
                <tspan key={i} x={e.x} dy={i ? e.fontSize * 1.25 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          )
        if (e.type === 'image' && e.fileId && diagram.files[e.fileId])
          return (
            <image
              key={e.id}
              href={diagram.files[e.fileId].dataURL}
              x={e.x}
              y={e.y}
              width={e.width}
              height={e.height}
            />
          )
        if (e.type === 'arrow' || e.type === 'line' || e.type === 'freedraw')
          return (
            <polyline
              key={e.id}
              points={e.points.map((p) => `${e.x + p[0]},${e.y + p[1]}`).join(' ')}
              {...common}
              fill="none"
            />
          )
        return null
      })}
    </svg>
  )
}
