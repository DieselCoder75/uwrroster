import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { heroSrcSet, type HeroImage } from '../components/heroImages'
import { PageHero } from '../components/PageHero'
import { useI18n } from '../i18n'
import { formatRange } from '../lib/dates'
import { useTournaments } from '../tournaments/store'

export function HomePage() {
  const { t, lang } = useI18n()
  const auth = useAuth()
  const email = auth.status === 'coach' ? auth.email : ''
  const tournaments = useTournaments()
  const now = useNow()

  const d = new Date(now)
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const next =
    tournaments.status === 'ready'
      ? [...tournaments.data].filter((x) => x.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
      : undefined

  const tiles: { to: string; image: HeroImage; title: string; desc: string }[] = [
    { to: '/players', image: 'pelaajat', title: t('nav.players'), desc: t('home.playersDesc') },
    { to: '/tournaments', image: 'em-pronssimitalistit', title: t('nav.tournaments'), desc: t('home.tournamentsDesc') },
    { to: '/coaches', image: 'naisten-joukkue-altaalla', title: t('nav.coaches'), desc: t('home.coachesDesc') },
  ]

  return (
    <div className="stack">
      <PageHero
        image="20250927-172557"
        tag={t('hero.tag')}
        title={
          <>
            {t('home.heroTitle1')} <span className="accent">{t('home.heroTitle2')}</span>
          </>
        }
        sub={
          next ? (
            <Link to={`/tournaments/${next.id}`}>
              {t('home.next')} · <span className="accent">{next.name}</span>
              <span className="hero-sub-detail">
                {[formatRange(next.startDate, next.endDate, lang), next.location].filter(Boolean).join(' · ')}
              </span>
            </Link>
          ) : (
            t('home.intro')
          )
        }
      />

      {next && <Countdown target={next.startDate} now={now} />}

      <ul className="feature-grid">
        {tiles.map((tile) => (
          <li key={tile.to}>
            <Link to={tile.to} className="feature">
              <img srcSet={heroSrcSet(tile.image)} sizes="(min-width: 900px) 33vw, 100vw" alt="" />
              <span className="feature-shade" />
              <span className="feature-text">
                <span className="bar" />
                <span className="feature-title">{tile.title}</span>
                <span className="feature-desc">{tile.desc}</span>
                <span className="feature-more">{t('home.open')} →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="muted small">{t('home.signedIn', { email })}</p>
    </div>
  )
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

/** Days, hours, minutes and seconds to the start of a tournament, like the countdown on the team website. */
function Countdown({ target, now }: { target: string; now: number }) {
  const { t } = useI18n()
  const [y, m, d] = target.split('-').map(Number)
  const left = Math.max(0, Math.floor((new Date(y, m - 1, d).getTime() - now) / 1000))
  const parts = [
    { value: Math.floor(left / 86400), label: t('home.days'), accent: true },
    { value: Math.floor(left / 3600) % 24, label: t('home.hours') },
    { value: Math.floor(left / 60) % 60, label: t('home.minutes') },
    { value: left % 60, label: t('home.seconds'), accent: true },
  ]
  return (
    <div className="countdown" role="timer">
      {parts.map((p) => (
        <div key={p.label} className="countdown-part">
          <div className={`countdown-num ${p.accent ? 'accent' : ''}`}>{p.value}</div>
          <div className="countdown-label">{p.label}</div>
        </div>
      ))}
    </div>
  )
}
