import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { formatRange } from '../lib/dates'
import { TournamentEditor } from './TournamentEditor'
import { useTournaments } from './store'

export function TournamentsPage() {
  const { t, lang } = useI18n()
  const state = useTournaments()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

  if (state.status === 'loading') return <p className="muted">{t('app.loading')}</p>
  if (state.status === 'error') return <p className="error">{t('app.error', { message: state.message })}</p>

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{t('tournaments.title')}</h1>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          + {t('tournaments.add')}
        </button>
      </div>

      {state.data.length === 0 && <p className="muted">{t('tournaments.empty')}</p>}

      <ul className="tiles">
        {state.data.map((tour) => (
          <li key={tour.id}>
            <Link to={`/tournaments/${tour.id}`} className="tile card">
              <h2>{tour.name}</h2>
              <p className="muted">
                {[formatRange(tour.startDate, tour.endDate, lang), tour.location].filter(Boolean).join(' · ')}
              </p>
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
