import Head from 'next/head'
import { useState } from 'react'
import { ArtworkDialog } from '../components/ArtworkDialog'
import { ArtworkGrid } from '../components/ArtworkGrid'
import { DepartmentFilter } from '../components/DepartmentFilter'
import { SearchBar } from '../components/SearchBar'
import { StateMessage } from '../components/StateMessage'
import { useArtworkSearch } from '../hooks/useArtworkSearch'
import type { Artwork } from '../lib/artwork'
import styles from '../styles/Gallery.module.css'

const PAGE_SIZE = 12

const countLabel = (shown: number, total: number) =>
  total === 0
    ? 'No artworks match this search'
    : `Showing ${shown} of ${total} artwork${total === 1 ? '' : 's'}`

/**
 * Composition only. Every decision about *what* to show lives in
 * `useArtworkSearch`; this component decides *how* it is laid out.
 */
const Home = () => {
  const gallery = useArtworkSearch(PAGE_SIZE)
  const [selected, setSelected] = useState<Artwork | null>(null)

  const firstLoad = gallery.status === 'loading' && gallery.artworks.length === 0

  return (
    <div className={styles.page}>
      <Head>
        <title>Art Gallery — browse the collection</title>
        <meta
          name="description"
          content="Browse and search a curated catalogue of public-domain artworks."
        />
      </Head>

      <header className={styles.header}>
        <p className={styles.eyebrow}>Open collection</p>
        <h1 className={styles.title}>Art Gallery</h1>
        <p className={styles.subtitle}>
          A curated catalogue of public-domain works. Search by title, artist, medium or period — or
          just describe what you would like to see.
        </p>
      </header>

      <section className={styles.controls}>
        <SearchBar
          value={gallery.search}
          onChange={gallery.setSearch}
          interpreted={gallery.interpretedBy === 'model'}
          hint={
            gallery.status === 'error'
              ? gallery.error
              : countLabel(gallery.artworks.length, gallery.total)
          }
        />

        <DepartmentFilter
          facets={gallery.departments}
          selected={gallery.department}
          onSelect={gallery.setDepartment}
        />
      </section>

      <main className={styles.main}>
        {gallery.status === 'error' && gallery.artworks.length === 0 ? (
          <StateMessage
            title="Something went wrong"
            body={gallery.error}
            action={{ label: 'Try again', onClick: gallery.retry }}
          />
        ) : !firstLoad && gallery.artworks.length === 0 ? (
          <StateMessage
            title="Nothing here yet"
            body="No artwork matches that search. Try a broader term, or clear the department filter."
            action={{
              label: 'Clear filters',
              onClick: () => {
                gallery.setSearch('')
                gallery.setDepartment('')
              },
            }}
          />
        ) : (
          <ArtworkGrid
            artworks={gallery.artworks}
            onSelect={setSelected}
            skeletonCount={firstLoad ? PAGE_SIZE : gallery.status === 'loadingMore' ? PAGE_SIZE : 0}
          />
        )}

        {gallery.hasMore && gallery.status !== 'loadingMore' && (
          <div className={styles.loadMoreRow}>
            <button type="button" className={styles.loadMore} onClick={gallery.loadMore}>
              Load more
            </button>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>{gallery.attribution || 'Public-domain artwork metadata'}</p>
      </footer>

      <ArtworkDialog artwork={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

export default Home
