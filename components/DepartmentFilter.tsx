import type { Facet } from '../lib/search/filter'
import styles from '../styles/Gallery.module.css'

type Props = {
  facets: Facet[]
  selected: string
  onSelect: (value: string) => void
}

export const DepartmentFilter = ({ facets, selected, onSelect }: Props) => {
  if (facets.length === 0) return null

  return (
    <div className={styles.chips} role="group" aria-label="Filter by department">
      <button
        type="button"
        className={styles.chip}
        aria-pressed={selected === ''}
        onClick={() => onSelect('')}
      >
        All
      </button>

      {facets.map((facet) => (
        <button
          key={facet.value}
          type="button"
          className={styles.chip}
          aria-pressed={selected === facet.value}
          onClick={() => onSelect(selected === facet.value ? '' : facet.value)}
        >
          {facet.value}
          <span className={styles.chipCount}>{facet.count}</span>
        </button>
      ))}
    </div>
  )
}
