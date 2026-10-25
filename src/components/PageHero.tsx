import type { ReactNode } from 'react'
import { heroSrcSet, type HeroImage } from './heroImages'

type Props = {
  image: HeroImage
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
export function PageHero({ image, focus, tag, title, sub, count, countLabel, top, actions, compact }: Props) {
  return (
    <header className={`hero ${compact ? 'hero-compact' : ''}`}>
      <img className="hero-img" srcSet={heroSrcSet(image)} sizes="100vw" alt="" style={focus ? { objectPosition: focus } : undefined} />
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
