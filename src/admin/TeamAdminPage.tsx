import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHero } from '../components/PageHero'
import { useI18n } from '../i18n'
import { teamRole, type Team, type TeamRole } from '../teams/model'
import { deleteTeam, saveTeam, setTeamMember } from '../teams/store'
import { useTeamState } from '../teams/TeamProvider'
import { HeroPhotosEditor } from './HeroPhotosEditor'
import { useUsers } from './users'

/** One team in the admin panel: its name, who sees and coaches it, and its photos. */
export function TeamAdminPage() {
  const { teamId = '' } = useParams()
  const { t } = useI18n()
  const state = useTeamState()
  const teams = state.status === 'ready' || state.status === 'none' ? state.teams : []
  const team = teams.find((x) => x.id === teamId)

  if (state.status === 'loading') return <p className="muted">{t('app.loading')}</p>
  if (!team) {
    return (
      <div className="stack">
        <Link to="/admin/teams" className="back-link">
          {t('admin.teams.back')}
        </Link>
        <p className="muted">{t('admin.teams.notFound')}</p>
      </div>
    )
  }
  return <TeamAdmin key={team.id} team={team} />
}

function TeamAdmin({ team }: { team: Team }) {
  const { t } = useI18n()
  const auth = useAuth()
  const navigate = useNavigate()
  const myEmail = auth.status === 'coach' ? auth.email : ''
  const { users } = useUsers()
  const [name, setName] = useState(team.name)
  const [gameName, setGameName] = useState(team.gameName)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<TeamRole>('coach')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>, done?: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      if (done) setNotice(done)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function onSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    void run(() => saveTeam(team.id, { name, gameName }, myEmail).saved, t('admin.teams.saved'))
  }

  function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!addEmail) return
    void run(async () => {
      await setTeamMember(team, addEmail, addRole)
      setAddEmail('')
    })
  }

  function onDelete() {
    if (window.prompt(t('admin.teams.deleteConfirm', { name: team.name }))?.trim() !== team.name) return
    void run(async () => {
      await deleteTeam(team.id)
      navigate('/admin/teams')
    })
  }

  const notInTeam = users.filter((u) => !team.members.includes(u.email))
  const admins = new Set(users.filter((u) => u.role === 'admin').map((u) => u.email))

  return (
    <div className="stack">
      <PageHero
        compact
        image="em-pronssimitalistit"
        top={
          <Link to="/admin/teams" className="back-link">
            {t('admin.teams.back')}
          </Link>
        }
        tag={t('admin.teams.tag')}
        title={team.name}
        sub={t('admin.teams.counts', { coaches: team.coaches.length, viewers: team.members.length - team.coaches.length })}
      />

      <form onSubmit={onSave} className="card stack">
        <h2>{t('admin.teams.details')}</h2>
        <div className="row">
          <label className="field grow">
            <span>{t('admin.teams.name')}</span>
            <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('admin.teams.gameName')}</span>
            <input maxLength={40} value={gameName} placeholder="Finland" onChange={(e) => setGameName(e.target.value)} />
          </label>
        </div>
        <p className="muted small">{t('admin.teams.gameNameHelp')}</p>
        <button className="btn btn-primary" disabled={busy || !name.trim() || (name === team.name && gameName === team.gameName)}>
          {t('game.save')}
        </button>
      </form>

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{t('app.error', { message: error })}</p>}

      <section className="card stack">
        <h2>{t('admin.teams.members')}</h2>
        <p className="muted small">{t('admin.teams.membersHelp')}</p>
        {team.members.length === 0 && <p className="muted">{t('admin.teams.noMembers')}</p>}
        <ul className="list">
          {team.members.map((email) => (
            <li key={email} className="list-row">
              <div className="grow ellipsis">
                {email} {email === myEmail && <span className="muted">{t('coaches.you')}</span>}
                {admins.has(email) && <span className="kind-tag">{t('admin.role.admin')}</span>}
                {!users.some((u) => u.email === email) && <span className="muted small"> · {t('admin.teams.noAccess')}</span>}
              </div>
              <select
                aria-label={t('admin.users.teamRole')}
                value={teamRole(team, email) ?? 'viewer'}
                disabled={busy}
                onChange={(e) => void run(() => setTeamMember(team, email, e.target.value as TeamRole))}
              >
                <option value="coach">{t('team.role.coach')}</option>
                <option value="viewer">{t('team.role.viewer')}</option>
              </select>
              <button
                className="btn btn-small btn-danger"
                disabled={busy}
                onClick={() => window.confirm(t('admin.teams.removeMember', { email, team: team.name })) && void run(() => setTeamMember(team, email, null))}
              >
                {t('coaches.remove')}
              </button>
            </li>
          ))}
        </ul>

        {notInTeam.length > 0 ? (
          <form onSubmit={onAdd} className="row add-member">
            <label className="field grow">
              <span>{t('admin.teams.addMember')}</span>
              <select value={addEmail} onChange={(e) => setAddEmail(e.target.value)}>
                <option value="">{t('admin.teams.pickUser')}</option>
                {notInTeam.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('admin.users.teamRole')}</span>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value as TeamRole)}>
                <option value="coach">{t('team.role.coach')}</option>
                <option value="viewer">{t('team.role.viewer')}</option>
              </select>
            </label>
            <button className="btn btn-primary" disabled={busy || !addEmail}>
              {t('admin.teams.add.member')}
            </button>
          </form>
        ) : (
          <p className="muted small">{t('admin.teams.everyoneIn')}</p>
        )}
        <p className="muted small">
          {t('admin.teams.inviteHint')} <Link to="/admin">{t('admin.users')} →</Link>
        </p>
      </section>

      <HeroPhotosEditor team={team} />

      <section className="card stack danger-zone">
        <h2>{t('admin.teams.delete')}</h2>
        <p className="muted small">{t('admin.teams.deleteHelp')}</p>
        <button className="btn btn-danger" disabled={busy} onClick={onDelete}>
          {t('admin.teams.delete')}
        </button>
      </section>
    </div>
  )
}
