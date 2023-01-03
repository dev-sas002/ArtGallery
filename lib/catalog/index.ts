import { createTtlCache } from '../cache/ttlCache'
import { buildIndex, type SearchIndex } from '../search/filter'
import { createLocalSource } from './localSource'
import { createMetMuseumSource } from './metMuseumSource'
import type { ArtworkSource, ArtworkSourceFactory } from './source'

const registry = new Map<string, ArtworkSourceFactory>([
  ['local', createLocalSource],
  ['met', () => createMetMuseumSource()],
])

/** Registers an additional source. Exported so a consumer can extend the app. */
export const registerSource = (name: string, factory: ArtworkSourceFactory): void => {
  registry.set(name, factory)
}

export const listSourceNames = (): string[] => Array.from(registry.keys())

export const DEFAULT_SOURCE = 'local'

export const resolveSource = (name = process.env.ARTWORK_SOURCE): ArtworkSource => {
  const key = (name || DEFAULT_SOURCE).trim().toLowerCase()
  const factory = registry.get(key)

  if (!factory) {
    // An unknown source is a configuration mistake, not a reason to 500 —
    // fall back to the bundled catalogue and say so once.
    console.warn(`[catalog] unknown ARTWORK_SOURCE "${key}"; falling back to "${DEFAULT_SOURCE}"`)
    return registry.get(DEFAULT_SOURCE)!()
  }

  return factory()
}

const ttlMs = Number(process.env.CATALOG_CACHE_TTL_MS) || 10 * 60 * 1000

/**
 * One cache entry per source, holding the *indexed* catalogue.
 *
 * The live Met adapter costs dozens of upstream requests per load, so without
 * this every page view would re-fetch the museum. `getOrCreate` also collapses
 * concurrent cold-start misses into a single upstream pass.
 */
const catalogCache = createTtlCache<SearchIndex>({ ttlMs, maxEntries: 8 })

export const getCatalog = async (source: ArtworkSource = resolveSource()): Promise<SearchIndex> =>
  catalogCache.getOrCreate(source.name, async () => buildIndex(await source.list()))

export const clearCatalogCache = (): void => catalogCache.clear()

export type { ArtworkSource, ArtworkSourceFactory } from './source'
