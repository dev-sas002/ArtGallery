import { createTtlCache } from '../../lib/cache/ttlCache'

describe('createTtlCache', () => {
  it('returns a stored value before it expires and drops it afterwards', () => {
    let now = 1_000
    const cache = createTtlCache<string>({ ttlMs: 100, now: () => now })

    cache.set('k', 'v')
    expect(cache.get('k')).toBe('v')

    now += 99
    expect(cache.get('k')).toBe('v')

    now += 2
    expect(cache.get('k')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('evicts the least recently used entry past maxEntries', () => {
    const cache = createTtlCache<number>({ ttlMs: 10_000, maxEntries: 2 })

    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a') // refreshes recency of "a"
    cache.set('c', 3)

    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
  })

  it('de-duplicates concurrent misses into one factory call', async () => {
    const cache = createTtlCache<string>({ ttlMs: 10_000 })
    const factory = jest.fn(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('value'), 10))
    )

    const results = await Promise.all([
      cache.getOrCreate('k', factory),
      cache.getOrCreate('k', factory),
      cache.getOrCreate('k', factory),
    ])

    expect(results).toEqual(['value', 'value', 'value'])
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('does not cache a rejected factory, and retries on the next call', async () => {
    const cache = createTtlCache<string>({ ttlMs: 10_000 })
    const factory = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok')

    await expect(cache.getOrCreate('k', factory)).rejects.toThrow('boom')
    await expect(cache.getOrCreate('k', factory)).resolves.toBe('ok')
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('supports delete and clear', () => {
    const cache = createTtlCache<number>({ ttlMs: 10_000 })

    cache.set('a', 1)
    cache.set('b', 2)
    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
    expect(cache.size).toBe(1)

    cache.clear()
    expect(cache.size).toBe(0)
  })
})
