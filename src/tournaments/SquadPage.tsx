import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { POSITIONS, fullName, matchesSearch, type Player } from '../players/model'
import { usePlayers } from '../players/store'
import { ChipBody, PlayerChip, ZoneBox, collision, useDragSensors } from './dnd'
import { NumbersEditor } from './NumbersEditor'
import { squadNumberClashes, tournamentNumber } from './model'
import { saveSquad, useTournament } from './store'

const SQUAD = 'SQUAD'
const POOL = 'POOL'
type Zone = typeof SQUAD | typeof POOL

/** Pick the tournament squad from the player pool. Game lineups are then picked from this squad. */
export function SquadPage() {
  const { tid = '' } = useParams()
  const { t } = useI18n()
  const tournament = useTournament(tid)
  const players = usePlayers()
  const sensors = useDragSensors()
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editingNumbers, setEditingNumbers] = useState(false)

  for (const s of [tournament, players]) {
    if (s.status === 'loading') return <p className="muted">{t('app.loading')}</p>
    if (s.status === 'error') return <p className="error">{t('app.error', { message: s.message })}</p>
  }
  if (tournament.status !== 'ready' || players.status !== 'ready') return null

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

  // Show the number each player wears in this tournament.
  const poolPlayers = players.players
  const all = poolPlayers.map((p) => ({ ...p, number: tournamentNumber(tour, p) }))
  const byId = new Map(all.map((p) => [p.id, p]))
  const inSquad = new Set(tour.squad)
  const squad = all.filter((p) => inSquad.has(p.id))
  // Active players only; inactive ones can be switched back on in the player pool.
  const pool = all.filter((p) => !inSquad.has(p.id) && p.active)
  const poolShown = pool.filter((p) => matchesSearch(p, query))
  const clashes = squadNumberClashes(tour, poolPlayers)
  const numbers = tour.numbers

  async function persist(ids: Set<string>) {
    setPending((n) => n + 1)
    setError(null)
    try {
      // Keep the pool's order so the squad reads the same everywhere.
      await saveSquad(
        tid,
        poolPlayers.filter((p) => ids.has(p.id)).map((p) => p.id),
        numbers,
      )
    } catch (e) {
      setError(t('app.error', { message: (e as Error).message }))
    } finally {
      setPending((n) => n - 1)
    }
  }

  function place(playerId: string, zone: Zone) {
    if (inSquad.has(playerId) === (zone === SQUAD)) return
    const next = new Set(inSquad)
    if (zone === SQUAD) next.add(playerId)
    else next.delete(playerId)
    void persist(next)
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

  function chip(p: Player) {
    const clash = inSquad.has(p.id) && p.number !== null && clashes.has(p.number)
    return (
      <PlayerChip
        key={p.id}
        player={p}
        slot={null}
        clash={clash}
        selected={selected === p.id}
        onTap={() => setSelected((s) => (s === p.id ? null : p.id))}
      />
    )
  }

  function grouped(list: Player[]) {
    return POSITIONS.map((pos) => {
      const group = list.filter((p) => p.mainPosition === pos)
      if (group.length === 0) return null
      return (
        <div key={pos} className="zone-group">
          <h3 className={`group-title pos-${pos}`}>
            {t(`slot.${pos}`)} <span className="muted">{group.length}</span>
          </h3>
          {group.map(chip)}
        </div>
      )
    })
  }

  const selectedPlayer = selected ? byId.get(selected) : undefined
  const draggingPlayer = dragging ? byId.get(dragging) : undefined
  const selectedInSquad = selected !== null && inSquad.has(selected)

  return (
    <div className="stack">
      <Link to={`/tournaments/${tid}`} className="back-link">
        ← {tour.name}
      </Link>

      <div className="page-head">
        <div>
          <h1>{t('squad.dialogTitle')}</h1>
          <p className="muted">{t('squad.pageHelp')}</p>
        </div>
      </div>

      <div className="lineup-bar">
        <strong className={squad.length > tour.squadSize ? 'warn' : squad.length === tour.squadSize ? 'ok-text' : ''}>
          {t('squad.selected', { count: squad.length })} / {tour.squadSize}
        </strong>
        <span className="muted small">{pending > 0 ? t('lineup.saving') : t('lineup.saved')}</span>
        <span className="grow" />
        {selectedPlayer && (
          // Long lists on phones: move the tapped player without scrolling to the other area.
          <button className="btn btn-small btn-primary" onClick={() => onZoneTap(selectedInSquad ? POOL : SQUAD)}>
            {selectedInSquad ? t('squad.toPool') : t('squad.toSquad')}
          </button>
        )}
        <button className="btn btn-small" onClick={() => setEditingNumbers(true)} disabled={squad.length === 0}>
          {t('squad.numbers')}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {[...clashes].map((n) => (
        <p key={n} className="notice warn-notice small">
          {t('squad.numberClash', { number: n })} {t('squad.numberFix')}
        </p>
      ))}

      <p className={selectedPlayer ? 'notice select-hint' : 'muted small'}>
        {selectedPlayer ? t('lineup.selected', { name: fullName(selectedPlayer) }) : t('squad.hint')}
        {selectedPlayer && (
          <button className="btn btn-small" onClick={() => setSelected(null)}>
            {t('lineup.cancelSelect')}
          </button>
        )}
      </p>

      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="squad-layout">
          <ZoneBox
            zone={SQUAD}
            title={t('squad.title')}
            count={squad.length}
            limit={tour.squadSize}
            armed={!!selected && !selectedInSquad}
            onTap={() => onZoneTap(SQUAD)}
          >
            {squad.length === 0 && <p className="muted small">{t('squad.emptyDrop')}</p>}
            {grouped(squad)}
          </ZoneBox>

          <ZoneBox zone={POOL} title={t('squad.pool')} count={pool.length} armed={selectedInSquad} onTap={() => onZoneTap(POOL)}>
            <input type="search" placeholder={t('players.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
            {pool.length === 0 && <p className="muted small">{t('squad.poolEmpty')}</p>}
            {grouped(poolShown)}
          </ZoneBox>
        </div>

        <DragOverlay dropAnimation={null}>{draggingPlayer && <ChipBody player={draggingPlayer} slot={null} lifted />}</DragOverlay>
      </DndContext>

      {editingNumbers && (
        <NumbersEditor tournamentId={tid} squad={tour.squad} numbers={tour.numbers} players={players.players} onClose={() => setEditingNumbers(false)} />
      )}
    </div>
  )
}
