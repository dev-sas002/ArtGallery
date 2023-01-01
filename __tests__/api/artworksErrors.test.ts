import { createMocks } from 'node-mocks-http'

// The route must not leak an internal failure to the client. Mocking the
// domain layer is the only way to force one.
jest.mock('../../lib/catalog', () => ({
  ...jest.requireActual('../../lib/catalog'),
  getCatalog: jest.fn(async () => {
    throw new Error('catalogue exploded')
  }),
}))

// eslint-disable-next-line import/first
import handler from '../../pages/api/artworks'

describe('GET /api/artworks failure path', () => {
  it('returns a generic 500 and logs the cause server-side', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { req, res } = createMocks({ method: 'GET', query: {} })

    await handler(req as never, res as never)

    expect(res._getStatusCode()).toBe(500)
    expect(res._getJSONData()).toEqual({ error: 'Unexpected server error' })
    expect(JSON.stringify(res._getJSONData())).not.toContain('catalogue exploded')
    expect(error).toHaveBeenCalledWith(
      '[api/artworks] request failed',
      expect.objectContaining({ message: 'catalogue exploded' })
    )

    error.mockRestore()
  })
})
