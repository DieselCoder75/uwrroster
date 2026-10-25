import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from '@dnd-kit/core'
import { useRef } from 'react'
import { useI18n } from '../i18n'
import { fullName, playablePositions, type Player } from '../players/model'
import { fitIssue, type Slot } from './model'

// Shared drag-and-drop pieces for the squad page and the game lineup page.

// Drop where the finger or pointer is; fall back to overlap for keyboard dragging.
export const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : rectIntersection(args)
}

export function useDragSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press starts a drag on touch screens, so normal swipes still scroll the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )
}

type ZoneProps = {
  zone: string
  title: React.ReactNode
  count: number
  limit?: number
  armed: boolean
  /** Show empty places up to the limit, so any player can be dropped into any position from the start. */
  seats?: boolean
  className?: string
  onTap: () => void
  children: React.ReactNode
}

export function ZoneBox({ zone, title, count, limit, armed, seats, className = `zone-${zone}`, onTap, children }: ZoneProps) {
  const { t } = useI18n()
  const { setNodeRef, isOver } = useDroppable({ id: zone })
  const over = limit !== undefined && count > limit
  const posClass = zone === 'GK' || zone === 'DEF' || zone === 'ATT' ? `pos-${zone}` : ''
  return (
    <section
      ref={setNodeRef}
      className={`zone card ${posClass} ${className} ${isOver ? 'is-over' : ''} ${armed ? 'armed' : ''}`}
      onClick={(e) => {
        // Taps on a chip select the chip; taps on the zone itself place the selected player.
        if (!(e.target as HTMLElement).closest('.chip-player, input, button')) onTap()
      }}
    >
      <header className="zone-head">
        <h2>{title}</h2>
        <span className={`zone-count ${over ? 'warn' : limit !== undefined && count === limit ? 'ok-text' : ''}`} title={over ? t('lineup.over') : undefined}>
          {limit !== undefined ? `${count}/${limit}` : count}
        </span>
      </header>
      <div className="zone-body">
        {children}
        {seats && limit !== undefined
          ? Array.from({ length: Math.max(0, limit - count) }, (_, i) => (
              <span key={i} className={`seat ${armed ? 'armed' : ''}`}>
                {armed ? t('lineup.dropHere') : t('lineup.emptySeat')}
              </span>
            ))
          : null}
        {armed && !(seats && limit !== undefined && count < limit) && <span className="drop-hint">{t('lineup.dropHere')}</span>}
      </div>
    </section>
  )
}

const DOUBLE_TAP_MS = 350

export function PlayerChip({
  player,
  slot,
  selected,
  clash,
  note,
  load,
  compact,
  dragId,
  onTap,
  onDoubleTap,
}: {
  player: Player
  /** Needed when the same player is shown more than once on a page, e.g. in each camp pool. */
  dragId?: string
  slot: Slot | null
  selected: boolean
  /** Number and name only, for narrow columns. */
  compact?: boolean
  clash?: boolean
  /** Short marker such as "In" for a substitution. */
  note?: { text: string; kind: 'in' | 'out' }
  /** Periods played in the tournament's other games. */
  load?: number
  onTap: () => void
  /** A quick second tap or click, e.g. to place the player straight into their main position. */
  onDoubleTap?: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId ?? player.id })
  // Our own double-tap timing, because phones don't reliably fire dblclick.
  const lastTap = useRef(0)

  function onClick() {
    const now = Date.now()
    if (onDoubleTap && now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0
      onDoubleTap()
      return
    }
    lastTap.current = now
    onTap()
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`chip-player ${selected ? 'selected' : ''} ${isDragging ? 'ghost' : ''}`}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <ChipBody player={player} slot={slot} clash={clash} note={note} load={load} compact={compact} />
    </button>
  )
}

export function ChipBody({
  player: p,
  slot,
  lifted,
  clash,
  note,
  load,
  compact,
}: {
  player: Player
  slot: Slot | null
  compact?: boolean
  lifted?: boolean
  clash?: boolean
  note?: { text: string; kind: 'in' | 'out' }
  load?: number
}) {
  const { t } = useI18n()
  const issue = slot ? fitIssue(p, slot) : null
  return (
    <span className={`chip-body ${compact ? 'compact' : ''} ${lifted ? 'lifted' : ''} ${issue ? `issue-${issue}` : ''}`}>
      <span className={`mini-num pos-${p.mainPosition} ${clash ? 'clash' : ''}`}>{p.number ?? '–'}</span>
      <span className="chip-name">{fullName(p)}</span>
      {p.captain && <span className="badge">{t(`captain.short.${p.captain}`)}</span>}
      {note && <span className={`sub-note sub-${note.kind}`}>{note.text}</span>}
      {load !== undefined && (
        <span className="load-pill" title={t('load.chipTitle', { count: load })}>
          {t('load.chip', { count: load })}
        </span>
      )}
      {slot === null && !compact && (
        <span className="chip-pos">
          {playablePositions(p).map((pos) => (
            <span key={pos} className={`pos-tag pos-${pos} ${pos === p.mainPosition ? 'main' : ''}`} title={t(`pos.${pos}`)}>
              {t(`pos.short.${pos}`)}
            </span>
          ))}
          {p.locked && '🔒'}
        </span>
      )}
      {issue && (
        <span
          className="issue-icon"
          title={issue === 'locked' ? t('lineup.fit.locked', { pos: t(`pos.${p.mainPosition}`) }) : t('lineup.fit.notPlayable')}
        >
          {issue === 'locked' ? '🔒' : '⚠'}
        </span>
      )}
    </span>
  )
}
