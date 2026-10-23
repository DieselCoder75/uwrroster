import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { formatDay, formatRange } from '../lib/dates'
import { POSITIONS, fullName } from '../players/model'
import { usePlayers } from '../players/store'
import { GameEditor } from './GameEditor'
import { SquadEditor } from './SquadEditor'
import { TournamentEditor } from './TournamentEditor'
import { pruneLineup, squadNumberClashes, summarize, tournamentNumber, type Game } from './model'
import { useGames, useTournament } from './store'

export function TournamentPage() {
  const { tid = '' } = useParams()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const tournament = useTournament(tid)
  const games = useGames(tid)
  const players = usePlayers()
  const [editing, setEditing] = useState(false)
  const [editingSquad, setEditingSquad] = useState(false)
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

  const squadPlayers = players.players.filter((p) => tour.squad.includes(p.id))
  const clashes = squadNumberClashes(tour, players.players)

  return (
    <div className="stack">
      <Link to="/tournaments" className="back-link">
        {t('tournaments.back')}
      </Link>

      <div className="page-head">
        <div>
          <h1>{tour.name}</h1>
          <p className="muted">{[formatRange(tour.startDate, tour.endDate, lang), tour.location].filter(Boolean).join(' · ')}</p>
        </div>
        <button className="btn" onClick={() => setEditing(true)}>
          {t('tournament.edit')}
        </button>
      </div>

      <div className="two-col">
        <section className="card stack">
          <div className="section-head">
            <h2>{t('games.title')}</h2>
            <button className="btn btn-small btn-primary" onClick={() => setEditingGame('new')}>
              + {t('games.add')}
            </button>
          </div>
          {games.data.length === 0 && <p className="muted">{t('games.empty')}</p>}
          <ul className="list">
            {games.data.map((g) => {
              const sum = summarize(pruneLineup(g.lineup, tour.squad))
              return (
                <li key={g.id} className="game-row">
                  <Link to={`/tournaments/${tid}/games/${g.id}`} className="game-link">
                    <span className="game-when">
                      <strong>{g.time || '–'}</strong>
                      <span className="muted small">{formatDay(g.date, lang)}</span>
                    </span>
                    <span className="grow">
                      <span className="game-title">
                        {g.cap && <span className={`cap-dot cap-${g.cap}`} title={t(`cap.${g.cap}`)} />}
                        {t('game.vs')} {g.opponent}
                      </span>
                      {g.label && <span className="muted small"> · {g.label}</span>}
                    </span>
                    <span className={`status-pill ${sum.complete ? 'ok' : sum.inGame + sum.subs === 0 ? '' : 'partial'}`}>
                      {sum.inGame + sum.subs === 0
                        ? t('games.lineupEmpty')
                        : sum.complete
                          ? `✓ ${t('games.lineupReady')}`
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
            <button className="btn btn-small" onClick={() => setEditingSquad(true)}>
              {t('squad.edit')}
            </button>
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

      {editing && (
        <TournamentEditor tournament={tour} onClose={() => setEditing(false)} onDeleted={() => navigate('/tournaments')} />
      )}
      {editingSquad && (
        <SquadEditor
          tournamentId={tid}
          squad={tour.squad}
          numbers={tour.numbers}
          squadSize={tour.squadSize}
          players={players.players}
          onClose={() => setEditingSquad(false)}
        />
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
