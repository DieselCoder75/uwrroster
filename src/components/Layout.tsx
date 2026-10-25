import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useOnline } from '../lib/online'
import { Brand, Footer } from './Brand'
import { LanguageSwitch } from './LanguageSwitch'

export function Layout() {
  const { t } = useI18n()
  const auth = useAuth()
  const online = useOnline()
  const [menuOpen, setMenuOpen] = useState(false)

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
          <NavLink to="/coaches">{t('nav.coaches')}</NavLink>
          <div className="nav-tools">
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
