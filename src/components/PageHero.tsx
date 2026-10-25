import type { ReactNode } from 'react'
import type { HeroPage } from '../teams/model'
import { useHeroPhoto } from '../teams/store'
import { useTeamState } from '../teams/TeamProvider'
import { DEFAULT_HERO, heroSrcSet, type HeroImage } from './heroImages'

type Props = {
  /** A page with a photo the team can change, or a fixed photo. */
  page?: HeroPage
  image?: HeroImage
  /** Where the photo is cropped, as CSS object-position. */
  focus?: string
  tag: ReactNode
  title?: ReactNode
  sub?: ReactNode
  /** Big outlined number on the right, like the player count on the website. */
  count?: number | string
  countLabel?: string
  /** Shown above the tag, e.g. a back link. */
  top?: ReactNode
  actions?: ReactNode
  compact?: boolean
}

/** Full-width photo banner in the style of the team website's page heroes. */
export function PageHero({ image, page, focus, tag, title, sub, count, countLabel, top, actions, compact }: Props) {
  const team = useTeamState()
  const photo = useHeroPhoto(team.status === 'ready' ? team.team.id : null, page)
  const fallback = image ? { image, focus } : page ? DEFAULT_HERO[page] : DEFAULT_HERO.home
  const srcSet = photo ? `${photo.small} 960w, ${photo.large} 1920w` : heroSrcSet(fallback.image)
  const position = photo ? photo.focus : fallback.focus
  return (
    <header className={`hero ${compact ? 'hero-compact' : ''}`}>
      <img
        key={photo ? photo.large : fallback.image}
        className="hero-img"
        srcSet={srcSet}
        sizes="100vw"
        alt=""
        style={position ? { objectPosition: position } : undefined}
      />
      <div className="hero-shade" />
      <div className="hero-inner">
        <div className="hero-text">
          {top}
          <div className="tag">{tag}</div>
          {title && <h1 className="hero-title">{title}</h1>}
          {sub && <p className="hero-sub">{sub}</p>}
        </div>
        {(count !== undefined || actions) && (
          <div className="hero-side">
            {count !== undefined && (
              <div className="hero-count">
                <div className="outline-num">{count}</div>
                {countLabel && <div className="hero-count-label">{countLabel}</div>}
              </div>
            )}
            {actions && <div className="hero-actions">{actions}</div>}
          </div>
        )}
      </div>
    </header>
  )
}
