import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type Role } from '../auth/AuthProvider'
import { sendLink } from '../auth/signInLink'
import { PageHero } from '../components/PageHero'
import { useI18n } from '../i18n'
import { isValidEmail, normalizeEmail } from '../lib/email'
import { teamRole, type Team, type TeamRole } from '../teams/model'
import { removeFromTeams, saveTeam, setTeamMember } from '../teams/store'
import { useTeamState } from '../teams/TeamProvider'
import { addUser, removeUser, setUserRole, useUsers, type AppUser } from './users'

/** The admin panel: who may use the app, and the teams. */
export function AdminPage({ tab }: { tab: 'users' | 'teams' }) {
  const { t } = useI18n()
  const { users, error } = useUsers()
  const state = useTeamState()
  const teams = state.status === 'ready' || state.status === 'none' ? state.teams : []

  return (
    <div className="stack">
      <PageHero
        image="naisten-joukkue-altaalla"
        tag={t('admin.tag')}
        title={t('admin.title')}
        count={tab === 'users' ? users.length : teams.length}
        countLabel={t(tab === 'users' ? 'admin.users.countLabel' : 'admin.teams.countLabel')}
      />

      <div className="segmented admin-tabs" role="tablist">
        <Link to="/admin" role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'active' : ''}>
          {t('admin.users')}
        </Link>
        <Link to="/admin/teams" role="tab" aria-selected={tab === 'teams'} className={tab === 'teams' ? 'active' : ''}>
          {t('admin.teams')}
        </Link>
      </div>

      {error && <p className="error">{t('app.error', { message: error })}</p>}
      {tab === 'users' ? <UsersPanel users={users} teams={teams} /> : <TeamsPanel teams={teams} />}
    </div>
  )
}

function useRunner() {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const messages = (
    <>
      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{t('app.error', { message: error })}</p>}
    </>
  )
  return { busy, run, setNotice, messages }
}

function UsersPanel({ users, teams }: { users: AppUser[]; teams: Team[] }) {
  const { t } = useI18n()
  const auth = useAuth()
  const myEmail = auth.status === 'coach' ? auth.email : ''
  const { busy, run, setNotice, messages } = useRunner()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('coach')
  const [teamId, setTeamId] = useState(teams.length === 1 ? teams[0].id : '')
  const [teamRoleChoice, setTeamRoleChoice] = useState<TeamRole>('coach')

  function onInvite(e: FormEvent) {
    e.preventDefault()
    const target = normalizeEmail(email)
    if (!isValidEmail(target)) return
    void run(async () => {
      const added = await addUser(target, role, myEmail)
      const team = teams.find((x) => x.id === teamId)
      if (team) await setTeamMember(team, target, teamRoleChoice)
      if (!added && !team) {
        setNotice(t('coaches.alreadyInvited', { email: target }))
        return
      }
      if (added) await sendLink(target, false)
      setEmail('')
      setNotice(added ? t('coaches.invited', { email: target }) : t('admin.users.addedToTeam', { email: target, team: team?.name ?? '' }))
    })
  }

  function onRemove(target: string) {
    if (!window.confirm(t('admin.users.removeConfirm', { email: target }))) return
    void run(async () => {
      await removeFromTeams(teams, target)
      await removeUser(target)
    })
  }

  function onResend(target: string) {
    void run(async () => {
      await sendLink(target, false)
      setNotice(t('coaches.invited', { email: target }))
    })
  }

  return (
    <>
      <form onSubmit={onInvite} className="card stack">
        <h2>{t('admin.users.inviteTitle')}</h2>
        <p className="muted">{t('admin.users.inviteIntro')}</p>
        <div className="row">
          <label className="field grow">
            <span>{t('coaches.email')}</span>
            <input type="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('admin.users.access')}</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="coach">{t('admin.role.coach')}</option>
              <option value="admin">{t('admin.role.admin')}</option>
            </select>
          </label>
        </div>
        <div className="row">
          <label className="field grow">
            <span>{t('admin.users.team')}</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">{t('admin.users.noTeam')}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('admin.users.teamRole')}</span>
            <select value={teamRoleChoice} disabled={!teamId} onChange={(e) => setTeamRoleChoice(e.target.value as TeamRole)}>
              <option value="coach">{t('team.role.coach')}</option>
              <option value="viewer">{t('team.role.viewer')}</option>
            </select>
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy || !isValidEmail(email)}>
          {t('coaches.invite')}
        </button>
      </form>

      <RoleGuide />
      {messages}

      <ul className="list card">
        {users.map((u) => {
          const mine = teams.map((team) => ({ team, role: teamRole(team, u.email) })).filter((x) => x.role)
          const me = u.email === myEmail
          return (
            <li key={u.email} className="list-row user-row">
              <div className="grow stack-tight">
                <div className="ellipsis">
                  <strong>{u.email}</strong> {me && <span className="muted">{t('coaches.you')}</span>}
                </div>
                <div className="user-teams">
                  {u.role === 'admin' && <span className="kind-tag">{t('admin.role.admin')}</span>}
                  {mine.map(({ team, role: r }) => (
                    <Link key={team.id} to={`/admin/teams/${team.id}`} className={`team-chip ${r}`}>
                      {team.name} · {t(`team.role.${r!}`)}
                    </Link>
                  ))}
                  {mine.length === 0 && u.role !== 'admin' && <span className="muted small">{t('admin.users.inNoTeam')}</span>}
                </div>
              </div>
              <div className="row user-actions">
                <select
                  aria-label={t('admin.users.access')}
                  value={u.role}
                  disabled={busy || me}
                  onChange={(e) => void run(() => setUserRole(u.email, e.target.value as Role))}
                >
                  <option value="coach">{t('admin.role.coach')}</option>
                  <option value="admin">{t('admin.role.admin')}</option>
                </select>
                {!me && (
                  <>
                    <button className="btn btn-small" disabled={busy} onClick={() => onResend(u.email)}>
                      {t('coaches.resend')}
                    </button>
                    <button className="btn btn-small btn-danger" disabled={busy} onClick={() => onRemove(u.email)}>
                      {t('coaches.remove')}
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** What each level of access lets you do. */
function RoleGuide() {
  const { t } = useI18n()
  return (
    <details className="card role-guide">
      <summary>{t('admin.roles.title')}</summary>
      <dl>
        <dt>{t('admin.role.admin')}</dt>
        <dd>{t('admin.roles.admin')}</dd>
        <dt>{t('team.role.coach')}</dt>
        <dd>{t('admin.roles.coach')}</dd>
        <dt>{t('team.role.viewer')}</dt>
        <dd>{t('admin.roles.viewer')}</dd>
      </dl>
    </details>
  )
}

function TeamsPanel({ teams }: { teams: Team[] }) {
  const { t } = useI18n()
  const auth = useAuth()
  const navigate = useNavigate()
  const myEmail = auth.status === 'coach' ? auth.email : ''
  const { busy, run, messages } = useRunner()
  const [name, setName] = useState('')
  const [gameName, setGameName] = useState('')

  function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    void run(async () => {
      const { id, saved } = saveTeam(null, { name, gameName: gameName || 'Finland' }, myEmail)
      await saved
      navigate(`/admin/teams/${id}`)
    })
  }

  return (
    <>
      <ul className="tiles">
        {teams.map((team) => (
          <li key={team.id}>
            <Link to={`/admin/teams/${team.id}`} className="tile card">
              <span className="bar" />
              <span className="eyebrow">{t('admin.teams.gameNameShort', { name: team.gameName })}</span>
              <h2>{team.name}</h2>
              <p className="small">
                {t('admin.teams.counts', { coaches: team.coaches.length, viewers: team.members.length - team.coaches.length })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {teams.length === 0 && <p className="muted">{t('admin.teams.empty')}</p>}

      <form onSubmit={onCreate} className="card stack">
        <h2>{t('admin.teams.add')}</h2>
        <p className="muted">{t('admin.teams.addIntro')}</p>
        <div className="row">
          <label className="field grow">
            <span>{t('admin.teams.name')}</span>
            <input required maxLength={80} value={name} placeholder={t('admin.teams.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('admin.teams.gameName')}</span>
            <input maxLength={40} value={gameName} placeholder="Finland" onChange={(e) => setGameName(e.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy || !name.trim()}>
          {t('admin.teams.create')}
        </button>
      </form>
      {messages}
    </>
  )
}
