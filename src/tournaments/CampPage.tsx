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
  bestSide,
  emptyPool,
  movePoolPlayer,
  otherSide,
  prunePools,
  sideBalance,
  sideOf,
  sortSide,
  splitEvenly,
  unplaced,
  type Balance,
  type CampPool,
  type Side,
} from './camp'
import { ChipBody, PlayerChip, ZoneBox, collision, useDragSensors } from './dnd'
import { tournamentNumber, type Tournament } from './model'
import { savePools } from './store'
import { TournamentEditor } from './TournamentEditor'
import { useTeam } from '../teams/TeamProvider'

const REST = 'rest'

// Every player is split in every pool, so a chip, a zone and a selection all name the pool: "pool|side" for a
// zone and "pool|playerId" for a dragged chip.
type Choice = { pool: string; id: string }
const zoneId = (pool: string, side: Side | typeof REST) => `${pool}|${side}`

function parseZone(zone: string): { pool: string; side: Side | null } | null {
  const [pool, side] = zone.split('|')
  if (side === 'blue' || side === 'white') return { pool, side }
  return side === REST ? { pool, side: null } : null
}

/** A camp: in each pool, the coach splits all of the camp's players into a blue and a white side. */
export function CampPage({ tour, players }: { tour: Tournament; players: Player[] }) {
  const { t, lang } = useI18n()
  const { teamId, canCoach } = useTeam()
  const navigate = useNavigate()
  const sensors = useDragSensors()
  const [selected, setSelected] = useState<Choice | null>(null)
  const [dragging, setDragging] = useState<Choice | null>(null)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const tid = tour.id
  // Show the number each player wears in this camp.
  const byId = new Map(players.map((p) => [p.id, { ...p, number: tournamentNumber(tour, p) }]))
  const squad = tour.squad.filter((id) => byId.has(id))
  const pools = prunePools(tour.pools, squad)
  const restOf = (pool: CampPool) => unplaced(pool, squad)
  const poolsDone = pools.filter((p) => squad.length > 0 && restOf(p).length === 0).length
  const anyRest = pools.some((p) => restOf(p).length > 0)
  const anyPlaced = pools.some((p) => p.blue.length + p.white.length > 0)

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

  function place(pick: Choice, side: Side | null) {
    const pool = pools.find((p) => p.id === pick.pool)
    if (!pool || sideOf(pool, pick.id) === side) return
    void persist(movePoolPlayer(pools, pick.pool, pick.id, side))
  }

  function onZoneTap(zone: string) {
    const target = parseZone(zone)
    // A player is moved within their own pool only.
    if (!selected || !target || target.pool !== selected.pool) return
    place(selected, target.side)
    setSelected(null)
  }

  // Double tap: a split player changes sides; one not yet split goes where their position is needed most.
  function onDoubleTap(pick: Choice) {
    setSelected(null)
    const pool = pools.find((p) => p.id === pick.pool)
    const p = byId.get(pick.id)
    if (!pool || !p) return
    const side = sideOf(pool, pick.id)
    place(pick, side ? otherSide(side) : bestSide(pool, p, byId))
  }

  const pickFromDrag = (id: string): Choice => {
    const [pool, player] = id.split('|')
    return { pool, id: player }
  }

  function onDragStart(e: DragStartEvent) {
    setDragging(pickFromDrag(String(e.active.id)))
    setSelected(null)
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    if (!e.over) return
    const pick = pickFromDrag(String(e.active.id))
    const target = parseZone(String(e.over.id))
    if (target && target.pool === pick.pool) place(pick, target.side)
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

  const isSelected = (pick: Choice) => selected?.pool === pick.pool && selected.id === pick.id

  function chip(pool: string, id: string) {
    const p = byId.get(id)
    if (!p) return null
    const pick = { pool, id }
    return (
      <PlayerChip
        key={id}
        dragId={`${pool}|${id}`}
        player={p}
        slot={null}
        compact
        selected={isSelected(pick)}
        onTap={() => setSelected(isSelected(pick) ? null : pick)}
        onDoubleTap={() => onDoubleTap(pick)}
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

  const selectedPlayer = selected ? byId.get(selected.id) : undefined
  const selectedPool = selected ? pools.find((p) => p.id === selected.pool) : undefined
  const selectedPlaced = !!selected && !!selectedPool && sideOf(selectedPool, selected.id) !== null
  const draggingPlayer = dragging ? byId.get(dragging.id) : undefined

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
        count={tour.squad.length}
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
        <strong className={squad.length > 0 && !anyRest ? 'ok-text' : ''}>
          {squad.length > 0 && !anyRest && '✓ '}
          {t('camp.poolsDone', { count: poolsDone, total: pools.length })}
        </strong>
        <SaveStatus pending={pending} />
        <span className="grow" />
        {canCoach && (
          <>
            <Link to={`/tournaments/${tid}/squad`} className="btn btn-small">
              {t('camp.pickPlayers')}
            </Link>
            <button className="btn btn-small btn-primary" onClick={onSplitRest} disabled={!anyRest}>
              {t('camp.splitRest')}
            </button>
            <button className="btn btn-small" onClick={onClear} disabled={!anyPlaced}>
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
                <button className="btn btn-small" onClick={() => onZoneTap(zoneId(selected!.pool, REST))}>
                  {t('camp.toRest')}
                </button>
              )}
              <button className="btn btn-small" onClick={() => setSelected(null)}>
                {t('lineup.cancelSelect')}
              </button>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
            <div className="pools" inert={!canCoach}>
              {pools.map((pool, i) => {
                const balance = { blue: sideBalance(pool.blue, byId), white: sideBalance(pool.white, byId) }
                const gap = Math.abs(balance.blue.total - balance.white.total)
                const rest = restOf(pool)
                const mine = selected?.pool === pool.id
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
                    {(rest.length > 0 || (mine && selectedPlaced)) && (
                      <ZoneBox
                        zone={zoneId(pool.id, REST)}
                        className="zone-POOL pool-rest"
                        title={t('camp.rest')}
                        count={rest.length}
                        armed={mine && selectedPlaced}
                        onTap={() => onZoneTap(zoneId(pool.id, REST))}
                      >
                        {sortSide(rest.map((id) => byId.get(id)!)).map((p) => chip(pool.id, p.id))}
                      </ZoneBox>
                    )}
                    <div className="pool-sides">
                      {SIDES.map((side: Side) => {
                        const zone = zoneId(pool.id, side)
                        const players = sortSide(pool[side].map((id) => byId.get(id)!))
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
                            count={players.length}
                            armed={mine && !!selectedPool && sideOf(selectedPool, selected!.id) !== side}
                            onTap={() => onZoneTap(zone)}
                          >
                            {balanceRow(balance[side], balance[otherSide(side)])}
                            {players.map((p) => chip(pool.id, p.id))}
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

            <DragOverlay dropAnimation={null}>{draggingPlayer && <ChipBody player={draggingPlayer} slot={null} compact lifted />}</DragOverlay>
          </DndContext>
        </>
      )}

      {editing && <TournamentEditor tournament={tour} onClose={() => setEditing(false)} onDeleted={() => navigate('/tournaments')} />}
    </div>
  )
}
