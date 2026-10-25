import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { useI18n } from '../i18n'
import { daysUntil, formatRange, todayIso } from '../lib/dates'
import { TournamentEditor } from './TournamentEditor'
import { useTournaments } from './store'

export function TournamentsPage() {
  const { t, lang } = useI18n()
  const state = useTournaments()
  const navigate = useNavigate()
  const today = todayIso()
  // Days until the tournament starts; nothing for ongoing and past ones.
  const days = (tour: { startDate: string }) => (tour.startDate ? daysUntil(tour.startDate, today) : 0)
  const [adding, setAdding] = useState(false)

  if (state.status === 'loading') return <p className="muted">{t('app.loading')}</p>
  if (state.status === 'error') return <p className="error">{t('app.error', { message: state.message })}</p>

  return (
    <div className="stack">
      <PageHero
        image="20250927-172557"
        tag={t('tournaments.tag')}
        title={t('tournaments.title')}
        count={state.data.length}
        countLabel={t('tournaments.countLabel')}
        actions={
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            + {t('tournaments.add')}
          </button>
        }
      />

      {state.data.length === 0 && <p className="muted">{t('tournaments.empty')}</p>}

      <ul className="tiles">
        {state.data.map((tour) => (
          <li key={tour.id}>
            <Link to={`/tournaments/${tour.id}`} className="tile card tour-tile">
              {days(tour) > 0 && (
                <span className="outline-num tile-num" title={t('tournaments.daysTo', { count: days(tour) })}>
                  {days(tour)}
                </span>
              )}
              <span className="bar" />
              <span className="eyebrow">{formatRange(tour.startDate, tour.endDate, lang)}</span>
              <h2>{tour.name}</h2>
              {tour.location && <p className="muted">{tour.location}</p>}
              <p className="small">{t('tournaments.squadCount', { count: tour.squad.length, size: tour.squadSize })}</p>
            </Link>
          </li>
        ))}
      </ul>

      {adding && (
        <TournamentEditor
          tournament={null}
          onClose={() => setAdding(false)}
          onSaved={(id) => navigate(`/tournaments/${id}`)}
        />
      )}
    </div>
  )
}
