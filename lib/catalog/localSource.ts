import catalog from '../../data/catalog.json'
import type { Artwork } from '../artwork'
import type { ArtworkSource } from './source'

/**
 * The default source: a catalogue of public-domain works bundled with the
 * repository. It needs no network and no configuration, which is what makes
 * `docker compose up` produce a populated gallery on first boot.
 *
 * Regenerate it with `npm run seed`.
 */
export const createLocalSource = (): ArtworkSource => ({
  name: 'local',
  attribution: 'The Metropolitan Museum of Art Open Access (CC0)',
  list: async () => catalog as Artwork[],
})
