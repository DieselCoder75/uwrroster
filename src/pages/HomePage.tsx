import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHero } from '../components/PageHero'
import { useI18n } from '../i18n'
import { daysUntil, formatRange, todayIso } from '../lib/dates'
import { useTournaments } from '../tournaments/store'

export function HomePage() {
  const { t, lang } = useI18n()
  const auth = useAuth()
  const email = auth.status === 'coach' ? auth.email : ''
  const tournaments = useTournaments()

  const today = todayIso()
  // Tournaments that haven't ended yet, soonest first.
  const upcoming =
    tournaments.status === 'ready'
      ? tournaments.data
          .filter((x) => x.startDate && (x.endDate || x.startDate) >= today)
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
      : []

  return (
    <div className="stack">
      <PageHero
        image="em-pronssimitalistit"
        tag={t('home.tag')}
        sub={t('home.intro')}
      />

      <section className="stack">
        <div className="section-head">
          <h2>{t('home.upcoming')}</h2>
          <Link to="/tournaments" className="btn btn-small">
            {t('home.allTournaments')} →
          </Link>
        </div>

        {tournaments.status === 'loading' && <p className="muted">{t('app.loading')}</p>}
        {tournaments.status === 'error' && <p className="error">{t('app.error', { message: tournaments.message })}</p>}
        {tournaments.status === 'ready' && upcoming.length === 0 && <p className="muted">{t('home.noUpcoming')}</p>}

        <ul className="upcoming">
          {upcoming.map((tour) => {
            const days = daysUntil(tour.startDate, today)
            return (
              <li key={tour.id}>
                <Link to={`/tournaments/${tour.id}`} className="card upcoming-row">
                  <span className="days-left">
                    {days > 0 ? (
                      <>
                        <span className="outline-num days-num">{days}</span>
                        <span className="days-label">{t(days === 1 ? 'home.day' : 'home.days')}</span>
                      </>
                    ) : (
                      <span className="days-label now">{t('home.ongoing')}</span>
                    )}
                  </span>
                  <span className="upcoming-text">
                    <span className="eyebrow">{formatRange(tour.startDate, tour.endDate, lang)}</span>
                    <span className="upcoming-name">{tour.name}</span>
                    <span className="muted small">
                      {[tour.location, t('tournaments.squadCount', { count: tour.squad.length, size: tour.squadSize })]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="upcoming-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <p className="muted small">{t('home.signedIn', { email })}</p>
    </div>
  )
}
