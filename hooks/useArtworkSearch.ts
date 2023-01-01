import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Artwork } from '../lib/artwork'
import type { Facet } from '../lib/search/filter'

/** Long enough to swallow a burst of typing, short enough to feel live. */
export const SEARCH_DEBOUNCE_MS = 250

export type SearchStatus = 'idle' | 'loading' | 'loadingMore' | 'ready' | 'error'

export type ArtworkSearchState = {
  artworks: Artwork[]
  total: number
  status: SearchStatus
  error: string
  departments: Facet[]
  interpretedBy: 'heuristic' | 'model'
  attribution: string
  hasMore: boolean
  search: string
  department: string
  setSearch: (value: string) => void
  setDepartment: (value: string) => void
  loadMore: () => void
  retry: () => void
}

type Payload = {
  data?: Artwork[]
  total?: number
  nextOffset?: number | null
  facets?: { departments?: Facet[] }
  interpretedBy?: 'heuristic' | 'model'
  attribution?: string
}

const buildUrl = (search: string, department: string, offset: number, pageSize: number) => {
  const params = new URLSearchParams({ limit: String(pageSize) })
  if (search.trim()) params.set('search', search.trim())
  if (department) params.set('department', department)
  if (offset > 0) params.set('offset', String(offset))
  return `/api/artworks?${params}`
}

/**
 * Owns every piece of gallery state that is not presentation: debouncing,
 * request cancellation, pagination and error recovery. The page component
 * renders what this returns and nothing else.
 */
export const useArtworkSearch = (pageSize = 12): ArtworkSearchState => {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [total, setTotal] = useState(0)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [departments, setDepartments] = useState<Facet[]>([])
  const [interpretedBy, setInterpretedBy] = useState<'heuristic' | 'model'>('heuristic')
  const [attribution, setAttribution] = useState('')
  const [status, setStatus] = useState<SearchStatus>('loading')
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  // Bumped on every append so `loadMore` can trigger the effect without the
  // effect having to depend on the artworks it writes.
  const [pendingOffset, setPendingOffset] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(
    async (offset: number, signal: AbortSignal) => {
      const append = offset > 0
      setStatus(append ? 'loadingMore' : 'loading')

      try {
        const response = await fetch(buildUrl(search, department, offset, pageSize), { signal })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)

        const payload = (await response.json()) as Payload
        const items = Array.isArray(payload.data) ? payload.data : []

        setArtworks((current) => (append ? [...current, ...items] : items))
        setTotal(typeof payload.total === 'number' ? payload.total : items.length)
        setNextOffset(payload.nextOffset ?? null)
        setDepartments(payload.facets?.departments ?? [])
        setInterpretedBy(payload.interpretedBy ?? 'heuristic')
        setAttribution(payload.attribution ?? '')
        setError('')
        setStatus('ready')
      } catch (cause) {
        if ((cause as Error).name === 'AbortError') return
        if (!append) setArtworks([])
        setError('Could not load artworks right now.')
        setStatus('error')
      }
    },
    [department, pageSize, search]
  )

  // A new search or filter restarts from the top, debounced.
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    const timer = setTimeout(() => run(0, controller.signal), SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [run, reloadToken])

  // Appending a page is not debounced — the click is already the intent.
  useEffect(() => {
    if (pendingOffset === null) return

    const controller = new AbortController()
    run(pendingOffset, controller.signal)
    setPendingOffset(null)

    return () => controller.abort()
  }, [pendingOffset, run])

  const loadMore = useCallback(() => {
    setNextOffset((offset) => {
      if (offset !== null) setPendingOffset(offset)
      return offset
    })
  }, [])

  const retry = useCallback(() => setReloadToken((token) => token + 1), [])

  return useMemo(
    () => ({
      artworks,
      total,
      status,
      error,
      departments,
      interpretedBy,
      attribution,
      hasMore: nextOffset !== null,
      search,
      department,
      setSearch,
      setDepartment,
      loadMore,
      retry,
    }),
    [
      artworks,
      attribution,
      department,
      departments,
      error,
      interpretedBy,
      loadMore,
      nextOffset,
      retry,
      search,
      status,
      total,
    ]
  )
}
