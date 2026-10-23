import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'

export function HomePage() {
  const { t } = useI18n()
  const auth = useAuth()
  const email = auth.status === 'coach' ? auth.email : ''

  return (
    <div className="stack">
      <h1>{t('home.welcome', { email })}</h1>
      <p className="muted">{t('home.intro')}</p>
      <div className="tiles">
        <Link to="/players" className="tile card">
          <h2>{t('nav.players')}</h2>
          <p className="muted">{t('home.playersDesc')}</p>
        </Link>
        <Link to="/tournaments" className="tile card">
          <h2>{t('nav.tournaments')}</h2>
          <p className="muted">{t('home.tournamentsDesc')}</p>
        </Link>
        <Link to="/coaches" className="tile card">
          <h2>{t('nav.coaches')}</h2>
          <p className="muted">{t('home.coachesDesc')}</p>
        </Link>
      </div>
    </div>
  )
}
