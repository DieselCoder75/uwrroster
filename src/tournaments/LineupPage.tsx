import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { formatDay } from '../lib/dates'
import { fullName } from '../players/model'
import { usePlayers } from '../players/store'
import { GameEditor } from './GameEditor'
import { ChipBody, PlayerChip, ZoneBox, collision, useDragSensors } from './dnd'
import { SLOTS, movePlayer, pruneLineup, slotLimit, slotOf, summarize, tournamentNumber, type Lineup, type Slot } from './model'
import { saveLineup, useGames, useTournament } from './store'

const POOL = 'POOL'
type Zone = Slot | typeof POOL

export function LineupPage() {
  const { tid = '', gid = '' } = useParams()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const tournament = useTournament(tid)
  const games = useGames(tid)
  const players = usePlayers()
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editingGame, setEditingGame] = useState(false)

  const sensors = useDragSensors()

  for (const s of [tournament, games, players]) {
    if (s.status === 'loading') return <p className="muted">{t('app.loading')}</p>
    if (s.status === 'error') return <p className="error">{t('app.error', { message: s.message })}</p>
  }
  if (tournament.status !== 'ready' || games.status !== 'ready' || players.status !== 'ready') return null

  const tour = tournament.data
  const gameIndex = games.data.findIndex((g) => g.id === gid)
  const game = games.data[gameIndex]
  if (!tour || !game) {
    return (
      <div className="stack">
        <Link to={tour ? `/tournaments/${tid}` : '/tournaments'} className="back-link">
          ← {tour?.name ?? t('tournaments.title')}
        </Link>
        <p className="muted">{t('game.notFound')}</p>
      </div>
    )
  }

  // Show the number each player wears in this tournament.
  const byId = new Map(players.players.map((p) => [p.id, { ...p, number: tournamentNumber(tour, p) }]))
  const squad = tour.squad.filter((id) => byId.has(id))
  // Firestore applies our own writes to the snapshot immediately, so the game doc is the single source of truth.
  const lineup = pruneLineup(game.lineup, squad)
  const pool = squad.filter((id) => slotOf(lineup, id) === null)
  const sum = summarize(lineup)
  const prevGame = games.data[gameIndex - 1]
  const nextGame = games.data[gameIndex + 1]
  const copySource = games.data
    .slice(0, gameIndex)
    .reverse()
    .find((g) => SLOTS.some((s) => g.lineup[s].length > 0))

  async function persist(next: Lineup) {
    setPending((n) => n + 1)
    setError(null)
    try {
      await saveLineup(tid, gid, next)
    } catch (e) {
      setError(t('app.error', { message: (e as Error).message }))
    } finally {
      setPending((n) => n - 1)
    }
  }

  function place(playerId: string, zone: Zone) {
    const to = zone === POOL ? null : zone
    if (slotOf(lineup, playerId) === to) return
    void persist(movePlayer(lineup, playerId, to))
  }

  function onChipTap(playerId: string) {
    setSelected((s) => (s === playerId ? null : playerId))
  }

  function onZoneTap(zone: Zone) {
    if (!selected) return
    place(selected, zone)
    setSelected(null)
  }

  function onDragStart(e: DragStartEvent) {
    setDragging(String(e.active.id))
    setSelected(null)
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    if (e.over) place(String(e.active.id), e.over.id as Zone)
  }

  function onCopy() {
    if (!copySource) return
    if (!window.confirm(t('lineup.copyConfirm', { name: copySource.label || copySource.opponent }))) return
    void persist(pruneLineup(copySource.lineup, squad))
  }

  function onClear() {
    if (window.confirm(t('lineup.clearConfirm'))) void persist(pruneLineup({ GK: [], DEF: [], ATT: [], SUB: [] }, squad))
  }

  const selectedPlayer = selected ? byId.get(selected) : undefined
  const draggingPlayer = dragging ? byId.get(dragging) : undefined

  return (
    <div className="stack">
      <div className="game-nav">
        <Link to={`/tournaments/${tid}`} className="back-link">
          ← {tour.name}
        </Link>
        <span className="game-nav-arrows">
          {prevGame && (
            <Link to={`/tournaments/${tid}/games/${prevGame.id}`} className="btn btn-small" aria-label="previous">
              ‹
            </Link>
          )}
          {nextGame && (
            <Link to={`/tournaments/${tid}/games/${nextGame.id}`} className="btn btn-small" aria-label="next">
              ›
            </Link>
          )}
        </span>
      </div>

      <div className="page-head">
        <div>
          <h1 className="game-heading">
            {game.cap && <span className={`cap-dot big cap-${game.cap}`} title={t(`cap.${game.cap}`)} />}
            {t('game.vs')} {game.opponent}
          </h1>
          <p className="muted">
            {[formatDay(game.date, lang), game.time, game.label, game.cap ? t(`cap.${game.cap}`) : ''].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button className="btn btn-small" onClick={() => setEditingGame(true)}>
          {t('game.edit')}
        </button>
      </div>

      <div className="lineup-bar">
        <strong className={sum.complete ? 'ok-text' : ''}>
          {sum.complete && '✓ '}
          {t('lineup.summary', { inGame: sum.inGame, subs: sum.subs })}
        </strong>
        <span className="muted small">{pending > 0 ? t('lineup.saving') : t('lineup.saved')}</span>
        <span className="grow" />
        {copySource && (
          <button className="btn btn-small" onClick={onCopy}>
            {t('lineup.copyFrom')}
          </button>
        )}
        <button className="btn btn-small" onClick={onClear} disabled={sum.inGame + sum.subs === 0}>
          {t('lineup.clear')}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {squad.length === 0 ? (
        <p className="notice">
          {t('lineup.noSquad')} <Link to={`/tournaments/${tid}`}>→ {tour.name}</Link>
        </p>
      ) : (
        <>
          <p className={selectedPlayer ? 'notice select-hint' : 'muted small'}>
            {selectedPlayer ? t('lineup.selected', { name: fullName(selectedPlayer) }) : t('lineup.hint')}
            {selectedPlayer && (
              <button className="btn btn-small" onClick={() => setSelected(null)}>
                {t('lineup.cancelSelect')}
              </button>
            )}
          </p>

          <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
            <div className="lineup-layout">
              <div className="zones">
                {SLOTS.map((slot) => (
                  <ZoneBox
                    key={slot}
                    zone={slot}
                    title={t(`slot.${slot}`)}
                    count={lineup[slot].length}
                    limit={slotLimit(slot)}
                    armed={!!selected}
                    onTap={() => onZoneTap(slot)}
                  >
                    {lineup[slot].map((id) => {
                      const p = byId.get(id)
                      return p ? (
                        <PlayerChip key={id} player={p} slot={slot} selected={selected === id} onTap={() => onChipTap(id)} />
                      ) : null
                    })}
                  </ZoneBox>
                ))}
              </div>

              <ZoneBox
                zone={POOL}
                title={t('lineup.available')}
                count={pool.length}
                armed={!!selected && slotOf(lineup, selected) !== null}
                onTap={() => onZoneTap(POOL)}
              >
                {pool.length === 0 && <p className="muted small">{t('lineup.allPlaced')}</p>}
                {pool.map((id) => {
                  const p = byId.get(id)
                  return p ? <PlayerChip key={id} player={p} slot={null} selected={selected === id} onTap={() => onChipTap(id)} /> : null
                })}
              </ZoneBox>
            </div>

            <DragOverlay dropAnimation={null}>
              {draggingPlayer && <ChipBody player={draggingPlayer} slot={null} lifted />}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {editingGame && (
        <GameEditor
          tournamentId={tid}
          game={game}
          defaultDate={tour.startDate}
          onClose={() => setEditingGame(false)}
          onDeleted={() => navigate(`/tournaments/${tid}`)}
        />
      )}
    </div>
  )
}
