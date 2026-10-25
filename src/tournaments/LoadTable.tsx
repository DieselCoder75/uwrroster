import { useI18n } from '../i18n'
import { formatDay } from '../lib/dates'
import { POSITIONS, fullName, type Player } from '../players/model'
import { gameTitle, plannedPeriods, tournamentLoad, tournamentNumber, type Game, type Slot, type Tournament } from './model'

/** Periods each squad player plays in each game, so the coach can share the load evenly. */
export function LoadTable({ tour, games, players }: { tour: Tournament; games: Game[]; players: Player[] }) {
  const { t, lang } = useI18n()
  const squad = players.filter((p) => tour.squad.includes(p.id))
  const load = tournamentLoad(games, tour.squad)
  const planned = plannedPeriods(games, tour.squad)
  // Grouped by main position like the squad list, so players who share the work sit together.
  const rows = POSITIONS.flatMap((pos) => squad.filter((p) => p.mainPosition === pos))
  const average = rows.length ? rows.reduce((n, p) => n + (load.get(p.id)?.periods ?? 0), 0) / rows.length : 0

  const cell = (slot: Slot | null, i: number) => {
    if (slot === null) return <span key={i} className="load-box out" />
    if (slot === 'SUB') return <span key={i} className="load-box bench" title={t('load.bench')} />
    return (
      <span key={i} className={`load-box pos-${slot}`} title={t(`pos.${slot}`)}>
        {t(`pos.short.${slot}`)}
      </span>
    )
  }

  return (
    <section className="card stack">
      <div className="section-head">
        <h2>{t('load.title')}</h2>
        <span className="muted small">{t('load.planned', { count: planned })}</span>
      </div>
      <p className="muted small">{t('load.help')}</p>
      {games.length === 0 || squad.length === 0 ? (
        <p className="muted">{t('load.empty')}</p>
      ) : (
        <div className="load-scroll">
          <table className="load-table">
            <thead>
              <tr>
                <th className="load-player">{t('load.player')}</th>
                <th className="load-total">{t('load.periods')}</th>
                {games.map((g) => (
                  <th key={g.id} title={gameTitle(g)}>
                    <span className="load-game-day">{formatDay(g.date, lang)}</span>
                    <span className="load-game-time">{g.time || '–'}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const l = load.get(p.id)
                const periods = l?.periods ?? 0
                const level = planned === 0 ? '' : periods > average + 1 ? 'high' : periods < average - 1 ? 'low' : ''
                return (
                  <tr key={p.id}>
                    <th className="load-player" scope="row">
                      <span className="load-player-in">
                        <span className={`mini-num pos-${p.mainPosition}`}>{tournamentNumber(tour, p) ?? '–'}</span>
                        <span className="load-name">{fullName(p)}</span>
                      </span>
                    </th>
                    <td className={`load-total ${level}`} title={level ? t(`load.${level}`) : undefined}>
                      {periods}
                    </td>
                    {games.map((g) => (
                      <td key={g.id}>
                        <span className="load-cell">{(l?.byGame[g.id] ?? [null, null]).map(cell)}</span>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="load-legend muted small">
        <span>
          <span className="load-box pos-DEF">{t('pos.short.DEF')}</span> {t('load.legendPlayed')}
        </span>
        <span>
          <span className="load-box bench" /> {t('load.bench')}
        </span>
        <span>
          <span className="load-box out" /> {t('load.legendOut')}
        </span>
      </p>
    </section>
  )
}
