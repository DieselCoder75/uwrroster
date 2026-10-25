import { useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { useI18n } from '../i18n'
import { DEFAULT_SQUAD_SIZE, type Tournament } from './model'
import { whenSaved } from '../lib/online'
import { deleteTournament, saveTournament } from './store'

type Props = {
  tournament: Tournament | null
  onClose: () => void
  onSaved?: (id: string) => void
  onDeleted?: () => void
}

export function TournamentEditor({ tournament, onClose, onSaved, onDeleted }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState(tournament?.name ?? '')
  const [location, setLocation] = useState(tournament?.location ?? '')
  const [startDate, setStartDate] = useState(tournament?.startDate ?? '')
  const [endDate, setEndDate] = useState(tournament?.endDate ?? '')
  const [squadSize, setSquadSize] = useState(String(tournament?.squadSize ?? DEFAULT_SQUAD_SIZE))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const size = Number(squadSize)
    if (!name.trim()) return setError(t('tournament.error.name'))
    if (!Number.isInteger(size) || size < 12 || size > 40) return setError(t('tournament.error.size'))
    setBusy(true)
    setError(null)
    try {
      const { id, saved } = saveTournament(tournament?.id ?? null, {
        name,
        location,
        startDate,
        endDate: endDate || startDate,
        squadSize: size,
        squad: tournament?.squad ?? [],
        numbers: tournament?.numbers ?? {},
      })
      await whenSaved(saved)
      onClose()
      onSaved?.(id)
    } catch (err) {
      setError(t('app.error', { message: (err as Error).message }))
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!tournament || !window.confirm(t('tournament.deleteConfirm', { name: tournament.name }))) return
    setBusy(true)
    try {
      await whenSaved(deleteTournament(tournament.id))
      onClose()
      onDeleted?.()
    } catch (err) {
      setError(t('app.error', { message: (err as Error).message }))
      setBusy(false)
    }
  }

  return (
    <Sheet title={tournament ? t('tournament.editTitle') : t('tournament.addTitle')} onClose={onClose}>
      <form onSubmit={onSubmit} className="stack">
        <label className="field">
          <span>{t('tournament.name')}</span>
          <input required value={name} placeholder="5-Nations 2027" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>{t('tournament.location')}</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <div className="row">
          <label className="field grow">
            <span>{t('tournament.startDate')}</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field grow">
            <span>{t('tournament.endDate')}</span>
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>{t('tournament.squadSize')}</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            className="number-field"
            value={squadSize}
            onChange={(e) => setSquadSize(e.target.value)}
          />
          <span className="muted small">{t('tournament.squadSizeHelp')}</span>
        </label>

        {error && <p className="error">{error}</p>}

        <div className="sheet-actions">
          {tournament && (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onDelete()}>
              {t('tournament.delete')}
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            {t('tournament.cancel')}
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {t('tournament.save')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
