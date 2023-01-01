import { useEffect, useRef } from 'react'
import { displayYear, type Artwork } from '../lib/artwork'
import styles from '../styles/Gallery.module.css'
import { ArtworkImage } from './ArtworkImage'

type Props = {
  artwork: Artwork | null
  onClose: () => void
}

type DetailRow = { label: string; value: string }

const rowsFor = (artwork: Artwork): DetailRow[] =>
  [
    { label: 'Artist', value: artwork.artist },
    { label: 'Nationality', value: artwork.artistNationality },
    { label: 'Date', value: displayYear(artwork) },
    { label: 'Medium', value: artwork.medium },
    { label: 'Dimensions', value: artwork.dimensions },
    { label: 'Department', value: artwork.department },
    { label: 'Culture', value: artwork.culture },
    { label: 'Credit', value: artwork.creditLine },
  ].filter((row) => row.value)

/**
 * Detail view. Modal behaviour is hand-rolled rather than pulled in as a
 * dependency, but the accessibility contract is not skipped: the dialog takes
 * focus on open, Escape and backdrop clicks close it, Tab is trapped inside,
 * and focus returns to whatever opened it.
 */
export const ArtworkDialog = ({ artwork, onClose }: Props) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!artwork) return

    openerRef.current = document.activeElement
    dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      ;(openerRef.current as HTMLElement | null)?.focus?.()
    }
  }, [artwork, onClose])

  if (!artwork) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogImage}>
          <ArtworkImage artwork={artwork} sizes="(max-width: 900px) 92vw, 520px" priority />
        </div>

        <div className={styles.dialogBody}>
          <h2 className={styles.dialogTitle} id="dialog-title">
            {artwork.title}
          </h2>

          <dl className={styles.dialogFacts}>
            {rowsFor(artwork).map((row) => (
              <div key={row.label} className={styles.dialogFact}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>

          {artwork.tags.length > 0 && (
            <ul className={styles.tagList}>
              {artwork.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className={styles.dialogActions}>
            {artwork.sourceUrl && (
              <a
                className={styles.linkButton}
                href={artwork.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View at the source
              </a>
            )}
            <button type="button" className={styles.closeButton} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
