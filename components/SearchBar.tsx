import styles from '../styles/Gallery.module.css'

type Props = {
  value: string
  onChange: (value: string) => void
  /** Shown when the current query was expanded by the language model. */
  interpreted: boolean
  hint: string
}

export const SearchBar = ({ value, onChange, interpreted, hint }: Props) => (
  <div className={styles.searchRow}>
    <label className={styles.searchLabel} htmlFor="search">
      Search the collection
    </label>

    <div className={styles.searchField}>
      <input
        id="search"
        className={styles.searchInput}
        type="search"
        value={value}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Try: van gogh, artist:vermeer, seascapes before 1800"
        aria-describedby="search-hint"
      />
      {interpreted && (
        <span className={styles.aiBadge} title="Expanded by Claude">
          AI
        </span>
      )}
    </div>

    <p className={styles.searchHint} id="search-hint">
      {hint}
    </p>
  </div>
)
