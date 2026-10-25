import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useTeamState } from './TeamProvider'

/** Shows the team's pages once a team is open, or says why none is. */
export function TeamGate() {
  const { t } = useI18n()
  const auth = useAuth()
  const state = useTeamState()
  const admin = auth.status === 'coach' && auth.role === 'admin'

  if (state.status === 'ready') return <Outlet key={state.team.id} />
  if (state.status === 'loading') return <p className="muted">{t('app.loading')}</p>
  if (state.status === 'migrating') return <p className="notice">{t('team.migrating')}</p>
  if (state.status === 'error') return <p className="error">{t('app.error', { message: state.message })}</p>
  return (
    <div className="card stack">
      <h2>{t('team.noneTitle')}</h2>
      <p className="muted">{t(admin ? 'team.noneAdmin' : 'team.none')}</p>
      {admin && (
        <Link to="/admin/teams" className="btn btn-primary">
          {t('admin.teams.add')}
        </Link>
      )}
    </div>
  )
}
