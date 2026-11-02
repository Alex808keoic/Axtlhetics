/**
 * Qué viaja en la copia en la nube de AXTHLETICS (`cloud-sync.ts`, D-081).
 *
 * Todo lo tuyo: perfil, calendario, recuperación, sesiones, memoria de AXIS,
 * tests, escáneres y medidas. Se quedan en el dispositivo:
 * - el entrenamiento en curso (`activeWorkout`): es de este móvil, ahora;
 * - las fotos de los escáneres (miniaturas): solo viven aquí (D-023). Sube el
 *   resultado del escáner sin fotos y, al bajar, se conservan las que hubiera.
 */
import { STORES, read, writeAcross, type StoreName } from '@/lib/data/indexeddb/db'
import { withoutThumbnails, type ScanRecord } from '@/lib/domain/scanner/types'
import type { RemoteChange, SyncAdapter } from './cloud-sync'

/** Almacén → campo clave (el `keyPath` con que se creó en `db.ts`). */
const KEYS: Partial<Record<StoreName, string>> = {
  [STORES.profile]: 'id',
  [STORES.activities]: 'id',
  [STORES.recovery]: 'dayKey',
  [STORES.sessions]: 'id',
  [STORES.axisMemory]: 'dayKey',
  [STORES.assessments]: 'id',
  [STORES.scans]: 'id',
  [STORES.measurements]: 'dayKey',
}

export const axthleticsSyncAdapter: SyncAdapter = {
  app: 'axthletics',
  stores: Object.keys(KEYS),
  async readAll(store) {
    const keyPath = KEYS[store as StoreName] as string
    const rows = await read<Record<string, unknown>[]>(store as StoreName, (s) => s.getAll())
    return rows.flatMap((value) => (typeof value[keyPath] === 'string' ? [{ key: value[keyPath] as string, value }] : []))
  },
  async apply(changes: readonly RemoteChange[]) {
    const stores = [...new Set(changes.map((c) => c.store as StoreName))]
    await writeAcross(stores, (get) => {
      for (const change of changes) {
        const store = get(change.store as StoreName)
        if (change.value === null) store.delete(change.key)
        else store.put(change.value)
      }
    })
  },
  toCloud(store, value) {
    return store === STORES.scans ? withoutThumbnails(value as ScanRecord) : value
  },
  fromCloud(store, remote, local) {
    if (store !== STORES.scans) return remote
    const thumbnails = (local as ScanRecord | undefined)?.thumbnails
    return thumbnails ? { ...(remote as ScanRecord), thumbnails } : remote
  },
}
