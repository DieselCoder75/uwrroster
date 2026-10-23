import { useAuth } from '../auth/AuthProvider'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { useI18n } from '../i18n'

export function NotInvitedPage({ email }: { email: string }) {
  const { t } = useI18n()
  const auth = useAuth()
  return (
    <div className="login">
      <div className="login-card card stack">
        <div className="login-top">
          <h1 className="brand">{t('app.name')}</h1>
          <LanguageSwitch />
        </div>
        <h2>{t('notInvited.title')}</h2>
        <p>{t('notInvited.body', { email })}</p>
        <button className="btn" onClick={() => void auth.signOut()}>
          {t('nav.signOut')}
        </button>
      </div>
    </div>
  )
}
