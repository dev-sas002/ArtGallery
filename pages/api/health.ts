import type { NextApiRequest, NextApiResponse } from 'next'
import { getCatalog, resolveSource } from '../../lib/catalog'

export type HealthResponse = {
  status: 'ok' | 'degraded'
  source: string
  artworks: number
  aiSearch: 'enabled' | 'disabled'
}

/**
 * Liveness + readiness in one: the container is only healthy once the
 * configured source has produced a non-empty catalogue, which is what the
 * Docker healthcheck waits on.
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse<HealthResponse>) {
  const source = resolveSource()

  try {
    const catalog = await getCatalog(source)
    const status = catalog.artworks.length > 0 ? 'ok' : 'degraded'

    return res.status(status === 'ok' ? 200 : 503).json({
      status,
      source: source.name,
      artworks: catalog.artworks.length,
      aiSearch: process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled',
    })
  } catch (error) {
    console.error('[api/health] catalogue unavailable', error)
    return res.status(503).json({
      status: 'degraded',
      source: source.name,
      artworks: 0,
      aiSearch: process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled',
    })
  }
}
