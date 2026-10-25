import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useOnline } from '../lib/online'
import { Brand, Footer } from './Brand'
import { LanguageSwitch } from './LanguageSwitch'
import { useTeamState } from '../teams/TeamProvider'

export function Layout() {
  const { t } = useI18n()
  const auth = useAuth()
  const online = useOnline()
  const [menuOpen, setMenuOpen] = useState(false)
  const admin = auth.status === 'coach' && auth.role === 'admin'

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand-link" aria-label={t('nav.home')}>
          <Brand />
        </NavLink>
        <button
          type="button"
          className={`nav-burger ${menuOpen ? 'open' : ''}`}
          aria-label={t('nav.menu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
        {/* Close the phone menu after choosing a page. */}
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`} onClick={(e) => (e.target as HTMLElement).closest('a') && setMenuOpen(false)}>
          <NavLink to="/" end>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/players">{t('nav.players')}</NavLink>
          <NavLink to="/tournaments">{t('nav.tournaments')}</NavLink>
          {admin && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
          <div className="nav-tools">
            <TeamSwitch onSwitch={() => setMenuOpen(false)} />
            <LanguageSwitch />
            <button className="btn btn-small" onClick={() => void auth.signOut()}>
              {t('nav.signOut')}
            </button>
          </div>
        </nav>
      </header>
      <div className={`nav-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />

      {!online && (
        <div className="offline-banner" role="status">
          {t('net.offline')}
        </div>
      )}

      <main className="content">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}

/** Picks the team to work on, for people in more than one team. */
function TeamSwitch({ onSwitch }: { onSwitch: () => void }) {
  const { t } = useI18n()
  const state = useTeamState()
  const navigate = useNavigate()
  if (state.status !== 'ready' || state.teams.length < 2) return null
  return (
    <label className="team-switch">
      <span className="sr-only">{t('team.switch')}</span>
      <select
        value={state.team.id}
        onChange={(e) => {
          state.selectTeam(e.target.value)
          onSwitch()
          // Tournaments and games belong to the team, so start over from its home page.
          navigate('/')
        }}
      >
        {state.teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  )
}
