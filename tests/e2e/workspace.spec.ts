import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
async function create(page: Page, name = 'Architecture test') {
  await page.goto('/')
  await page.getByRole('button', { name: 'New diagram', exact: true }).click()
  await page.getByLabel('Diagram name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Create diagram', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add Web client', exact: true })).toBeEnabled()
}
async function saved(page: Page) {
  await expect(page.getByRole('status')).toHaveText('All changes saved')
}
async function readDiagram(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('systemsketch-workspace', 1)
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    return new Promise<import('../../src/types').Diagram>((resolve, reject) => {
      const r = db
        .transaction('diagrams')
        .objectStore('diagrams')
        .get(location.hash.split('/').pop()!)
      r.onsuccess = () => {
        resolve(r.result)
        db.close()
      }
      r.onerror = () => reject(r.error)
    })
  })
}
async function canvasPoint(
  page: Page,
  diagram: Awaited<ReturnType<typeof readDiagram>>,
  x: number,
  y: number,
) {
  const box = await page.locator('.canvas-host').boundingBox()
  if (!box || !diagram.appState) throw new Error('Canvas viewport missing')
  return {
    x: box.x + (x + diagram.appState.scrollX) * diagram.appState.zoom.value,
    y: box.y + (y + diagram.appState.scrollY) * diagram.appState.zoom.value,
  }
}
for (const placement of [
  'border',
  'inside',
  'interior',
  'near',
  'top',
  'label',
  'elbow',
] as const) {
  test(`arrows drawn ${placement} components remain attached when either component moves`, async ({
    page,
  }) => {
    await create(page, `Connected ${placement}`)
    await page.getByRole('button', { name: 'Add Web client', exact: true }).click()
    await page.getByRole('button', { name: 'Add API service', exact: true }).click()
    await saved(page)
    let initial = await readDiagram(page)
    if (placement === 'near') {
      const node = initial.elements.find((e) => e.customData?.componentId === 'api')!
      const position = await canvasPoint(page, initial, node.x + node.width / 2, node.y + 20)
      await page.keyboard.press('Escape')
      await page.mouse.move(position.x, position.y)
      await page.mouse.down()
      await page.mouse.move(position.x + 100, position.y, { steps: 10 })
      await page.mouse.up()
      await saved(page)
      initial = await readDiagram(page)
    }
    const source = initial.elements.find((e) => e.customData?.componentId === 'client')!
    const target = initial.elements.find((e) => e.customData?.componentId === 'api')!
    const fromX =
      placement === 'border'
        ? source.width
        : placement === 'near'
          ? source.width + 22
          : placement === 'interior'
            ? source.width * 0.75
            : source.width / 2
    const toX =
      placement === 'border'
        ? 0
        : placement === 'near'
          ? -22
          : placement === 'interior'
            ? target.width * 0.25
            : target.width / 2
    const from = await canvasPoint(
      page,
      initial,
      source.x + fromX,
      source.y + (placement === 'label' ? source.height - 15 : source.height / 2),
    )
    const to = await canvasPoint(
      page,
      initial,
      target.x + toX,
      target.y +
        (placement === 'top' ? 0 : placement === 'label' ? target.height - 15 : target.height / 2),
    )
    await page.keyboard.press('Escape')
    await page.keyboard.press('a')
    if (placement === 'elbow') await page.getByTitle('Elbow arrow', { exact: true }).click()
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 12 })
    await page.mouse.up()
    await saved(page)
    const connected = await readDiagram(page)
    const arrow = connected.elements.find((e) => e.type === 'arrow')!
    expect(arrow.startBinding?.elementId).toBe(source.id)
    expect(arrow.endBinding?.elementId).toBe(target.id)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await saved(page)
    expect((await readDiagram(page)).elements.filter((e) => e.type === 'arrow')).toHaveLength(0)
    await page.getByRole('button', { name: 'Redo', exact: true }).click()
    await saved(page)
    const redone = (await readDiagram(page)).elements.find(
      (e) => e.id === arrow.id && e.type === 'arrow',
    )!
    expect(redone.startBinding?.elementId).toBe(source.id)
    expect(redone.endBinding?.elementId).toBe(target.id)
    for (const id of [source.id, target.id]) {
      const before = await readDiagram(page)
      const node = before.elements.find((e) => e.id === id)!
      const oldArrow = before.elements.find((e) => e.id === arrow.id && e.type === 'arrow')!
      const point = await canvasPoint(page, before, node.x + node.width / 2, node.y + 20)
      await page.keyboard.press('Escape')
      await page.keyboard.press('v')
      await page.mouse.move(point.x, point.y)
      await page.mouse.down()
      await page.mouse.move(point.x + 55, point.y + 100, { steps: 12 })
      await page.mouse.up()
      await saved(page)
      const after = await readDiagram(page)
      const movedNode = after.elements.find((e) => e.id === id)!
      const movedArrow = after.elements.find((e) => e.id === arrow.id && e.type === 'arrow')!
      expect(movedNode.y).toBeGreaterThan(node.y + 50)
      expect(movedArrow.startBinding?.elementId).toBe(source.id)
      expect(movedArrow.endBinding?.elementId).toBe(target.id)
      const endpoint = id === source.id ? 0 : movedArrow.points.length - 1
      expect(movedArrow.y + movedArrow.points[endpoint][1]).not.toBeCloseTo(
        oldArrow.y + oldArrow.points[endpoint][1],
        0,
      )
    }
    await page.reload()
    await expect(page.getByRole('button', { name: 'Add Web client', exact: true })).toBeEnabled()
    const restored = (await readDiagram(page)).elements.find(
      (e) => e.id === arrow.id && e.type === 'arrow',
    )!
    expect(restored.startBinding?.elementId).toBe(source.id)
    expect(restored.endBinding?.elementId).toBe(target.id)
  })
}
test('an unattached arrow can be moved between cards to connect it', async ({ page }) => {
  await create(page, 'Move a connector')
  await page.getByRole('button', { name: 'Add Web client', exact: true }).click()
  await page.getByRole('button', { name: 'Add API service', exact: true }).click()
  await saved(page)
  const initial = await readDiagram(page)
  const source = initial.elements.find((e) => e.customData?.componentId === 'client')!
  const target = initial.elements.find((e) => e.customData?.componentId === 'api')!
  const from = await canvasPoint(
    page,
    initial,
    source.x + source.width / 2,
    source.y + source.height / 2,
  )
  const to = await canvasPoint(
    page,
    initial,
    target.x + target.width / 2,
    target.y + target.height / 2,
  )
  await page.keyboard.press('Escape')
  await page.keyboard.press('a')
  await page.keyboard.down('ControlOrMeta')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
  await page.keyboard.up('ControlOrMeta')
  await saved(page)
  const detached = (await readDiagram(page)).elements.find((e) => e.type === 'arrow')!
  expect(detached.startBinding).toBeNull()
  expect(detached.endBinding).toBeNull()
  await page.keyboard.press('Escape')
  await page.keyboard.press('v')
  await page.mouse.move((from.x + to.x) / 2, from.y)
  await page.mouse.down()
  await page.mouse.move((from.x + to.x) / 2, from.y + 10, { steps: 10 })
  await page.mouse.up()
  await saved(page)
  const attached = (await readDiagram(page)).elements.find(
    (e) => e.id === detached.id && e.type === 'arrow',
  )!
  expect(attached.startBinding?.elementId).toBe(source.id)
  expect(attached.endBinding?.elementId).toBe(target.id)
})
test('expanded components are searchable, drawable, and restored after reload', async ({
  page,
}) => {
  await create(page, 'Expanded architecture')
  const entries = [
    ['Rate limiter', 'rate-limiter'],
    ['OpenTelemetry', 'opentelemetry'],
    ['EventBridge', 'aws-eventbridge'],
    ['Key Vault', 'azure-keyvault'],
    ['Spanner', 'gcp-spanner'],
  ]
  for (const [name] of entries) {
    await page.getByLabel('Find a component', { exact: true }).fill(name)
    await page.getByRole('button', { name: `Add ${name}`, exact: true }).click()
  }
  await saved(page)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Add Web client', exact: true })).toBeEnabled()
  const restored = await readDiagram(page)
  expect(
    restored.elements
      .filter((e) => e.customData?.componentId)
      .map((e) => e.customData?.componentId)
      .sort(),
  ).toEqual(entries.map(([, id]) => id).sort())
  expect(Object.keys(restored.files)).toHaveLength(entries.length)
})
test('create, add components, undo, redo, freehand, and restore after reload', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await create(page)
  await page.getByRole('button', { name: 'Add Web client', exact: true }).click()
  await page.getByRole('button', { name: 'Add API service', exact: true }).click()
  await expect(page.locator('.canvas-item-count')).toHaveText('2 elements')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.canvas-item-count')).toHaveText('1 element')
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(page.locator('.canvas-item-count')).toHaveText('2 elements')
  await page
    .locator('label')
    .filter({ has: page.getByRole('radio', { name: 'Draw', exact: true }) })
    .click()
  const box = await page.locator('.canvas-host').boundingBox()
  if (!box) throw new Error('canvas missing')
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.75, { steps: 10 })
  await page.mouse.up()
  await saved(page)
  const before = await readDiagram(page)
  expect(before.elements.some((e) => e.type === 'freedraw')).toBe(true)
  expect(before.elements.filter((e) => e.customData?.componentId)).toHaveLength(2)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Add Web client', exact: true })).toBeEnabled()
  await saved(page)
  expect((await readDiagram(page)).elements.length).toBe(before.elements.length)
  await page.getByRole('button', { name: 'Back to dashboard', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Open Architecture test', exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
test('templates contain bound connectors and support both drawing styles', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Scalable web application', exact: true }).click()
  await page.getByRole('button', { name: 'Use this template', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add Web client', exact: true })).toBeEnabled()
  await saved(page)
  const diagram = await readDiagram(page)
  const arrows = diagram.elements.filter((e) => e.type === 'arrow')
  expect(arrows).toHaveLength(6)
  for (const arrow of arrows) {
    expect(arrow.startBinding?.elementId).toBeTruthy()
    expect(arrow.endBinding?.elementId).toBeTruthy()
  }
  await page
    .getByRole('group', { name: 'Diagram style' })
    .getByRole('button', { name: 'Hand-drawn', exact: true })
    .click()
  await saved(page)
  expect((await readDiagram(page)).style).toBe('sketch')
  await page.reload()
  await expect(
    page
      .getByRole('group', { name: 'Diagram style' })
      .getByRole('button', { name: 'Hand-drawn', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
})
test('Mermaid validates syntax, preserves existing work, and imports editable flowcharts', async ({
  page,
}) => {
  await create(page, 'Mermaid test')
  await page.getByRole('button', { name: 'Add Database', exact: true }).click()
  await page.getByRole('button', { name: 'Import Mermaid', exact: true }).click()
  await page.getByLabel('Mermaid flowchart', { exact: true }).fill('sequenceDiagram\nA->>B: hello')
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('supports Mermaid flowcharts')
  await page
    .getByLabel('Mermaid flowchart', { exact: true })
    .fill('flowchart LR\n A[Client] --> B[Gateway]\n B --> C[(Database)]')
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'A few lines. A whole system.', exact: true }),
  ).toHaveCount(0)
  await saved(page)
  const diagram = await readDiagram(page)
  expect(diagram.elements.some((e) => e.customData?.componentId === 'database')).toBe(true)
  expect(diagram.elements.filter((e) => e.type === 'arrow')).toHaveLength(2)
  expect(diagram.elements.some((e) => e.type === 'text' && e.text === 'Gateway')).toBe(true)
})
test('dashboard rename, search, star, duplicate, and delete use durable records', async ({
  page,
}) => {
  await create(page, 'Original')
  await page.getByRole('button', { name: 'Back to dashboard', exact: true }).click()
  await page.getByRole('button', { name: 'Actions for Original', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Diagram name', { exact: true }).fill('Renamed design')
  await page.getByRole('button', { name: 'Save name', exact: true }).click()
  await page.getByRole('button', { name: 'Star Renamed design', exact: true }).click()
  await page.getByRole('button', { name: /^Starred/ }).click()
  await expect(page.getByRole('button', { name: 'Open Renamed design', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Actions for Renamed design', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click()
  await page.getByRole('button', { name: /^My diagrams/ }).click()
  await page.getByLabel('Search diagrams', { exact: true }).fill('(copy)')
  await expect(
    page.getByRole('button', { name: 'Open Renamed design (copy)', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Actions for Renamed design (copy)', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Delete diagram', exact: true }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete diagram', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'No diagrams found', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Open Renamed design', exact: true })).toBeVisible()
})
test('another tab cannot silently overwrite an open diagram', async ({ page, context }) => {
  await create(page, 'Tab ownership')
  await saved(page)
  const second = await context.newPage()
  await second.goto(page.url())
  await expect(
    second.getByText('This diagram is open in another tab.', { exact: false }),
  ).toBeVisible()
  await expect(second.getByRole('button', { name: 'Add Web client', exact: true })).toBeDisabled()
  await page.close()
  await second.reload()
  await expect(second.getByRole('button', { name: 'Add Web client', exact: true })).toBeEnabled()
})
test('phone viewing and tablet editing fit their viewports', async ({ page }) => {
  await create(page, 'Responsive diagram')
  await saved(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText('You’re in view mode.', { exact: false })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Diagram name', exact: true })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1024, height: 768 })
  await expect(page.getByRole('button', { name: 'Add Web client', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Add Web client', exact: true }).click()
  await saved(page)
  expect(
    (await readDiagram(page)).elements.some((e) => e.customData?.componentId === 'client'),
  ).toBe(true)
})
test('dashboard and new-diagram dialog meet automated accessibility checks', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const dashboard = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(
    dashboard.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([])
  await page.getByRole('button', { name: 'New diagram', exact: true }).click()
  const dialog = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(dialog.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  )
})

test('failed saves stay recoverable and prevent leaving with unsaved changes', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if ((window as Window & { failTestSaves?: boolean }).failTestSaves) {
        throw new DOMException('Simulated quota failure', 'QuotaExceededError')
      }
      return put.apply(this, args)
    }
  })
  await create(page, 'Save recovery')
  await saved(page)
  await page.evaluate(() => {
    ;(window as Window & { failTestSaves?: boolean }).failTestSaves = true
  })
  await page.getByRole('button', { name: 'Add Web client', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('browser storage is full')
  const url = page.url()
  await page.getByRole('button', { name: 'Back to dashboard', exact: true }).click()
  await expect(page).toHaveURL(url)
  await expect(page.getByRole('button', { name: 'Add Web client', exact: true })).toBeVisible()
  await page.evaluate(() => {
    ;(window as Window & { failTestSaves?: boolean }).failTestSaves = false
  })
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click()
  await saved(page)
  expect(
    (await readDiagram(page)).elements.some((e) => e.customData?.componentId === 'client'),
  ).toBe(true)
  await page.getByRole('button', { name: 'Back to dashboard', exact: true }).click()
  await page.evaluate(() => {
    ;(window as Window & { failTestSaves?: boolean }).failTestSaves = true
  })
  await page.getByRole('button', { name: 'New diagram', exact: true }).click()
  await page.getByLabel('Diagram name', { exact: true }).fill('Retry creation')
  await page.getByRole('button', { name: 'Create diagram', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Diagram name', { exact: true })).toHaveValue('Retry creation')
  await page.evaluate(() => {
    ;(window as Window & { failTestSaves?: boolean }).failTestSaves = false
  })
  await page.getByRole('button', { name: 'Create diagram', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add Web client', exact: true })).toBeEnabled()
})
