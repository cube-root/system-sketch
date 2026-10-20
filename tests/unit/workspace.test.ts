import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDiagram, deleteDiagram, getDiagram, listDiagrams, saveDiagram } from '@/lib/storage'
import { components, componentById, searchComponents, categories } from '@/data/catalog'
import { templates } from '@/data/templates'
import { routeBlueprintEdge, NODE_WIDTH, NODE_HEIGHT } from '@/lib/routing'
import { mermaidExample, validateMermaid } from '@/lib/mermaid'

describe('durable local workspace', () => {
  beforeEach(async () => {
    for (const diagram of await listDiagrams()) await deleteDiagram(diagram.id)
  })
  it('roundtrips diagram metadata without merging documents', async () => {
    const a = createDiagram('  Orders  '),
      b = createDiagram('Payments')
    await saveDiagram(a)
    await saveDiagram(b)
    await saveDiagram({
      ...a,
      name: 'Order v2',
      starred: true,
      style: 'sketch',
      updatedAt: a.updatedAt + 1000,
    })
    expect(await getDiagram(a.id)).toMatchObject({
      name: 'Order v2',
      starred: true,
      style: 'sketch',
      schemaVersion: 1,
    })
    expect((await getDiagram(b.id))?.name).toBe('Payments')
    expect((await listDiagrams()).map((d) => d.id)).toEqual([a.id, b.id])
  })
  it('deletes only the requested diagram', async () => {
    const a = createDiagram('A'),
      b = createDiagram('B')
    await saveDiagram(a)
    await saveDiagram(b)
    await deleteDiagram(a.id)
    expect(await getDiagram(a.id)).toBeUndefined()
    expect((await listDiagrams()).map((d) => d.id)).toEqual([b.id])
  })
})
describe('component and architecture integrity', () => {
  it('has unique component IDs and searchable provider-specific blocks', () => {
    expect(new Set(components.map((c) => c.id)).size).toBe(components.length)
    for (const category of categories)
      expect(searchComponents('', category).length).toBeGreaterThan(0)
    expect(searchComponents('aws database').every((c) => c.category === 'AWS')).toBe(true)
    expect(searchComponents('Redis')[0].id).toBe('redis')
  })
  it('every template has valid, unique nodes and connected edges', () => {
    expect(templates.length).toBe(12)
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length)
    for (const template of templates) {
      const ids = new Set(template.nodes.map((n) => n.id))
      expect(ids.size).toBe(template.nodes.length)
      for (const node of template.nodes)
        expect(componentById[node.component], `${template.name}/${node.component}`).toBeDefined()
      for (const edge of template.edges) {
        expect(ids.has(edge.from)).toBe(true)
        expect(ids.has(edge.to)).toBe(true)
        expect(edge.from).not.toBe(edge.to)
      }
    }
  })
})
describe('Mermaid import boundaries', () => {
  it('accepts flowcharts and graph syntax', () => {
    expect(validateMermaid(mermaidExample)).toBe(mermaidExample)
    expect(validateMermaid('%% example\ngraph TD\n A-->B')).toContain('graph TD')
  })
  it.each([
    'sequenceDiagram\n A->>B: hello',
    'flowchart LR\n click A "javascript:alert(1)"',
    '%%{init:{securityLevel:"loose"}}%%\nflowchart LR\n A-->B',
    'flowchart LR\nA[<img src=x>]-->B',
    'flowchart LR\n' + 'A'.repeat(20000),
  ])('rejects unsupported or unsafe input: %s', (source) => {
    expect(() => validateMermaid(source)).toThrow()
  })
})

describe('template connection routing', () => {
  it('routes every connection around unrelated components', () => {
    for (const template of templates)
      for (const edge of template.edges) {
        const route = routeBlueprintEdge(template, edge)
        for (let i = 1; i < route.length; i++) {
          const [x1, y1] = route[i - 1],
            [x2, y2] = route[i]
          expect(x1 === x2 || y1 === y2).toBe(true)
          for (const node of template.nodes.filter((n) => n.id !== edge.from && n.id !== edge.to)) {
            const crosses =
              x1 === x2
                ? x1 > node.x &&
                  x1 < node.x + NODE_WIDTH &&
                  Math.max(y1, y2) > node.y &&
                  Math.min(y1, y2) < node.y + NODE_HEIGHT
                : y1 > node.y &&
                  y1 < node.y + NODE_HEIGHT &&
                  Math.max(x1, x2) > node.x &&
                  Math.min(x1, x2) < node.x + NODE_WIDTH
            expect(crosses, `${template.id}: ${edge.from}→${edge.to} crosses ${node.id}`).toBe(
              false,
            )
          }
        }
      }
  })
})
