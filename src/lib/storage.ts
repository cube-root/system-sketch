import { openDB, type DBSchema } from 'idb'
import type { Diagram } from '@/types'
interface SystemSketchDB extends DBSchema {
  diagrams: { key: string; value: Diagram; indexes: { 'updated-at': number } }
}
const DATABASE = 'systemsketch-workspace'
let connection: ReturnType<typeof openDB<SystemSketchDB>> | undefined
function database() {
  if (!connection) {
    connection = openDB<SystemSketchDB>(DATABASE, 1, {
      upgrade(db) {
        db.createObjectStore('diagrams', { keyPath: 'id' }).createIndex('updated-at', 'updatedAt')
      },
      blocking() {
        void connection?.then((db) => db.close())
        connection = undefined
      },
      terminated() {
        connection = undefined
      },
    }).catch((error) => {
      connection = undefined
      throw error
    })
  }
  return connection
}
export async function listDiagrams() {
  const db = await database()
  return (await db.getAll('diagrams')).sort((a, b) => b.updatedAt - a.updatedAt)
}
export async function saveDiagram(diagram: Diagram) {
  const db = await database()
  await db.put('diagrams', diagram)
}
export async function deleteDiagram(id: string) {
  const db = await database()
  await db.delete('diagrams', id)
}
export async function getDiagram(id: string) {
  const db = await database()
  return db.get('diagrams', id)
}
export function createDiagram(name: string, templateId?: string): Diagram {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    name: name.trim() || 'Untitled diagram',
    description: '',
    createdAt: now,
    updatedAt: now,
    starred: false,
    style: 'clean',
    templateId,
    elements: [],
    files: {},
  }
}
export function storageError(error: unknown) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError')
    return 'Your browser storage is full. Free up space, then retry saving.'
  return 'Could not save to this browser. Keep this tab open and retry. Check that browser storage is allowed.'
}
