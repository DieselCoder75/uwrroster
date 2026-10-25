import { useState, type FormEvent } from 'react'
import { Sheet } from '../components/Sheet'
import { useI18n } from '../i18n'
import { formatStamp } from '../lib/dates'
import { editorName, findVersion, versionLabel, type Editor, type Game, type LineupVersion } from './model'
import { createVersion, deleteVersion, saveVersion, setActiveVersion } from './store'

type Props = {
  tid: string
  game: Game
  /** The version open on the page. */
  version: LineupVersion
  by: Editor | null
  onOpen: (versionId: string) => void
  /** Runs a save, showing progress and errors on the page. */
  write: (save: () => Promise<void>) => Promise<void>
}

/** Picks which lineup version to look at, and makes, renames, deletes or puts versions in use. */
export function VersionBar({ tid, game, version, by, onOpen, write }: Props) {
  const { t, lang } = useI18n()
  const [sheet, setSheet] = useState<'new' | 'rename' | null>(null)
  const active = findVersion(game, null)
  const inUse = version.id === active.id

  // Games from before versions don't know who made their lineup.
  const meta = [
    version.createdBy
      ? t('version.created', { name: editorName(version.createdBy), when: formatStamp(version.createdAt, lang) }).trim()
      : version.createdAt > 0 && t('version.createdAt', { when: formatStamp(version.createdAt, lang) }),
    version.updatedBy && t('version.updated', { name: editorName(version.updatedBy), when: formatStamp(version.updatedAt, lang) }).trim(),
  ].filter(Boolean)

  function onDelete() {
    if (!window.confirm(t('version.deleteConfirm', { name: versionLabel(version) }))) return
    onOpen(active.id)
    void write(() => deleteVersion(tid, game, version))
  }

  return (
    <section className="card version-bar">
      <div className="version-row">
        <label className="field grow">
          <span>{t('version.title')}</span>
          <select value={version.id} onChange={(e) => onOpen(e.target.value)}>
            {game.versions.map((v) => (
              <option key={v.id} value={v.id}>
                {versionLabel(v)}
                {v.id === active.id ? ` · ${t('version.inUse')}` : ''}
              </option>
            ))}
          </select>
        </label>
        {inUse ? (
          <span className="status-pill ok">✓ {t('version.inUse')}</span>
        ) : (
          <button className="btn btn-small btn-primary" onClick={() => void write(() => setActiveVersion(tid, game, version))}>
            {t('version.use')}
          </button>
        )}
      </div>
      {meta.length > 0 && <p className="muted small">{meta.join(' · ')}</p>}
      <div className="version-actions">
        <button className="btn btn-small" onClick={() => setSheet('new')}>
          + {t('version.new')}
        </button>
        <button className="btn btn-small" onClick={() => setSheet('rename')}>
          {t('version.rename')}
        </button>
        {!inUse && (
          <button className="btn btn-small btn-danger" onClick={onDelete}>
            {t('version.delete')}
          </button>
        )}
      </div>
      {game.versions.length > 1 && <p className="muted small">{t('version.help')}</p>}

      {sheet && (
        <VersionSheet
          mode={sheet}
          game={game}
          version={version}
          onClose={() => setSheet(null)}
          onSubmit={(name, base) => {
            setSheet(null)
            if (sheet === 'rename') return void write(() => saveVersion(tid, game, { ...version, name }, by))
            const { id, saved } = createVersion(tid, game, base, name, by)
            onOpen(id)
            void write(() => saved)
          }}
        />
      )}
    </section>
  )
}

type SheetProps = {
  mode: 'new' | 'rename'
  game: Game
  version: LineupVersion
  onClose: () => void
  onSubmit: (name: string, base: LineupVersion | null) => void
}

function VersionSheet({ mode, game, version, onClose, onSubmit }: SheetProps) {
  const { t } = useI18n()
  const [name, setName] = useState(mode === 'rename' ? version.name : '')
  // A new version starts from the one open on the page unless another (or none) is picked.
  const [baseId, setBaseId] = useState(version.id)

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit(name.trim(), game.versions.find((v) => v.id === baseId) ?? null)
  }

  return (
    <Sheet title={t(mode === 'new' ? 'version.new' : 'version.renameTitle')} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>{t('version.name')}</span>
          <input value={name} maxLength={60} placeholder={t('version.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
        </label>
        {mode === 'new' && (
          <label className="field">
            <span>{t('version.base')}</span>
            <select value={baseId} onChange={(e) => setBaseId(e.target.value)}>
              {game.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {versionLabel(v)}
                </option>
              ))}
              <option value="">{t('version.empty')}</option>
            </select>
          </label>
        )}
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('game.cancel')}
          </button>
          <button className="btn btn-primary">{t(mode === 'new' ? 'version.create' : 'game.save')}</button>
        </div>
      </form>
    </Sheet>
  )
}
