import { useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { editorOf, type Cap, type Game } from './model'
import { whenSaved } from '../lib/online'
import { deleteGame, saveGame } from './store'
import { useTeam } from '../teams/TeamProvider'

type Props = {
  tournamentId: string
  game: Game | null
  defaultDate: string
  onClose: () => void
  onDeleted?: () => void
}

export function GameEditor({ tournamentId, game, defaultDate, onClose, onDeleted }: Props) {
  const { t } = useI18n()
  const { teamId } = useTeam()
  const auth = useAuth()
  const [opponent, setOpponent] = useState(game?.opponent ?? '')
  const [label, setLabel] = useState(game?.label ?? '')
  const [date, setDate] = useState(game?.date ?? defaultDate)
  const [time, setTime] = useState(game?.time ?? '')
  const [cap, setCap] = useState<Cap | null>(game?.cap ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!opponent.trim()) return setError(t('game.error.opponent'))
    setBusy(true)
    setError(null)
    try {
      await whenSaved(saveGame(teamId, tournamentId, game?.id ?? null, { opponent, label, date, time, cap }, editorOf(auth)))
      onClose()
    } catch (err) {
      setError(t('app.error', { message: (err as Error).message }))
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!game || !window.confirm(t('game.deleteConfirm', { name: game.label || game.opponent }))) return
    setBusy(true)
    try {
      await whenSaved(deleteGame(teamId, tournamentId, game.id))
      onClose()
      onDeleted?.()
    } catch (err) {
      setError(t('app.error', { message: (err as Error).message }))
      setBusy(false)
    }
  }

  const caps: (Cap | null)[] = ['blue', 'white', null]

  return (
    <Sheet title={game ? t('game.editTitle') : t('game.addTitle')} onClose={onClose}>
      <form onSubmit={onSubmit} className="stack">
        <div className="row">
          <label className="field grow">
            <span>{t('game.opponent')}</span>
            <input required value={opponent} placeholder="Denmark" onChange={(e) => setOpponent(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('game.label')}</span>
            <input value={label} placeholder={t('game.labelHelp')} size={12} onChange={(e) => setLabel(e.target.value)} />
          </label>
        </div>
        <div className="row">
          <label className="field grow">
            <span>{t('game.date')}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field grow">
            <span>{t('game.time')}</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <fieldset className="field">
          <legend>{t('game.cap')}</legend>
          <div className="segmented">
            {caps.map((c) => (
              <button
                key={c ?? 'none'}
                type="button"
                className={cap === c ? 'active' : ''}
                aria-pressed={cap === c}
                onClick={() => setCap(c)}
              >
                {c && <span className={`cap-dot cap-${c}`} />} {t(c ? `cap.${c}` : 'cap.none')}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="error">{error}</p>}

        <div className="sheet-actions">
          {game && (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onDelete()}>
              {t('game.delete')}
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            {t('game.cancel')}
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {t('game.save')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
