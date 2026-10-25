import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { SaveStatus } from '../components/SaveStatus'
import { useI18n } from '../i18n'
import { formatDay } from '../lib/dates'
import { fullName } from '../players/model'
import { usePlayers } from '../players/store'
import { GameEditor } from './GameEditor'
import { ChipBody, PlayerChip, ZoneBox, collision, useDragSensors } from './dnd'
import {
  GAME_SUBS,
  PERIODS,
  SLOTS,
  emptyLineup,
  gameLineups,
  lineupIds,
  movePlayer,
  moveProblem,
  pruneLineup,
  slotLimit,
  slotOf,
  substitutionsIn,
  summarize,
  tournamentNumber,
  type Lineup,
  type Period,
  type Slot,
} from './model'
import { saveLineup, saveLineups, useGames, useTournament } from './store'

const POOL = 'POOL'
type Zone = Slot | typeof POOL

export function LineupPage() {
  const { tid = '', gid = '' } = useParams()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const period: Period = params.get('period') === '2' ? 2 : 1
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
  const { first, second, secondSame } = gameLineups(game, squad)
  const lineup = period === 1 ? first : second
  // The second period is played by the same 15 who were named for the start.
  const starting15 = lineupIds(first)
  const pool = (period === 1 ? squad : starting15).filter((id) => slotOf(lineup, id) === null)
  const sum = summarize(lineup)
  const subsIn = new Set(substitutionsIn(first, second))
  const subsOut = new Set(substitutionsIn(second, first))
  const periodDone = (p: Period) => summarize(p === 1 ? first : second).complete
  const prevGame = games.data[gameIndex - 1]
  const nextGame = games.data[gameIndex + 1]
  const copySource = games.data
    .slice(0, gameIndex)
    .reverse()
    .find((g) => SLOTS.some((s) => g.lineup[s].length > 0))

  async function persist(next: Lineup | null) {
    await write(() => saveLineup(tid, gid, period, next))
  }

  async function write(save: () => Promise<void>) {
    setPending((n) => n + 1)
    setError(null)
    try {
      await save()
    } catch (e) {
      setError(t('app.error', { message: (e as Error).message }))
    } finally {
      setPending((n) => n - 1)
    }
  }

  function place(playerId: string, zone: Zone) {
    const to = zone === POOL ? null : zone
    if (slotOf(lineup, playerId) === to) return
    const problem = moveProblem(lineup, playerId, to, period, starting15)
    if (problem) {
      setError(t(`lineup.problem.${problem}`))
      return
    }
    // The first change to the second period turns the copy of the first period into its own lineup.
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
    void write(() => saveLineups(tid, gid, pruneLineup(copySource.lineup, squad), copySource.lineup2))
  }

  function onClear() {
    if (window.confirm(t('lineup.clearConfirm'))) void persist(emptyLineup())
  }

  function onSameAsFirst() {
    if (window.confirm(t('lineup.sameAsFirstConfirm'))) void persist(null)
  }

  function setPeriod(p: Period) {
    setSelected(null)
    setError(null)
    setParams(p === 1 ? {} : { period: '2' }, { replace: true })
  }

  function noteFor(id: string) {
    if (period !== 2) return undefined
    if (subsIn.has(id)) return { text: t('lineup.subIn'), kind: 'in' as const }
    if (subsOut.has(id)) return { text: t('lineup.subOut'), kind: 'out' as const }
    return undefined
  }

  const selectedPlayer = selected ? byId.get(selected) : undefined
  const draggingPlayer = dragging ? byId.get(dragging) : undefined

  return (
    <div className="stack">
      <PageHero
        compact
        image="pohjassaseisomassa"
        top={
          <Link to={`/tournaments/${tid}`} className="back-link">
            ← {tour.name}
          </Link>
        }
        tag={t('lineup.tag')}
        title={
          <span className="game-heading">
            {game.cap && <span className={`cap-dot big cap-${game.cap}`} title={t(`cap.${game.cap}`)} />}
            {t('game.vs')} {game.opponent}
          </span>
        }
        sub={[formatDay(game.date, lang), game.time, game.label, game.cap ? t(`cap.${game.cap}`) : ''].filter(Boolean).join(' · ')}
        actions={
          <>
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
            <button className="btn btn-small" onClick={() => setEditingGame(true)}>
              {t('game.edit')}
            </button>
          </>
        }
      />

      <div className="segmented period-tabs" role="tablist">
        {PERIODS.map((p) => (
          <button key={p} role="tab" aria-selected={period === p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
            {periodDone(p) && '✓ '}
            {t('lineup.period', { n: p })}
          </button>
        ))}
      </div>

      <div className="lineup-bar">
        <strong className={sum.complete ? 'ok-text' : ''}>
          {sum.complete && '✓ '}
          {t(period === 1 ? 'lineup.summary' : 'lineup.summary2', { inGame: sum.inGame, subs: sum.subs })}
        </strong>
        {period === 2 && (
          <strong className={subsIn.size > 0 ? '' : 'muted'}>
            {t('lineup.subsCount', { count: subsIn.size, max: GAME_SUBS })}
          </strong>
        )}
        <SaveStatus pending={pending} />
        <span className="grow" />
        {period === 1 && copySource && (
          <button className="btn btn-small" onClick={onCopy}>
            {t('lineup.copyFrom')}
          </button>
        )}
        {period === 1 ? (
          <button className="btn btn-small" onClick={onClear} disabled={sum.inGame + sum.subs === 0}>
            {t('lineup.clear')}
          </button>
        ) : (
          !secondSame && (
            <button className="btn btn-small" onClick={onSameAsFirst}>
              {t('lineup.sameAsFirst')}
            </button>
          )
        )}
      </div>

      {period === 2 && squad.length > 0 && (
        <p className="muted small">{secondSame ? t('lineup.period2Same') : t('lineup.period2Help')}</p>
      )}

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
                    seats
                    onTap={() => onZoneTap(slot)}
                  >
                    {lineup[slot].map((id) => {
                      const p = byId.get(id)
                      return p ? (
                        <PlayerChip key={id} player={p} slot={slot} selected={selected === id} note={noteFor(id)} onTap={() => onChipTap(id)} />
                      ) : null
                    })}
                  </ZoneBox>
                ))}
              </div>

              <ZoneBox
                zone={POOL}
                title={t(period === 1 ? 'lineup.available' : 'lineup.available2')}
                count={pool.length}
                armed={!!selected && slotOf(lineup, selected) !== null}
                onTap={() => onZoneTap(POOL)}
              >
                {pool.length === 0 && <p className="muted small">{t(period === 1 ? 'lineup.allPlaced' : 'lineup.allPlaced2')}</p>}
                {pool.map((id) => {
                  const p = byId.get(id)
                  return p ? (
                    <PlayerChip key={id} player={p} slot={null} selected={selected === id} note={noteFor(id)} onTap={() => onChipTap(id)} />
                  ) : null
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
