import { useState } from 'react'
import type { EventKind } from './model'
import { Link, useNavigate } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { useI18n } from '../i18n'
import { daysUntil, formatRange, todayIso } from '../lib/dates'
import { KindTag } from './KindTag'
import { TournamentEditor } from './TournamentEditor'
import { useTournaments } from './store'
import { useTeam } from '../teams/TeamProvider'

export function TournamentsPage() {
  const { t, lang } = useI18n()
  const { teamId, canCoach } = useTeam()
  const state = useTournaments(teamId)
  const navigate = useNavigate()
  const today = todayIso()
  // Days until the tournament starts; nothing for ongoing and past ones.
  const days = (tour: { startDate: string }) => (tour.startDate ? daysUntil(tour.startDate, today) : 0)
  const [adding, setAdding] = useState<EventKind | null>(null)

  if (state.status === 'loading') return <p className="muted">{t('app.loading')}</p>
  if (state.status === 'error') return <p className="error">{t('app.error', { message: state.message })}</p>

  return (
    <div className="stack">
      <PageHero
        page="tournaments"
        tag={t('tournaments.tag')}
        title={t('tournaments.title')}
        count={state.data.length}
        countLabel={t('tournaments.countLabel')}
        actions={
          canCoach && (
          <>
            <button className="btn btn-primary" onClick={() => setAdding('tournament')}>
              + {t('tournaments.add')}
            </button>
            <button className="btn btn-slant" onClick={() => setAdding('camp')}>
              + {t('camp.add')}
            </button>
          </>
          )
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
              <span className="tile-top">
                <span className="bar" />
                <KindTag kind={tour.kind} />
              </span>
              <span className="eyebrow">
                {formatRange(tour.startDate, tour.endDate, lang)}
              </span>
              <h2>{tour.name}</h2>
              {tour.location && <p className="muted">{tour.location}</p>}
              <p className="small">{t(tour.kind === 'camp' ? 'camp.count' : 'tournaments.squadCount', { count: tour.squad.length, size: tour.squadSize })}</p>
            </Link>
          </li>
        ))}
      </ul>

      {adding && (
        <TournamentEditor
          tournament={null}
          defaultKind={adding}
          onClose={() => setAdding(null)}
          onSaved={(id) => navigate(`/tournaments/${id}`)}
        />
      )}
    </div>
  )
}
