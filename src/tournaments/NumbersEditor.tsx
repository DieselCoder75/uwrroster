import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { useI18n } from '../i18n'
import { POSITIONS, duplicateNumbers, fullName, type Player } from '../players/model'
import { saveSquad } from './store'

type Props = {
  tournamentId: string
  squad: string[]
  numbers: Record<string, number>
  players: Player[]
  onClose: () => void
}

/** Edit the numbers squad players wear in this tournament only. */
export function NumbersEditor({ tournamentId, squad, numbers, players, onClose }: Props) {
  const { t } = useI18n()
  const picked = players.filter((p) => squad.includes(p.id))
  // Number text per player as typed; only differences from the pool number are saved.
  const [numberText, setNumberText] = useState<Record<string, string>>(() =>
    Object.fromEntries(picked.map((p) => [p.id, String(numbers[p.id] ?? p.number ?? '')])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = (id: string): number | null => {
    const s = numberText[id]?.trim() ?? ''
    return /^\d{1,3}$/.test(s) ? Number(s) : null
  }
  const clashes = duplicateNumbers(picked.map((p) => parsed(p.id)))

  async function onSave() {
    setBusy(true)
    try {
      const overrides: Record<string, number> = {}
      for (const p of picked) {
        const n = parsed(p.id)
        if (n !== null && n !== p.number) overrides[p.id] = n
      }
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
    <Sheet title={t('squad.numbersTitle')} onClose={onClose}>
      <p className="muted small">{t('squad.numberHelp')}</p>
      {[...clashes].map((n) => (
        <p key={n} className="notice warn-notice small">
          {t('squad.numberClash', { number: n })}
        </p>
      ))}
      {POSITIONS.map((pos) => {
        const group = picked.filter((p) => p.mainPosition === pos)
        if (group.length === 0) return null
        return (
          <section key={pos} className="stack-tight">
            <h3 className={`group-title pos-${pos}`}>{t(`slot.${pos}`)}</h3>
            <ul className="check-list">
              {group.map((p) => {
                const n = parsed(p.id)
                const clash = n !== null && clashes.has(n)
                return (
                  <li key={p.id} className="check-row">
                    <span className="grow">{fullName(p)}</span>
                    <input
                      className={`squad-number ${clash ? 'clash' : ''} ${n !== p.number ? 'changed' : ''}`}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label={t('squad.tournamentNumber')}
                      title={t('squad.tournamentNumber')}
                      value={numberText[p.id] ?? ''}
                      onChange={(e) => setNumberText((m) => ({ ...m, [p.id]: e.target.value }))}
                    />
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
          {t('squad.saveNumbers')}
        </button>
      </div>
    </Sheet>
  )
}
