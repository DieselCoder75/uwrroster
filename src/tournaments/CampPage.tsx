import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { ViewOnly } from '../components/ViewOnly'
import { SaveStatus } from '../components/SaveStatus'
import { useI18n } from '../i18n'
import { formatRange } from '../lib/dates'
import { POSITIONS, fullName, type Player } from '../players/model'
import {
  MAX_POOLS,
  SIDES,
  bestSpot,
  emptyPool,
  movePoolPlayer,
  otherSide,
  prunePools,
  sideBalance,
  sortSide,
  splitEvenly,
  spotOf,
  unplaced,
  type Balance,
  type CampPool,
  type PoolSpot,
  type Side,
} from './camp'
import { ChipBody, PlayerChip, ZoneBox, collision, useDragSensors } from './dnd'
import { tournamentNumber, type Tournament } from './model'
import { savePools } from './store'
import { TournamentEditor } from './TournamentEditor'
import { useTeam } from '../teams/TeamProvider'

const REST = 'REST'

const zoneId = (spot: PoolSpot) => `${spot.pool}|${spot.side}`

function spotFromZone(zone: string): PoolSpot | null {
  const [pool, side] = zone.split('|')
  return side === 'blue' || side === 'white' ? { pool, side } : null
}

/** A camp: the coach splits the camp's players into pools, and each pool into a blue and a white side. */
export function CampPage({ tour, players }: { tour: Tournament; players: Player[] }) {
  const { t, lang } = useI18n()
  const { teamId, canCoach } = useTeam()
  const navigate = useNavigate()
  const sensors = useDragSensors()
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const tid = tour.id
  // Show the number each player wears in this camp.
  const byId = new Map(players.map((p) => [p.id, { ...p, number: tournamentNumber(tour, p) }]))
  const squad = tour.squad.filter((id) => byId.has(id))
  const pools = prunePools(tour.pools, squad)
  const rest = unplaced(pools, squad)
  const placedCount = squad.length - rest.length

  async function persist(next: CampPool[]) {
    setPending((n) => n + 1)
    setError(null)
    try {
      await savePools(teamId, tid, next)
    } catch (e) {
      setError(t('app.error', { message: (e as Error).message }))
    } finally {
      setPending((n) => n - 1)
    }
  }

  function place(playerId: string, to: PoolSpot | null) {
    const from = spotOf(pools, playerId)
    if (from?.pool === to?.pool && from?.side === to?.side) return
    void persist(movePoolPlayer(pools, playerId, to))
  }

  function onZoneTap(zone: string) {
    if (!selected) return
    place(selected, spotFromZone(zone))
    setSelected(null)
  }

  // Double tap: a player in a pool changes sides; a player not yet in a pool goes where they are needed most.
  function onDoubleTap(playerId: string) {
    setSelected(null)
    const from = spotOf(pools, playerId)
    const p = byId.get(playerId)
    if (from) return place(playerId, { pool: from.pool, side: otherSide(from.side) })
    if (p) place(playerId, bestSpot(pools, p, byId))
  }

  function onDragStart(e: DragStartEvent) {
    setDragging(String(e.active.id))
    setSelected(null)
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    if (e.over) place(String(e.active.id), spotFromZone(String(e.over.id)))
  }

  function onSplitRest() {
    void persist(splitEvenly(pools, squad, byId))
  }

  function onClear() {
    if (window.confirm(t('camp.clearConfirm'))) void persist(pools.map((p) => ({ ...p, blue: [], white: [] })))
  }

  function onAddPool() {
    void persist([...pools, emptyPool()])
  }

  function onRemovePool(pool: CampPool, index: number) {
    const name = poolName(pool, index)
    if (pool.blue.length + pool.white.length > 0 && !window.confirm(t('camp.removePoolConfirm', { name }))) return
    void persist(pools.filter((p) => p.id !== pool.id))
  }

  const poolName = (pool: CampPool, index: number) => pool.name || t('camp.pool', { n: index + 1 })

  function chip(id: string, compact: boolean) {
    const p = byId.get(id)
    if (!p) return null
    return (
      <PlayerChip
        key={id}
        player={p}
        slot={null}
        compact={compact}
        selected={selected === id}
        onTap={() => setSelected((s) => (s === id ? null : id))}
        onDoubleTap={() => onDoubleTap(id)}
      />
    )
  }

  function balanceRow(b: Balance, other: Balance) {
    return (
      <div className="balance" aria-label={t('camp.balance')}>
        {POSITIONS.map((pos) => (
          <span key={pos} className={`balance-pos pos-${pos} ${b[pos] !== other[pos] ? 'uneven' : ''}`} title={t(`slot.${pos}`)}>
            {t(`pos.short.${pos}`)} <strong>{b[pos]}</strong>
          </span>
        ))}
      </div>
    )
  }

  const selectedPlayer = selected ? byId.get(selected) : undefined
  const selectedPlaced = selected !== null && spotOf(pools, selected) !== null
  const draggingPlayer = dragging ? byId.get(dragging) : undefined

  return (
    <div className="stack">
      <PageHero
        page="camp"
        top={
          <Link to="/tournaments" className="back-link">
            {t('tournaments.back')}
          </Link>
        }
        tag={[t('event.kind.camp'), formatRange(tour.startDate, tour.endDate, lang)].filter(Boolean).join(' · ')}
        title={tour.name}
        sub={tour.location}
        count={`${tour.squad.length}/${tour.squadSize}`}
        countLabel={t('camp.participantsLabel')}
        actions={
          canCoach && (
            <button className="btn" onClick={() => setEditing(true)}>
              {t('tournament.edit')}
            </button>
          )
        }
      />

      <div className="lineup-bar">
        <strong className={squad.length > 0 && rest.length === 0 ? 'ok-text' : ''}>
          {squad.length > 0 && rest.length === 0 && '✓ '}
          {t('camp.placed', { count: placedCount, total: squad.length })}
        </strong>
        <SaveStatus pending={pending} />
        <span className="grow" />
        {canCoach && (
          <>
            <Link to={`/tournaments/${tid}/squad`} className="btn btn-small">
              {t('camp.pickPlayers')}
            </Link>
            <button className="btn btn-small btn-primary" onClick={onSplitRest} disabled={rest.length === 0}>
              {t('camp.splitRest')}
            </button>
            <button className="btn btn-small" onClick={onClear} disabled={placedCount === 0}>
              {t('lineup.clear')}
            </button>
          </>
        )}
      </div>

      {!canCoach && <ViewOnly />}
      {error && <p className="error">{error}</p>}

      {squad.length === 0 ? (
        <p className="notice">
          {t('camp.noPlayers')} <Link to={`/tournaments/${tid}/squad`}>→ {t('camp.pickPlayers')}</Link>
        </p>
      ) : (
        <>
          <p className="muted small">{t('camp.hint')}</p>
          {/* Floats over the page so selecting doesn't move the chips under a second tap. */}
          {selectedPlayer && (
            <div className="notice select-hint" role="status">
              <span>{t('camp.selected', { name: fullName(selectedPlayer) })}</span>
              {selectedPlaced && (
                <button className="btn btn-small" onClick={() => onZoneTap(REST)}>
                  {t('camp.toRest')}
                </button>
              )}
              <button className="btn btn-small" onClick={() => setSelected(null)}>
                {t('lineup.cancelSelect')}
              </button>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
            <div className="camp-layout" inert={!canCoach}>
              <ZoneBox zone={REST} className="zone-POOL camp-rest" title={t('camp.rest')} count={rest.length} armed={selectedPlaced} onTap={() => onZoneTap(REST)}>
                {rest.length === 0 && <p className="muted small">{t('camp.allPlaced')}</p>}
                {sortSide(rest.map((id) => byId.get(id)!)).map((p) => chip(p.id, false))}
              </ZoneBox>

              <div className="pools">
                {pools.map((pool, i) => {
                  const balance = { blue: sideBalance(pool.blue, byId), white: sideBalance(pool.white, byId) }
                  const gap = Math.abs(balance.blue.total - balance.white.total)
                  return (
                    <section key={pool.id} className="card pool-card">
                      <header className="pool-head">
                        <h2>{poolName(pool, i)}</h2>
                        <span className={`pool-score ${gap > 1 ? 'warn' : ''}`} title={t('camp.sideCounts')}>
                          {balance.blue.total} – {balance.white.total}
                        </span>
                        <span className="grow" />
                        {pools.length > 1 && (
                          <button className="btn btn-small" onClick={() => onRemovePool(pool, i)} aria-label={t('camp.removePool', { name: poolName(pool, i) })}>
                            ✕
                          </button>
                        )}
                      </header>
                      <div className="pool-sides">
                        {SIDES.map((side: Side) => {
                          const zone = zoneId({ pool: pool.id, side })
                          const ids = sortSide(pool[side].map((id) => byId.get(id)!))
                          return (
                            <ZoneBox
                              key={side}
                              zone={zone}
                              className={`side side-${side}`}
                              title={
                                <>
                                  <span className={`cap-dot cap-${side}`} /> {t(`cap.${side}`)}
                                </>
                              }
                              count={ids.length}
                              armed={!!selected && (spotOf(pools, selected)?.pool !== pool.id || spotOf(pools, selected)?.side !== side)}
                              onTap={() => onZoneTap(zone)}
                            >
                              {balanceRow(balance[side], balance[otherSide(side)])}
                              {ids.map((p) => chip(p.id, true))}
                            </ZoneBox>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
                {pools.length < MAX_POOLS && (
                  <button className="btn add-pool" onClick={onAddPool}>
                    + {t('camp.addPool')}
                  </button>
                )}
              </div>
            </div>

            <DragOverlay dropAnimation={null}>{draggingPlayer && <ChipBody player={draggingPlayer} slot={null} compact lifted />}</DragOverlay>
          </DndContext>
        </>
      )}

      {editing && <TournamentEditor tournament={tour} onClose={() => setEditing(false)} onDeleted={() => navigate('/tournaments')} />}
    </div>
  )
}
