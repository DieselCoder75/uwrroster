import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth, type Role } from '../auth/AuthProvider'
import { sendLink } from '../auth/signInLink'
import { db } from '../firebase'
import { useI18n } from '../i18n'
import { isValidEmail, normalizeEmail } from '../lib/email'

type Coach = { email: string; role: Role }

export function CoachesPage() {
  const { t } = useI18n()
  const auth = useAuth()
  const isAdmin = auth.status === 'coach' && auth.role === 'admin'
  const myEmail = auth.status === 'coach' ? auth.email : ''

  const [coaches, setCoaches] = useState<Coach[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('coach')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'coaches'), orderBy('email')),
        (snap) => setCoaches(snap.docs.map((d) => ({ email: d.id, role: d.data().role as Role }))),
        (e) => setError(e.message),
      ),
    [],
  )

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

  function onInvite(e: FormEvent) {
    e.preventDefault()
    const target = normalizeEmail(email)
    if (!isValidEmail(target)) return
    void run(async () => {
      const ref = doc(db, 'coaches', target)
      if ((await getDoc(ref)).exists()) {
        setNotice(t('coaches.alreadyInvited', { email: target }))
        return
      }
      await setDoc(ref, { email: target, role, invitedBy: myEmail, invitedAt: serverTimestamp() })
      await sendLink(target, false)
      setEmail('')
      setRole('coach')
      setNotice(t('coaches.invited', { email: target }))
    })
  }

  function onRemove(target: string) {
    if (!window.confirm(t('coaches.removeConfirm', { email: target }))) return
    void run(() => deleteDoc(doc(db, 'coaches', target)))
  }

  function onResend(target: string) {
    void run(async () => {
      await sendLink(target, false)
      setNotice(t('coaches.invited', { email: target }))
    })
  }

  return (
    <div className="stack">
      <h1>{t('coaches.title')}</h1>

      {isAdmin ? (
        <form onSubmit={onInvite} className="card stack">
          <h2>{t('coaches.inviteTitle')}</h2>
          <p className="muted">{t('coaches.inviteIntro')}</p>
          <div className="row">
            <label className="field grow">
              <span>{t('coaches.email')}</span>
              <input
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('coaches.role')}</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="coach">{t('coaches.role.coach')}</option>
                <option value="admin">{t('coaches.role.admin')}</option>
              </select>
            </label>
          </div>
          <button className="btn btn-primary" disabled={busy || !isValidEmail(email)}>
            {t('coaches.invite')}
          </button>
        </form>
      ) : (
        <p className="muted">{t('coaches.adminOnly')}</p>
      )}

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{t('app.error', { message: error })}</p>}

      <ul className="list card">
        {coaches.map((c) => (
          <li key={c.email} className="list-row">
            <div className="grow">
              <div className="ellipsis">
                {c.email} {c.email === myEmail && <span className="muted">{t('coaches.you')}</span>}
              </div>
              <div className="muted small">{t(`coaches.role.${c.role}`)}</div>
            </div>
            {isAdmin && c.email !== myEmail && (
              <div className="row">
                <button className="btn btn-small" disabled={busy} onClick={() => onResend(c.email)}>
                  {t('coaches.resend')}
                </button>
                <button className="btn btn-small btn-danger" disabled={busy} onClick={() => onRemove(c.email)}>
                  {t('coaches.remove')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
