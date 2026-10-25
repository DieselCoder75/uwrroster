import { useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { useI18n } from '../i18n'
import { DEFAULT_SQUAD_SIZE, type EventKind, type Tournament } from './model'
import { CAMP_SIZE, DEFAULT_POOLS, MAX_POOLS, resizePools } from './camp'
import { whenSaved } from '../lib/online'
import { deleteTournament, saveTournament } from './store'

type Props = {
  tournament: Tournament | null
  /** What a new event is to start as; the coach can still switch. */
  defaultKind?: EventKind
  onClose: () => void
  onSaved?: (id: string) => void
  onDeleted?: () => void
}

export function TournamentEditor({ tournament, defaultKind = 'tournament', onClose, onSaved, onDeleted }: Props) {
  const { t } = useI18n()
  const [kind, setKind] = useState<EventKind>(tournament?.kind ?? defaultKind)
  const camp = kind === 'camp'
  const [poolCount, setPoolCount] = useState(String(tournament?.pools.length || DEFAULT_POOLS))
  const [name, setName] = useState(tournament?.name ?? '')
  const [location, setLocation] = useState(tournament?.location ?? '')
  const [startDate, setStartDate] = useState(tournament?.startDate ?? '')
  const [endDate, setEndDate] = useState(tournament?.endDate ?? '')
  const [squadSize, setSquadSize] = useState(String(tournament?.squadSize ?? (defaultKind === 'camp' ? CAMP_SIZE : DEFAULT_SQUAD_SIZE)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const size = Number(squadSize)
    const pools = Number(poolCount)
    if (!name.trim()) return setError(t('tournament.error.name'))
    if (camp) {
      if (!Number.isInteger(size) || size < 2 || size > 50) return setError(t('camp.error.size'))
      if (!Number.isInteger(pools) || pools < 1 || pools > MAX_POOLS) return setError(t('camp.error.pools', { max: MAX_POOLS }))
      const freed = (tournament?.pools ?? []).slice(pools).some((p) => p.blue.length + p.white.length > 0)
      if (freed && !window.confirm(t('camp.poolsShrinkConfirm'))) return
    } else if (!Number.isInteger(size) || size < 12 || size > 40) return setError(t('tournament.error.size'))
    setBusy(true)
    setError(null)
    try {
      const { id, saved } = saveTournament(tournament?.id ?? null, {
        kind,
        name,
        location,
        startDate,
        endDate: endDate || startDate,
        squadSize: size,
        squad: tournament?.squad ?? [],
        numbers: tournament?.numbers ?? {},
        // Games stay stored if a tournament is switched to a camp, and the pools if it is switched back.
        pools: camp ? resizePools(tournament?.pools ?? [], pools) : (tournament?.pools ?? []),
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
    if (!tournament || !window.confirm(t(camp ? 'camp.deleteConfirm' : 'tournament.deleteConfirm', { name: tournament.name }))) return
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
    <Sheet
      title={tournament ? t(camp ? 'camp.editTitle' : 'tournament.editTitle') : t(camp ? 'camp.addTitle' : 'tournament.addTitle')}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="stack">
        <div className="segmented" role="radiogroup" aria-label={t('event.kind')}>
          {(['tournament', 'camp'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className={kind === k ? 'active' : ''}
              onClick={() => {
                setKind(k)
                // Camps are usually bigger than a tournament squad.
                if (!tournament && k === 'camp' && squadSize === String(DEFAULT_SQUAD_SIZE)) setSquadSize(String(CAMP_SIZE))
                if (!tournament && k === 'tournament' && squadSize === String(CAMP_SIZE)) setSquadSize(String(DEFAULT_SQUAD_SIZE))
              }}
            >
              {t(`event.kind.${k}`)}
            </button>
          ))}
        </div>
        <label className="field">
          <span>{t('tournament.name')}</span>
          <input required value={name} placeholder={camp ? 'SWE-FIN Camp III' : '5-Nations 2027'} onChange={(e) => setName(e.target.value)} />
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
        <div className="row">
          <label className="field">
            <span>{t(camp ? 'camp.size' : 'tournament.squadSize')}</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              className="number-field"
              value={squadSize}
              onChange={(e) => setSquadSize(e.target.value)}
            />
          </label>
          {camp && (
            <label className="field">
              <span>{t('camp.poolCount')}</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                className="number-field"
                value={poolCount}
                onChange={(e) => setPoolCount(e.target.value)}
              />
            </label>
          )}
        </div>
        <span className="muted small">{t(camp ? 'camp.sizeHelp' : 'tournament.squadSizeHelp')}</span>

        {error && <p className="error">{error}</p>}

        <div className="sheet-actions">
          {tournament && (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onDelete()}>
              {t(camp ? 'camp.delete' : 'tournament.delete')}
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
