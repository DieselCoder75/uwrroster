import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { LoginShell } from './LoginPage'

export function NotInvitedPage({ email }: { email: string }) {
  const { t } = useI18n()
  const auth = useAuth()
  return (
    <LoginShell>
      <div className="login-card stack">
        <h2>{t('notInvited.title')}</h2>
        <p>{t('notInvited.body', { email })}</p>
        <button className="btn" onClick={() => void auth.signOut()}>
          {t('nav.signOut')}
        </button>
      </div>
    </LoginShell>
  )
}
