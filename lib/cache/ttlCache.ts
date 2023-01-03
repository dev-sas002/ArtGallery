/**
 * A tiny TTL + LRU cache with single-flight semantics.
 *
 * Two things make this worth having over a plain `Map`:
 *
 * 1. Entries expire, so a long-lived Node process never serves a stale
 *    upstream catalogue forever.
 * 2. `getOrCreate` de-duplicates concurrent misses. Without that, a cold start
 *    under load fires one upstream request per in-flight visitor (a cache
 *    stampede); with it, the first caller fetches and everyone else awaits the
 *    same promise.
 */
export type TtlCacheOptions = {
  /** How long an entry stays fresh, in milliseconds. */
  ttlMs: number
  /** Maximum number of entries; the least recently used is evicted first. */
  maxEntries?: number
  /** Injectable clock, so tests do not have to sleep. */
  now?: () => number
}

export type TtlCache<T> = {
  get(key: string): T | undefined
  set(key: string, value: T): void
  getOrCreate(key: string, factory: () => Promise<T>): Promise<T>
  delete(key: string): void
  clear(): void
  readonly size: number
}

type Entry<T> = { value: T; expiresAt: number }

export const createTtlCache = <T>({
  ttlMs,
  maxEntries = 100,
  now = Date.now,
}: TtlCacheOptions): TtlCache<T> => {
  const entries = new Map<string, Entry<T>>()
  const inFlight = new Map<string, Promise<T>>()

  const evictIfNeeded = () => {
    while (entries.size > maxEntries) {
      // Map iteration order is insertion order, and `set` re-inserts on write,
      // so the first key is the least recently written.
      const oldest = entries.keys().next()
      if (oldest.done) return
      entries.delete(oldest.value)
    }
  }

  const get = (key: string): T | undefined => {
    const entry = entries.get(key)
    if (!entry) return undefined

    if (entry.expiresAt <= now()) {
      entries.delete(key)
      return undefined
    }

    // Refresh recency so the LRU ordering reflects reads as well as writes.
    entries.delete(key)
    entries.set(key, entry)
    return entry.value
  }

  const set = (key: string, value: T) => {
    entries.delete(key)
    entries.set(key, { value, expiresAt: now() + ttlMs })
    evictIfNeeded()
  }

  const getOrCreate = (key: string, factory: () => Promise<T>): Promise<T> => {
    const cached = get(key)
    if (cached !== undefined) return Promise.resolve(cached)

    const pending = inFlight.get(key)
    if (pending) return pending

    const promise = factory()
      .then((value) => {
        set(key, value)
        return value
      })
      .finally(() => {
        inFlight.delete(key)
      })

    inFlight.set(key, promise)
    return promise
  }

  return {
    get,
    set,
    getOrCreate,
    delete: (key: string) => {
      entries.delete(key)
      inFlight.delete(key)
    },
    clear: () => {
      entries.clear()
      inFlight.clear()
    },
    get size() {
      return entries.size
    },
  }
}
