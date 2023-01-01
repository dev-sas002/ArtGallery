/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { ArtworkImage } from '../../components/ArtworkImage'
import { artwork, CATALOGUE } from '../helpers/factory'

const frame = () => document.querySelector('[data-state]') as HTMLElement

describe('ArtworkImage', () => {
  it('starts in the loading state and reveals the image once it decodes', () => {
    render(<ArtworkImage artwork={CATALOGUE[0]} sizes="300px" />)

    expect(frame().getAttribute('data-state')).toBe('loading')

    fireEvent.load(screen.getByRole('img'))
    expect(frame().getAttribute('data-state')).toBe('loaded')
  })

  it('shows a caption instead of a broken image when the request fails', () => {
    render(<ArtworkImage artwork={CATALOGUE[0]} sizes="300px" />)

    fireEvent.error(screen.getByRole('img'))

    expect(frame().getAttribute('data-state')).toBe('failed')
    expect(screen.getByLabelText('Image unavailable')).toBeTruthy()
  })

  it('never requests an image when the record has no URL', () => {
    render(<ArtworkImage artwork={artwork({ id: 'x', imageUrl: '' })} sizes="300px" />)

    expect(frame().getAttribute('data-state')).toBe('failed')
    expect(screen.queryByRole('img', { name: /by/ })).toBeNull()
  })
})
