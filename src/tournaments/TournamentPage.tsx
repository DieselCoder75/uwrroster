import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { ViewOnly } from '../components/ViewOnly'
import { useI18n } from '../i18n'
import { formatDay, formatRange } from '../lib/dates'
import { POSITIONS, fullName } from '../players/model'
import { usePlayers } from '../players/store'
import { CampPage } from './CampPage'
import { GameEditor } from './GameEditor'
import { GameName } from './GameName'
import { LoadTable } from './LoadTable'
import { TournamentEditor } from './TournamentEditor'
import { findVersion, gameLineups, squadNumberClashes, summarize, tournamentNumber, versionLabel, type Game } from './model'
import { useGames, useTournament } from './store'
import { useTeam } from '../teams/TeamProvider'

export function TournamentPage() {
  const { tid = '' } = useParams()
  const { t, lang } = useI18n()
  const { teamId, canCoach } = useTeam()
  const navigate = useNavigate()
  const tournament = useTournament(teamId, tid)
  const games = useGames(teamId, tid)
  const players = usePlayers(teamId)
  const [editing, setEditing] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | 'new' | null>(null)

  for (const s of [tournament, games, players]) {
    if (s.status === 'loading') return <p className="muted">{t('app.loading')}</p>
    if (s.status === 'error') return <p className="error">{t('app.error', { message: s.message })}</p>
  }
  if (tournament.status !== 'ready' || games.status !== 'ready' || players.status !== 'ready') return null

  const tour = tournament.data
  if (!tour) {
    return (
      <div className="stack">
        <Link to="/tournaments" className="back-link">
          {t('tournaments.back')}
        </Link>
        <p className="muted">{t('tournaments.notFound')}</p>
      </div>
    )
  }

  if (tour.kind === 'camp') return <CampPage tour={tour} players={players.players} />

  const squadPlayers = players.players.filter((p) => tour.squad.includes(p.id))
  const clashes = squadNumberClashes(tour, players.players)

  return (
    <div className="stack">
      <PageHero
        page="tournament"
        top={
          <Link to="/tournaments" className="back-link">
            {t('tournaments.back')}
          </Link>
        }
        tag={formatRange(tour.startDate, tour.endDate, lang)}
        title={tour.name}
        sub={tour.location}
        count={`${tour.squad.length}/${tour.squadSize}`}
        countLabel={t('tournament.squadLabel')}
        actions={
          canCoach && (
            <button className="btn" onClick={() => setEditing(true)}>
              {t('tournament.edit')}
            </button>
          )
        }
      />

      <div className="two-col">
        <section className="card stack">
          <div className="section-head">
            <h2>{t('games.title')}</h2>
            {canCoach && (
              <button className="btn btn-small btn-primary" onClick={() => setEditingGame('new')}>
                + {t('games.add')}
              </button>
            )}
          </div>
          {games.data.length === 0 && <p className="muted">{t('games.empty')}</p>}
          <ul className="list">
            {games.data.map((g) => {
              const { first, second } = gameLineups(g, tour.squad)
              const sum = summarize(first)
              const ready = sum.complete && summarize(second).complete
              return (
                <li key={g.id} className="game-row">
                  <Link to={`/tournaments/${tid}/games/${g.id}`} className="game-link">
                    <span className="game-when">
                      <strong>{g.time || '–'}</strong>
                      <span className="muted small">{formatDay(g.date, lang)}</span>
                    </span>
                    <span className="game-title">
                      <GameName game={g} />
                    </span>
                    {(g.label || g.versions.length > 1) && (
                      <span className="game-label muted small">
                        {[g.label, g.versions.length > 1 && t('version.label', { label: versionLabel(findVersion(g, null)) })]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                    <span className={`status-pill ${ready ? 'ok' : sum.inGame + sum.subs === 0 ? '' : 'partial'}`}>
                      {sum.inGame + sum.subs === 0
                        ? t('games.lineupEmpty')
                        : ready
                          ? `✓ ${t('games.lineupReady')}`
                          : sum.complete
                            ? t('games.period2Unfinished')
                            : t('games.lineupStatus', { inGame: sum.inGame, subs: sum.subs })}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card stack">
          <div className="section-head">
            <h2>
              {t('squad.title')}{' '}
              <span className={`muted ${tour.squad.length > tour.squadSize ? 'warn' : ''}`}>
                {tour.squad.length}/{tour.squadSize}
              </span>
            </h2>
            {canCoach && (
              <Link to={`/tournaments/${tid}/squad`} className="btn btn-small">
                {t('squad.edit')}
              </Link>
            )}
          </div>
          {tour.squad.length > tour.squadSize && (
            <p className="notice small">{t('squad.over', { count: tour.squad.length, size: tour.squadSize })}</p>
          )}
          {[...clashes].map((n) => (
            <p key={n} className="notice warn-notice small">
              {t('squad.numberClash', { number: n })}
            </p>
          ))}
          {squadPlayers.length === 0 ? (
            <p className="muted">{t('squad.empty')}</p>
          ) : (
            POSITIONS.map((pos) => {
              const group = squadPlayers.filter((p) => p.mainPosition === pos)
              if (group.length === 0) return null
              return (
                <div key={pos} className="stack-tight">
                  <h3 className={`group-title pos-${pos}`}>
                    {t(`slot.${pos}`)} <span className="muted">{group.length}</span>
                  </h3>
                  <ul className="squad-list">
                    {group.map((p) => {
                      const n = tournamentNumber(tour, p)
                      return (
                        <li key={p.id}>
                          <span className={`mini-num pos-${p.mainPosition} ${n !== null && clashes.has(n) ? 'clash' : ''}`}>
                            {n ?? '–'}
                          </span>{' '}
                          {fullName(p)}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}
        </section>
      </div>

      <LoadTable tour={tour} games={games.data} players={players.players} />

      {!canCoach && <ViewOnly />}

      {editing && (
        <TournamentEditor tournament={tour} onClose={() => setEditing(false)} onDeleted={() => navigate('/tournaments')} />
      )}
      {editingGame && (
        <GameEditor
          tournamentId={tid}
          game={editingGame === 'new' ? null : editingGame}
          defaultDate={tour.startDate}
          onClose={() => setEditingGame(null)}
        />
      )}
    </div>
  )
}
