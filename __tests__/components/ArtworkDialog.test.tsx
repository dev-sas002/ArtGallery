/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { ArtworkDialog } from '../../components/ArtworkDialog'
import { artwork, CATALOGUE } from '../helpers/factory'

const WAVE = CATALOGUE[1]

describe('ArtworkDialog', () => {
  it('renders nothing when no artwork is selected', () => {
    const { container } = render(<ArtworkDialog artwork={null} onClose={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the metadata the source provided and omits empty fields', () => {
    render(<ArtworkDialog artwork={WAVE} onClose={jest.fn()} />)

    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('The Great Wave')).toBeTruthy()
    expect(screen.getByText('Woodblock print')).toBeTruthy()
    expect(screen.getByText('ca. 1830-32')).toBeTruthy()
    expect(screen.getByText('Seascapes')).toBeTruthy()
    // No credit line on the fixture, so the row must not appear.
    expect(screen.queryByText('Credit')).toBeNull()
  })

  it('falls back to "Date unknown" and hides the source link when absent', () => {
    render(<ArtworkDialog artwork={artwork({ id: 'x', title: 'Fragment' })} onClose={jest.fn()} />)

    expect(screen.getByText('Date unknown')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('takes focus on open and restores it to the opener on close', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const { rerender } = render(<ArtworkDialog artwork={WAVE} onClose={jest.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))

    rerender(<ArtworkDialog artwork={null} onClose={jest.fn()} />)
    expect(document.activeElement).toBe(opener)

    opener.remove()
  })

  it('closes on Escape, on the backdrop, and on the close button', () => {
    const onClose = jest.fn()
    const { container } = render(<ArtworkDialog artwork={WAVE} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(container.firstChild as Element)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('does not close when the dialog itself is clicked', () => {
    const onClose = jest.fn()
    render(<ArtworkDialog artwork={WAVE} onClose={onClose} />)

    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('traps Tab inside the dialog in both directions', () => {
    const withLink = { ...WAVE, sourceUrl: 'https://example.org/wave' }
    render(<ArtworkDialog artwork={withLink} onClose={jest.fn()} />)

    const link = screen.getByRole('link')
    const close = screen.getByRole('button', { name: 'Close' })

    close.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(link)

    link.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(close)
  })

  it('ignores unrelated keys', () => {
    const onClose = jest.fn()
    render(<ArtworkDialog artwork={WAVE} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'a' })

    expect(onClose).not.toHaveBeenCalled()
  })
})
