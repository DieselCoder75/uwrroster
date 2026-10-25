import { useState } from 'react'
import { PageHero } from '../components/PageHero'
import { ViewOnly } from '../components/ViewOnly'
import { SearchBox } from '../components/SearchBox'
import { useI18n } from '../i18n'
import { POSITIONS, matchesSearch, type Player, type Position } from './model'
import { PlayerEditor } from './PlayerEditor'
import { playerPhoto } from './photos'
import { importRoster, missingFromPool, usePlayers } from './store'
import { WEBSITE_ROSTER } from './websiteRoster'
import { DEFAULT_TEAM_ID } from '../teams/model'
import { useTeam } from '../teams/TeamProvider'

/** Typical pool size before a squad is picked; more is allowed but flagged. */
const POOL_LIMIT = 50

type Filter = 'all' | Position | 'inactive'

export function PlayersPage() {
  const { t } = useI18n()
  const { teamId, canCoach } = useTeam()
  const state = usePlayers(teamId)
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
  // The website's roster is the default team's own; other teams add their players by hand.
  const missing = canCoach && teamId === DEFAULT_TEAM_ID ? missingFromPool(WEBSITE_ROSTER, players) : []

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
      await importRoster(teamId, missing)
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
      <PageHero
        page="players"
        tag={t('players.tag')}
        title={t('players.title')}
        count={active.length}
        countLabel={t('players.inPool')}
        actions={
          canCoach && (
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              + {t('players.add')}
            </button>
          )
        }
      />

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
          <div className="tools">
            <SearchBox value={query} onChange={setQuery} placeholder={t('players.search')} />
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
          </div>

          {shown.length === 0 ? (
            <p className="muted">{t('players.noMatches')}</p>
          ) : (
            <ul className="player-grid">
              {shown.map((p) => (
                <li key={p.id}>
                  <PlayerCard player={p} onClick={canCoach ? () => setEditing(p) : undefined} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {players.length === 0 && missing.length === 0 && <p className="muted">{t('players.empty')}</p>}
      {!canCoach && <ViewOnly />}

      {editing && <PlayerEditor player={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function PlayerCard({ player: p, onClick }: { player: Player; onClick?: () => void }) {
  const { t } = useI18n()
  const photo = playerPhoto(p)
  return (
    <button className={`player-card pos-${p.mainPosition} ${p.active ? '' : 'inactive'}`} onClick={onClick} disabled={!onClick}>
      {photo && <span className="player-photo" style={{ backgroundImage: `url(${photo})` }} />}
      <span className="player-big-num" aria-hidden="true">
        {p.number ?? ''}
      </span>
      <span className="player-main">
        <span className="bar" />
        <span className="player-num">#{p.number ?? '–'}</span>
        <span className="player-name">
          {p.firstName}
          <br />
          {p.lastName}
        </span>
        <span className="player-pos">
          <span className="pos-label">{t(`pos.${p.mainPosition}`)}</span>
          {p.locked ? (
            <span title={t('players.locked')}>🔒</span>
          ) : (
            p.otherPositions.map((pos) => (
              <span key={pos} className={`pos-tag pos-${pos}`} title={t(`pos.${pos}`)}>
                {t(`pos.short.${pos}`)}
              </span>
            ))
          )}
        </span>
        {p.captain && <span className="player-capt">{t(`captain.${p.captain}`)}</span>}
        {!p.active && <span className="muted small">{t('players.inactive')}</span>}
      </span>
    </button>
  )
}
