import { readFile, writeFile, cp, mkdir } from 'node:fs/promises'
const catalog = await readFile(new URL('../src/data/catalog.ts', import.meta.url), 'utf8')
const all = JSON.parse(
  await readFile(
    new URL('../node_modules/@iconify-json/logos/icons.json', import.meta.url),
    'utf8',
  ),
)
const selected = {}
for (const name of new Set([...catalog.matchAll(/'([\w-]+)'/g)].map((match) => match[1]))) {
  const icon = all.icons[name]
  if (icon)
    selected[name] = {
      ...icon,
      width: icon.width ?? all.width ?? 24,
      height: icon.height ?? all.height ?? 24,
    }
}
await writeFile(new URL('../src/data/brand-icons.json', import.meta.url), JSON.stringify(selected))
await mkdir(new URL('../public/excalidraw-assets/', import.meta.url), { recursive: true })
await cp(
  new URL('../node_modules/@excalidraw/excalidraw/dist/prod/fonts', import.meta.url),
  new URL('../public/excalidraw-assets/fonts', import.meta.url),
  { recursive: true },
)
console.log(`Prepared ${Object.keys(selected).length} local brand icons and canvas fonts.`)
