import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'

export function Layout() {
  const { t } = useI18n()
  const auth = useAuth()

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          {t('app.name')}
        </NavLink>
        <div className="topbar-actions">
          <LanguageSwitch />
          <button className="btn btn-small" onClick={() => void auth.signOut()}>
            {t('nav.signOut')}
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="tabbar">
        <NavLink to="/" end>
          {t('nav.home')}
        </NavLink>
        <NavLink to="/players">{t('nav.players')}</NavLink>
        <NavLink to="/tournaments">{t('nav.tournaments')}</NavLink>
        <NavLink to="/coaches">{t('nav.coaches')}</NavLink>
      </nav>
    </div>
  )
}
