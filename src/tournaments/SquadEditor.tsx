import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { useI18n } from '../i18n'
import { POSITIONS, duplicateNumbers, fullName, matchesSearch, type Player } from '../players/model'
import { saveSquad } from './store'

type Props = {
  tournamentId: string
  squad: string[]
  numbers: Record<string, number>
  squadSize: number
  players: Player[]
  onClose: () => void
}

export function SquadEditor({ tournamentId, squad, numbers, squadSize, players, onClose }: Props) {
  const { t } = useI18n()
  const [selected, setSelected] = useState(() => new Set(squad))
  // Number text per player as typed; only differences from the pool number are saved.
  const [numberText, setNumberText] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.map((p) => [p.id, String(numbers[p.id] ?? p.number ?? '')])),
  )
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Active players, plus anyone already picked who has since been made inactive.
  const candidates = players.filter((p) => p.active || squad.includes(p.id))

  const parsed = (id: string): number | null => {
    const s = numberText[id]?.trim() ?? ''
    return /^\d{1,3}$/.test(s) ? Number(s) : null
  }
  const clashes = duplicateNumbers(players.filter((p) => selected.has(p.id)).map((p) => parsed(p.id)))

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSave() {
    setBusy(true)
    try {
      const picked = players.filter((p) => selected.has(p.id))
      const overrides: Record<string, number> = {}
      for (const p of picked) {
        const n = parsed(p.id)
        if (n !== null && n !== p.number) overrides[p.id] = n
      }
      // Keep the pool's order so the squad reads the same everywhere.
      await saveSquad(
        tournamentId,
        picked.map((p) => p.id),
        overrides,
      )
      onClose()
    } catch (e) {
      setError(t('app.error', { message: (e as Error).message }))
      setBusy(false)
    }
  }

  return (
    <Sheet title={t('squad.dialogTitle')} onClose={onClose}>
      <input type="search" placeholder={t('players.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className={selected.size > squadSize ? 'notice' : 'muted'}>
        {t('squad.selected', { count: selected.size })} / {squadSize}
      </p>
      {[...clashes].map((n) => (
        <p key={n} className="notice warn-notice small">
          {t('squad.numberClash', { number: n })} {t('squad.numberHelp')}
        </p>
      ))}
      {POSITIONS.map((pos) => {
        const group = candidates.filter((p) => p.mainPosition === pos && matchesSearch(p, query))
        if (group.length === 0) return null
        return (
          <section key={pos} className="stack-tight">
            <h3 className={`group-title pos-${pos}`}>{t(`slot.${pos}`)}</h3>
            <ul className="check-list">
              {group.map((p) => {
                const on = selected.has(p.id)
                const n = parsed(p.id)
                const clash = on && n !== null && clashes.has(n)
                return (
                  <li key={p.id} className="check-row">
                    <label className="check-row-label grow">
                      <input type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                      <span className="grow">{fullName(p)}</span>
                    </label>
                    {on ? (
                      <input
                        className={`squad-number ${clash ? 'clash' : ''} ${n !== p.number ? 'changed' : ''}`}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={t('squad.tournamentNumber')}
                        title={t('squad.tournamentNumber')}
                        value={numberText[p.id] ?? ''}
                        onChange={(e) => setNumberText((m) => ({ ...m, [p.id]: e.target.value }))}
                      />
                    ) : (
                      <span className={`mini-num pos-${p.mainPosition}`}>{p.number ?? '–'}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {error && <p className="error">{error}</p>}
      <div className="sheet-actions sticky-actions">
        <button type="button" className="btn" onClick={onClose}>
          {t('tournament.cancel')}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onSave()}>
          {t('squad.save')} ({selected.size})
        </button>
      </div>
    </Sheet>
  )
}
