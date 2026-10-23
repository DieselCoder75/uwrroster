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
  title: string
  count: number
  limit?: number
  armed: boolean
  onTap: () => void
  children: React.ReactNode
}

export function ZoneBox({ zone, title, count, limit, armed, onTap, children }: ZoneProps) {
  const { t } = useI18n()
  const { setNodeRef, isOver } = useDroppable({ id: zone })
  const over = limit !== undefined && count > limit
  const posClass = zone === 'GK' || zone === 'DEF' || zone === 'ATT' ? `pos-${zone}` : ''
  return (
    <section
      ref={setNodeRef}
      className={`zone card ${posClass} zone-${zone} ${isOver ? 'is-over' : ''} ${armed ? 'armed' : ''}`}
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
        {armed && <span className="drop-hint">{t('lineup.dropHere')}</span>}
      </div>
    </section>
  )
}

export function PlayerChip({
  player,
  slot,
  selected,
  clash,
  onTap,
}: {
  player: Player
  slot: Slot | null
  selected: boolean
  clash?: boolean
  onTap: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: player.id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`chip-player ${selected ? 'selected' : ''} ${isDragging ? 'ghost' : ''}`}
      onClick={onTap}
      {...attributes}
      {...listeners}
    >
      <ChipBody player={player} slot={slot} clash={clash} />
    </button>
  )
}

export function ChipBody({ player: p, slot, lifted, clash }: { player: Player; slot: Slot | null; lifted?: boolean; clash?: boolean }) {
  const { t } = useI18n()
  const issue = slot ? fitIssue(p, slot) : null
  return (
    <span className={`chip-body ${lifted ? 'lifted' : ''} ${issue ? `issue-${issue}` : ''}`}>
      <span className={`mini-num pos-${p.mainPosition} ${clash ? 'clash' : ''}`}>{p.number ?? '–'}</span>
      <span className="chip-name">{fullName(p)}</span>
      {p.captain && <span className="badge">{t(`captain.short.${p.captain}`)}</span>}
      {slot === null && (
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
