import { displayYear, type Artwork } from '../lib/artwork'
import styles from '../styles/Gallery.module.css'
import { ArtworkImage } from './ArtworkImage'

type Props = {
  artwork: Artwork
  onSelect: (artwork: Artwork) => void
  priority?: boolean
}

const CARD_SIZES = '(max-width: 640px) 92vw, (max-width: 1080px) 44vw, 300px'

export const ArtworkCard = ({ artwork, onSelect, priority }: Props) => (
  <article className={styles.card}>
    <button
      type="button"
      className={styles.cardButton}
      onClick={() => onSelect(artwork)}
      aria-label={`View details for ${artwork.title} by ${artwork.artist}`}
    >
      <ArtworkImage artwork={artwork} sizes={CARD_SIZES} priority={priority} />

      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{artwork.title}</h2>
        <p className={styles.cardArtist}>{artwork.artist}</p>
        <p className={styles.cardMeta}>
          <span>{displayYear(artwork)}</span>
          {artwork.classification && <span>{artwork.classification}</span>}
        </p>
      </div>
    </button>
  </article>
)
