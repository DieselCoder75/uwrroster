import type { Player } from './model'

// Player photos from the team website, in public/img/players/<slug>.webp.
const PHOTOS = new Set([
  'alisasalminen',
  'almanevalainen',
  'cecilianguyen',
  'ellaparviainen',
  'helikoskinen',
  'hillasavolainen',
  'ilonahasanen',
  'jemmilevonen',
  'juliamantyla',
  'kiraslotte',
  'maijumarttinen',
  'maripesola',
  'meriluukko',
  'mettekoski',
  'mirakoskinen',
  'neakeranen',
  'nuppuuusitalo',
  'oliviahellsten',
  'paulakorkeakangas',
  'saijajokinen',
  'sedailksozjussila',
  'thelmabjork',
])

/** "Seda Ilksöz-Jussila" -> "sedailksozjussila" */
export function photoSlug(p: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${p.firstName}${p.lastName}`
    .normalize('NFD')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase()
}

export function playerPhoto(p: Pick<Player, 'firstName' | 'lastName'>): string | null {
  const slug = photoSlug(p)
  return PHOTOS.has(slug) ? `/img/players/${slug}.webp` : null
}
