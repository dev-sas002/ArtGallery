/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import Home from '../../pages/index'
import { artwork, CATALOGUE } from '../helpers/factory'
import { createFetchStub } from '../helpers/apiStub'

const MANY = Array.from({ length: 20 }, (_, index) =>
  artwork({
    id: `w${index}`,
    title: `Work ${index}`,
    artist: index % 2 === 0 ? 'Vincent van Gogh' : 'Katsushika Hokusai',
    department: index % 2 === 0 ? 'European Paintings' : 'Asian Art',
    year: 1800 + index,
    imageUrl: `https://images.example.org/${index}.jpg`,
  })
)

const setFetch = (impl: unknown) => {
  ;(global as unknown as { fetch: unknown }).fetch = impl
}

const lastCall = (calls: string[]) => calls[calls.length - 1]

describe('gallery page', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  it('shows skeletons first, then the artworks and a result count', async () => {
    const { impl, calls } = createFetchStub({ artworks: CATALOGUE })
    setFetch(impl)

    render(<Home />)

    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)

    await waitFor(() => expect(screen.getByText('The Great Wave')).toBeTruthy())
    expect(screen.getByText('Showing 3 of 3 artworks')).toBeTruthy()
    expect(lastCall(calls)).toBe('/api/artworks?limit=12')
  })

  it('renders each card with artist and date metadata and an accessible name', async () => {
    setFetch(createFetchStub({ artworks: CATALOGUE }).impl)

    render(<Home />)
    await waitFor(() => expect(screen.getByText('Wheat Field with Cypresses')).toBeTruthy())

    const card = screen.getByRole('button', {
      name: 'View details for Wheat Field with Cypresses by Vincent van Gogh',
    })
    expect(within(card).getByText('Vincent van Gogh')).toBeTruthy()
    expect(within(card).getByText('1889')).toBeTruthy()
    expect(within(card).getByRole('img')).toHaveProperty(
      'alt',
      'Wheat Field with Cypresses by Vincent van Gogh'
    )
  })

  it('debounces typing into a single request and encodes the term', async () => {
    const { impl, calls } = createFetchStub({ artworks: CATALOGUE })
    setFetch(impl)

    render(<Home />)
    await waitFor(() => expect(calls).toHaveLength(1))

    const input = screen.getByLabelText('Search the collection')
    for (const value of ['v', 'va', 'van', 'van g']) {
      fireEvent.change(input, { target: { value } })
    }

    await waitFor(() => expect(calls).toHaveLength(2))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
    })

    expect(calls).toHaveLength(2)
    expect(lastCall(calls)).toBe('/api/artworks?limit=12&search=van+g')
  })

  it('filters by department chip and clears it when pressed again', async () => {
    const { impl, calls } = createFetchStub({ artworks: MANY })
    setFetch(impl)

    render(<Home />)
    await waitFor(() => expect(screen.getByText('Work 0')).toBeTruthy())

    const chip = screen.getByRole('button', { name: /Asian Art/ })
    fireEvent.click(chip)

    await waitFor(() => expect(lastCall(calls)).toContain('department=Asian+Art'))
    await waitFor(() => expect(screen.queryByText('Work 0')).toBeNull())
    expect(chip.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(chip)
    await waitFor(() => expect(lastCall(calls)).not.toContain('department='))
  })

  it('appends the next page when Load more is pressed and hides the button at the end', async () => {
    const { impl, calls } = createFetchStub({ artworks: MANY })
    setFetch(impl)

    render(<Home />)
    await waitFor(() => expect(screen.getByText('Work 0')).toBeTruthy())
    expect(screen.queryByText('Work 15')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() => expect(screen.getByText('Work 15')).toBeTruthy())
    expect(lastCall(calls)).toContain('offset=12')
    expect(screen.getByText('Showing 20 of 20 artworks')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull())
  })

  it('shows an empty state with a way back when nothing matches', async () => {
    const { impl } = createFetchStub({ artworks: CATALOGUE })
    setFetch(impl)

    render(<Home />)
    await waitFor(() => expect(screen.getByText('The Great Wave')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('Search the collection'), {
      target: { value: 'nothing at all' },
    })

    await waitFor(() => expect(screen.getByText('Nothing here yet')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(screen.getByText('The Great Wave')).toBeTruthy())
  })

  it('surfaces an error, clears stale results, and recovers on retry', async () => {
    const working = createFetchStub({ artworks: CATALOGUE })
    setFetch(working.impl)

    render(<Home />)
    await waitFor(() => expect(screen.getByText('The Great Wave')).toBeTruthy())

    setFetch(jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })))
    fireEvent.change(screen.getByLabelText('Search the collection'), {
      target: { value: 'wave' },
    })

    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeTruthy())
    expect(screen.queryByText('The Great Wave')).toBeNull()

    setFetch(working.impl)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(screen.getByText('The Great Wave')).toBeTruthy())
  })

  it('survives a response whose body is not the expected shape', async () => {
    setFetch(jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })))

    render(<Home />)

    await waitFor(() => expect(screen.getByText('Nothing here yet')).toBeTruthy())
  })

  it('flags a query that the language model expanded', async () => {
    setFetch(createFetchStub({ artworks: CATALOGUE, interpretedBy: 'model' }).impl)

    render(<Home />)

    await waitFor(() => expect(screen.getByTitle('Expanded by Claude')).toBeTruthy())
  })

  it('credits the source the catalogue came from', async () => {
    setFetch(createFetchStub({ artworks: CATALOGUE }).impl)

    render(<Home />)

    await waitFor(() => expect(screen.getByText('Stub collection')).toBeTruthy())
  })
})
