import { openDB, type IDBPDatabase } from 'idb'
import { emptyDataset, type RouteDataset } from './types'

const DB_NAME = 'vecv-route-author'
const DB_VERSION = 1
const STORE = 'dataset'
const KEY = 'current'

let dbPromise: Promise<IDBPDatabase> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let memoryCache: RouteDataset | null = null
const listeners = new Set<(d: RouteDataset) => void>()

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

export function subscribeDataset(fn: (d: RouteDataset) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify(d: RouteDataset) {
  memoryCache = d
  for (const fn of listeners) fn(d)
}

export async function loadDataset(): Promise<RouteDataset> {
  const db = await getDb()
  const existing = (await db.get(STORE, KEY)) as RouteDataset | undefined
  if (existing && existing.schemaVersion === 1) {
    memoryCache = existing
    return existing
  }
  const fresh = emptyDataset()
  await db.put(STORE, fresh, KEY)
  memoryCache = fresh
  return fresh
}

export function getCachedDataset(): RouteDataset | null {
  return memoryCache
}

export async function saveDataset(dataset: RouteDataset): Promise<RouteDataset> {
  const next: RouteDataset = {
    ...dataset,
    schemaVersion: 1,
    dataVersion: String(Number(dataset.dataVersion || '0') + 1),
    updatedAt: new Date().toISOString(),
  }
  const db = await getDb()
  await db.put(STORE, next, KEY)
  notify(next)
  return next
}

/** Debounced autosave — call after every edit. */
export function scheduleAutosave(dataset: RouteDataset): void {
  memoryCache = dataset
  notify(dataset)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void saveDataset(dataset)
  }, 300)
}

/** Immediate save (e.g. before export). */
export async function flushAutosave(dataset: RouteDataset): Promise<RouteDataset> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  return saveDataset(dataset)
}

export function validateDataset(raw: unknown): RouteDataset {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON')
  const d = raw as RouteDataset
  if (d.schemaVersion !== 1) throw new Error('Unsupported schemaVersion')
  if (!Array.isArray(d.geolocations) || !Array.isArray(d.directions)) {
    throw new Error('Missing geolocations or directions')
  }
  return {
    schemaVersion: 1,
    dataVersion: String(d.dataVersion ?? '0'),
    updatedAt: d.updatedAt || new Date().toISOString(),
    geolocations: d.geolocations,
    directions: d.directions,
  }
}

export async function importJson(file: File): Promise<RouteDataset> {
  const text = await file.text()
  const parsed = validateDataset(JSON.parse(text))
  return saveDataset({ ...parsed, dataVersion: String(Number(parsed.dataVersion || '0')) })
}

export function downloadJson(dataset: RouteDataset): void {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `route-data-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function clearDataset(): Promise<RouteDataset> {
  return saveDataset(emptyDataset())
}
