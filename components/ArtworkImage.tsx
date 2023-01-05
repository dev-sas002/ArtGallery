import Image from 'next/image'
import { useState } from 'react'
import type { Artwork } from '../lib/artwork'
import styles from '../styles/Gallery.module.css'

type Props = {
  artwork: Artwork
  /** Tells the image optimiser how wide the frame will be at each breakpoint. */
  sizes: string
  priority?: boolean
}

/**
 * A framed, contained artwork image.
 *
 * `object-fit: contain` on a fixed-ratio frame is a deliberate choice: cropping
 * a painting to fill a card is the wrong default for a gallery, and a fixed
 * frame keeps the grid free of layout shift while images stream in.
 */
export const ArtworkImage = ({ artwork, sizes, priority = false }: Props) => {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>(
    artwork.imageUrl ? 'loading' : 'failed'
  )

  return (
    <div className={styles.frame} data-state={state}>
      {state !== 'failed' && (
        <Image
          src={artwork.imageUrl}
          alt={`${artwork.title} by ${artwork.artist}`}
          layout="fill"
          objectFit="contain"
          sizes={sizes}
          priority={priority}
          className={styles.image}
          onLoadingComplete={() => setState('loaded')}
          onError={() => setState('failed')}
        />
      )}

      {state === 'failed' && (
        <span className={styles.frameFallback} role="img" aria-label="Image unavailable">
          Image unavailable
        </span>
      )}
    </div>
  )
}
