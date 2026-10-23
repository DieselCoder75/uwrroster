import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { POSITIONS, fullName, normalizePlayer, validatePlayer, type CaptainRole, type Player, type PlayerInput, type Position } from './model'
import { deletePlayer, savePlayer } from './store'

const EMPTY: PlayerInput = {
  number: null,
  firstName: '',
  lastName: '',
  mainPosition: 'ATT',
  otherPositions: [],
  locked: false,
  captain: null,
  active: true,
}

type Props = {
  /** The player to edit, or null to add a new one. */
  player: Player | null
  onClose: () => void
}

export function PlayerEditor({ player, onClose }: Props) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState<PlayerInput>(() => {
    if (!player) return EMPTY
    const { id: _id, ...rest } = player
    return rest
  })
  const [numberText, setNumberText] = useState(player?.number?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const set = <K extends keyof PlayerInput>(key: K, value: PlayerInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  function toggleOther(pos: Position) {
    set('otherPositions', form.otherPositions.includes(pos) ? form.otherPositions.filter((p) => p !== pos) : [...form.otherPositions, pos])
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = numberText.trim()
    const input = normalizePlayer({ ...form, number: trimmed === '' ? null : Number(trimmed) })
    const invalid = validatePlayer(input)
    if (invalid) {
      setError(t(invalid === 'number' ? 'player.error.number' : 'player.error.name'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await savePlayer(player?.id ?? null, input)
      onClose()
    } catch (err) {
      setError(t('app.error', { message: (err as Error).message }))
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!player || !window.confirm(t('player.deleteConfirm', { name: fullName(player) }))) return
    setBusy(true)
    try {
      await deletePlayer(player.id)
      onClose()
    } catch (err) {
      setError(t('app.error', { message: (err as Error).message }))
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="sheet" onClose={onClose} onCancel={onClose}>
      <form onSubmit={onSubmit} className="stack">
        <div className="sheet-head">
          <h2>{player ? t('player.editTitle') : t('player.addTitle')}</h2>
          <button type="button" className="icon-btn" aria-label={t('player.cancel')} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="row">
          <label className="field number-field">
            <span>{t('player.number')}</span>
            <input inputMode="numeric" pattern="[0-9]*" value={numberText} onChange={(e) => setNumberText(e.target.value)} />
          </label>
          <label className="field grow">
            <span>{t('player.firstName')}</span>
            <input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </label>
          <label className="field grow">
            <span>{t('player.lastName')}</span>
            <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </label>
        </div>

        <fieldset className="field">
          <legend>{t('player.mainPosition')}</legend>
          <div className="segmented">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                className={`pos-${pos} ${form.mainPosition === pos ? 'active' : ''}`}
                aria-pressed={form.mainPosition === pos}
                onClick={() => set('mainPosition', pos)}
              >
                {t(`pos.${pos}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={form.locked} onChange={(e) => set('locked', e.target.checked)} />
          <span>
            <strong>🔒 {t('player.lock')}</strong>
            <span className="muted small">{t('player.lockHelp')}</span>
          </span>
        </label>

        {!form.locked && (
          <fieldset className="field">
            <legend>{t('player.otherPositions')}</legend>
            <div className="chips">
              {POSITIONS.filter((pos) => pos !== form.mainPosition).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`chip pos-${pos} ${form.otherPositions.includes(pos) ? 'active' : ''}`}
                  aria-pressed={form.otherPositions.includes(pos)}
                  onClick={() => toggleOther(pos)}
                >
                  {t(`pos.${pos}`)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="row">
          <label className="field grow">
            <span>{t('player.captain')}</span>
            <select
              value={form.captain ?? ''}
              onChange={(e) => set('captain', (e.target.value || null) as CaptainRole)}
            >
              <option value="">{t('player.captain.none')}</option>
              <option value="captain">{t('captain.captain')}</option>
              <option value="viceCaptain">{t('captain.viceCaptain')}</option>
            </select>
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
          <span>
            <strong>{t('player.active')}</strong>
            <span className="muted small">{t('player.activeHelp')}</span>
          </span>
        </label>

        {error && <p className="error">{error}</p>}

        <div className="sheet-actions">
          {player && (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onDelete()}>
              {t('player.delete')}
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            {t('player.cancel')}
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {t('player.save')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
