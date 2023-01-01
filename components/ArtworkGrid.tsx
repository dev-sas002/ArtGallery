import type { Artwork } from '../lib/artwork'
import styles from '../styles/Gallery.module.css'
import { ArtworkCard } from './ArtworkCard'

type Props = {
  artworks: Artwork[]
  onSelect: (artwork: Artwork) => void
  /** Placeholder cards appended while a request is in flight. */
  skeletonCount?: number
}

export const ArtworkGrid = ({ artworks, onSelect, skeletonCount = 0 }: Props) => (
  <div className={styles.grid}>
    {artworks.map((artwork, index) => (
      <ArtworkCard
        key={artwork.id}
        artwork={artwork}
        onSelect={onSelect}
        // Only the first row is worth pre-loading; the rest stay lazy.
        priority={index < 4}
      />
    ))}

    {Array.from({ length: skeletonCount }, (_, index) => (
      <div key={`skeleton-${index}`} className={styles.skeletonCard} aria-hidden="true">
        <div className={styles.skeletonFrame} />
        <div className={styles.skeletonLine} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
      </div>
    ))}
  </div>
)
