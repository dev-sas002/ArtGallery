#!/usr/bin/env node
/**
 * Regenerates data/catalog.json from the Metropolitan Museum of Art
 * Collection API (https://metmuseum.github.io/) — a public, key-less,
 * CC0-licensed source of open-access object records.
 *
 * Only public-domain objects that expose a working image are kept, so the
 * bundled catalogue is safe to ship and every card in the UI has artwork.
 *
 *   node scripts/build-catalog.mjs [--per-query 8] [--out data/catalog.json]
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const API = 'https://collectionapi.metmuseum.org/public/collection/v1'

/**
 * The catalogue is curated by artist so the bundled gallery reads like a
 * collection rather than a random sample. `match` is the surname used to
 * confirm the Met search actually returned that artist's work — the Met
 * search endpoint is fuzzy and will happily hand back a neighbour.
 */
const QUERIES = [
  { artist: 'Vincent van Gogh', match: 'Gogh' },
  { artist: 'Claude Monet', match: 'Monet' },
  { artist: 'Johannes Vermeer', match: 'Vermeer' },
  { artist: 'Rembrandt', match: 'Rembrandt' },
  { artist: 'Edgar Degas', match: 'Degas' },
  { artist: 'Auguste Renoir', match: 'Renoir' },
  { artist: 'Paul Cezanne', match: 'Cézanne' },
  { artist: 'Georges Seurat', match: 'Seurat' },
  { artist: 'Mary Cassatt', match: 'Cassatt' },
  { artist: 'Edouard Manet', match: 'Manet' },
  { artist: 'Paul Gauguin', match: 'Gauguin' },
  { artist: 'Camille Pissarro', match: 'Pissarro' },
  { artist: 'Gustave Courbet', match: 'Courbet' },
  { artist: 'Jacques Louis David', match: 'David' },
  { artist: 'El Greco', match: 'Greco' },
  { artist: 'Caravaggio', match: 'Caravaggio' },
  { artist: 'Pieter Bruegel', match: 'Bruegel' },
  { artist: 'Winslow Homer', match: 'Homer' },
  { artist: 'John Singer Sargent', match: 'Sargent' },
  { artist: 'Thomas Cole', match: 'Cole' },
  { artist: 'Albert Bierstadt', match: 'Bierstadt' },
  { artist: 'Frederic Edwin Church', match: 'Church' },
  { artist: 'Katsushika Hokusai', match: 'Hokusai' },
  { artist: 'Utagawa Hiroshige', match: 'Hiroshige' },
  { artist: 'Joseph Mallord William Turner', match: 'Turner' },
  { artist: 'Francisco de Goya', match: 'Goya' },
  { artist: 'Peter Paul Rubens', match: 'Rubens' },
  { artist: 'Anthony van Dyck', match: 'Dyck' },
  { artist: "Georgia O'Keeffe", match: "O'Keeffe" },
  { artist: 'Jan Steen', match: 'Steen' },
]

const args = process.argv.slice(2)
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const PER_QUERY = Number(argOf('per-query', 6))
const OUT = resolve(process.cwd(), argOf('out', 'data/catalog.json'))

const CANDIDATES_PER_QUERY = 40
const REQUEST_DELAY_MS = 200

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Runs a Met search and returns the object ids, tolerating a null result. */
async function searchIds(params) {
  const search = await getJson(`${API}/search?${new URLSearchParams(params)}`)
  return search.objectIDs || []
}

async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    if (response.ok) return response.json()
    if (response.status === 403 || response.status === 429) {
      await sleep(1500 * (attempt + 1))
      continue
    }
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  throw new Error(`gave up on ${url}`)
}

async function imageIsReachable(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok && (response.headers.get('content-type') || '').startsWith('image/')
  } catch {
    return false
  }
}

const titleCase = (value) =>
  value.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())

function toArtwork(object) {
  const tags = (object.tags || []).map((tag) => tag.term).filter(Boolean)
  return {
    id: `met-${object.objectID}`,
    title: object.title?.trim() || 'Untitled',
    artist: object.artistDisplayName?.trim() || 'Unknown artist',
    artistNationality: object.artistNationality?.trim() || '',
    year: Number(object.objectBeginDate) || 0,
    yearDisplay: object.objectDate?.trim() || '',
    medium: object.medium?.trim() || '',
    classification: object.classification?.trim() || '',
    department: object.department?.trim() || '',
    culture: object.culture?.trim() || '',
    dimensions: object.dimensions?.trim() || '',
    creditLine: object.creditLine?.trim() || '',
    tags: Array.from(new Set(tags.map(titleCase))).slice(0, 8),
    imageUrl: object.primaryImageSmall,
    imageUrlLarge: object.primaryImage || object.primaryImageSmall,
    sourceUrl: object.objectURL,
  }
}

async function main() {
  const seen = new Set()
  const artworks = []

  for (const { artist, match } of QUERIES) {
    // `artistOrCulture` is the precise search, but it returns nothing for some
    // names; a plain keyword search is the fallback. Either way the results are
    // fuzzy, so every object is re-checked against `match` below.
    let ids = await searchIds({ q: artist, artistOrCulture: 'true' })
    if (ids.length < 5) ids = await searchIds({ q: artist })

    process.stderr.write(`\n# ${artist}: ${ids.length} candidates\n`)
    let kept = 0

    for (const id of ids.slice(0, CANDIDATES_PER_QUERY)) {
      if (kept >= PER_QUERY) break
      if (seen.has(id)) continue
      seen.add(id)

      let object
      try {
        object = await getJson(`${API}/objects/${id}`)
      } catch (error) {
        process.stderr.write(`  ! ${id}: ${error.message}\n`)
        continue
      }

      if (!object.isPublicDomain || !object.primaryImageSmall) continue
      if (!(object.artistDisplayName || '').includes(match)) continue
      if (!(await imageIsReachable(object.primaryImageSmall))) {
        process.stderr.write(`  ! unreachable image for ${id}\n`)
        continue
      }

      artworks.push(toArtwork(object))
      kept += 1
      process.stderr.write(`  . ${object.artistDisplayName} — ${object.title}\n`)
      await sleep(REQUEST_DELAY_MS)
    }
  }

  artworks.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title))

  await writeFile(OUT, `${JSON.stringify(artworks, null, 2)}\n`, 'utf8')
  process.stderr.write(`\nwrote ${artworks.length} artworks to ${OUT}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`)
  process.exit(1)
})
