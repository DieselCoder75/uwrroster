/** Photos from the team website, in public/img as <name>-640.webp and <name>-1280.webp. */
export type HeroImage =
  | 'julia-vs-meri'
  | '20250927-172557'
  | 'pelaajat'
  | 'em-pronssimitalistit'
  | 'keskikentta'
  | 'naisten-joukkue-altaalla'
  | 'tiukkakarvauspohjassa'
  | 'pohjassaseisomassa'

export function heroSrcSet(image: HeroImage): string {
  return `/img/${image}-640.webp 640w, /img/${image}-1280.webp 1280w`
}
