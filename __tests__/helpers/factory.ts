import { makeArtwork, type Artwork } from '../../lib/artwork'

export const artwork = (overrides: Partial<Artwork> & { id: string }): Artwork =>
  makeArtwork({ title: `Untitled ${overrides.id}`, ...overrides })

export const CATALOGUE: Artwork[] = [
  artwork({
    id: 'a1',
    title: 'Wheat Field with Cypresses',
    artist: 'Vincent van Gogh',
    year: 1889,
    yearDisplay: '1889',
    medium: 'Oil on canvas',
    classification: 'Paintings',
    department: 'European Paintings',
    tags: ['Landscapes', 'Trees'],
    imageUrl: 'https://images.example.org/wheat.jpg',
  }),
  artwork({
    id: 'a2',
    title: 'The Great Wave',
    artist: 'Katsushika Hokusai',
    year: 1831,
    yearDisplay: 'ca. 1830-32',
    medium: 'Woodblock print',
    classification: 'Prints',
    department: 'Asian Art',
    tags: ['Seascapes', 'Boats'],
    imageUrl: 'https://images.example.org/wave.jpg',
  }),
  artwork({
    id: 'a3',
    title: 'The Harvesters',
    artist: 'Pieter Bruegel the Elder',
    year: 1565,
    medium: 'Oil on wood',
    classification: 'Paintings',
    department: 'European Paintings',
    tags: ['Landscapes', 'Harvest'],
    imageUrl: 'https://images.example.org/harvest.jpg',
  }),
]
