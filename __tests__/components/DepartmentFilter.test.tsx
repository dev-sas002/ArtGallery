/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { DepartmentFilter } from '../../components/DepartmentFilter'

const FACETS = [
  { value: 'European Paintings', count: 28 },
  { value: 'Asian Art', count: 3 },
]

describe('DepartmentFilter', () => {
  it('renders nothing when there are no facets', () => {
    const { container } = render(<DepartmentFilter facets={[]} selected="" onSelect={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('marks the active chip and reports selections', () => {
    const onSelect = jest.fn()
    render(<DepartmentFilter facets={FACETS} selected="Asian Art" onSelect={onSelect} />)

    expect(screen.getByRole('button', { name: /Asian Art/ }).getAttribute('aria-pressed')).toBe(
      'true'
    )
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('28')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /European Paintings/ }))
    expect(onSelect).toHaveBeenCalledWith('European Paintings')
  })

  it('deselects the active chip and resets via All', () => {
    const onSelect = jest.fn()
    render(<DepartmentFilter facets={FACETS} selected="Asian Art" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /Asian Art/ }))
    expect(onSelect).toHaveBeenLastCalledWith('')

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onSelect).toHaveBeenLastCalledWith('')
  })
})
