import { useState } from 'react'
import { useI18n } from '../i18n'
import { POSITIONS, duplicateNumbers, fullName, matchesSearch, type Player, type Position } from './model'
import { PlayerEditor } from './PlayerEditor'
import { importRoster, missingFromPool, usePlayers } from './store'
import { WEBSITE_ROSTER } from './websiteRoster'

/** Typical pool size before a squad is picked; more is allowed but flagged. */
const POOL_LIMIT = 50

type Filter = 'all' | Position | 'inactive'

export function PlayersPage() {
  const { t } = useI18n()
  const state = usePlayers()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Player | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (state.status === 'loading') return <p className="muted">{t('app.loading')}</p>
  if (state.status === 'error') return <p className="error">{t('app.error', { message: state.message })}</p>

  const players = state.players
  const active = players.filter((p) => p.active)
  const dupes = duplicateNumbers(players)
  const missing = missingFromPool(WEBSITE_ROSTER, players)

  const shown = players.filter((p) => {
    if (!matchesSearch(p, query)) return false
    if (filter === 'inactive') return !p.active
    if (!p.active) return false
    return filter === 'all' || p.mainPosition === filter
  })

  async function onImport() {
    setImporting(true)
    setError(null)
    try {
      await importRoster(missing)
      setNotice(t('players.imported', { count: missing.length }))
    } catch (e) {
      setError(t('app.error', { message: (e as Error).message }))
    } finally {
      setImporting(false)
    }
  }

  const filters: Filter[] = ['all', ...POSITIONS, 'inactive']
  const filterLabel = (f: Filter) =>
    f === 'all' ? t('players.filter.all') : f === 'inactive' ? t('players.filter.inactive') : t(`pos.${f}`)
  const filterCount = (f: Filter) =>
    f === 'all' ? active.length : f === 'inactive' ? players.length - active.length : active.filter((p) => p.mainPosition === f).length

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{t('players.title')}</h1>
          <p className="muted">{t('players.count', { count: active.length })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + {t('players.add')}
        </button>
      </div>

      {missing.length > 0 && (
        <div className="card stack">
          <p>
            {players.length === 0
              ? t('players.importIntro')
              : t('players.importMissing', { count: missing.length })}
          </p>
          <button className="btn btn-primary" disabled={importing} onClick={() => void onImport()}>
            {players.length === 0 ? t('players.import', { count: missing.length }) : t('players.importButton')}
          </button>
        </div>
      )}

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}
      {active.length > POOL_LIMIT && <p className="notice">{t('players.overLimit', { limit: POOL_LIMIT })}</p>}

      {players.length > 0 && (
        <>
          <input
            type="search"
            className="search"
            placeholder={t('players.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips scroll-x" role="group">
            {filters.map((f) => (
              <button
                key={f}
                className={`chip ${f !== 'all' && f !== 'inactive' ? `pos-${f}` : ''} ${filter === f ? 'active' : ''}`}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {filterLabel(f)} <span className="chip-count">{filterCount(f)}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="muted">{t('players.noMatches')}</p>
          ) : (
            <ul className="player-grid">
              {shown.map((p) => (
                <li key={p.id}>
                  <PlayerCard player={p} duplicate={p.number !== null && dupes.has(p.number)} onClick={() => setEditing(p)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {players.length === 0 && missing.length === 0 && <p className="muted">{t('players.empty')}</p>}

      {editing && <PlayerEditor player={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function PlayerCard({ player: p, duplicate, onClick }: { player: Player; duplicate: boolean; onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button className={`player-card card ${p.active ? '' : 'inactive'}`} onClick={onClick}>
      <span className={`player-num pos-${p.mainPosition}`} title={duplicate ? t('players.duplicateNumber') : undefined}>
        {p.number ?? '–'}
        {duplicate && <span className="dup">!</span>}
      </span>
      <span className="player-main">
        <span className="player-name">
          {fullName(p)}
          {p.captain && (
            <span className="badge" title={t(`captain.${p.captain}`)}>
              {t(`captain.short.${p.captain}`)}
            </span>
          )}
        </span>
        <span className="player-pos">
          <span className={`pos-tag pos-${p.mainPosition} main`}>{t(`pos.${p.mainPosition}`)}</span>
          {p.locked ? (
            <span className="muted small" title={t('players.locked')}>
              🔒
            </span>
          ) : (
            p.otherPositions.map((pos) => (
              <span key={pos} className={`pos-tag pos-${pos}`} title={t(`pos.${pos}`)}>
                {t(`pos.short.${pos}`)}
              </span>
            ))
          )}
          {!p.active && <span className="muted small">{t('players.inactive')}</span>}
        </span>
      </span>
    </button>
  )
}
