import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { completeSignIn, isSignInLink, pendingEmail, sendLink } from '../auth/signInLink'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { useI18n } from '../i18n'
import { isValidEmail } from '../lib/email'

type Step =
  | { kind: 'enterEmail' }
  | { kind: 'sent'; email: string }
  | { kind: 'confirmEmail' }
  | { kind: 'finishing' }

export function LoginPage() {
  const { t } = useI18n()
  const auth = useAuth()
  const fromLink = isSignInLink()
  const [step, setStep] = useState<Step>(() =>
    fromLink ? (pendingEmail() ? { kind: 'finishing' } : { kind: 'confirmEmail' }) : { kind: 'enterEmail' },
  )
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  async function finish(withEmail: string) {
    setStep({ kind: 'finishing' })
    try {
      await completeSignIn(withEmail)
      window.history.replaceState(null, '', '/login')
    } catch (e) {
      setError((e as Error).message)
      setStep({ kind: 'confirmEmail' })
    }
  }

  useEffect(() => {
    // Guard against StrictMode's double effect: a link can only be used once.
    if (started.current) return
    started.current = true
    const saved = pendingEmail()
    if (fromLink && saved) void finish(saved)
  }, [fromLink])

  if (auth.status !== 'signedOut' && auth.status !== 'loading') return <Navigate to="/" replace />

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) return
    setBusy(true)
    setError(null)
    try {
      await sendLink(email)
      setStep({ kind: 'sent', email: email.trim() })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function onConfirm(e: FormEvent) {
    e.preventDefault()
    if (isValidEmail(email)) void finish(email)
  }

  return (
    <div className="login">
      <div className="login-card card">
        <div className="login-top">
          <h1 className="brand">{t('app.name')}</h1>
          <LanguageSwitch />
        </div>

        {step.kind === 'enterEmail' && (
          <form onSubmit={onSend} className="stack">
            <h2>{t('login.title')}</h2>
            <p className="muted">{t('login.intro')}</p>
            <label className="field">
              <span>{t('login.email')}</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" disabled={busy || !isValidEmail(email)}>
              {busy ? t('login.sending') : t('login.send')}
            </button>
          </form>
        )}

        {step.kind === 'sent' && (
          <div className="stack">
            <p>{t('login.sent', { email: step.email })}</p>
            <button className="btn" onClick={() => setStep({ kind: 'enterEmail' })}>
              {t('login.useOther')}
            </button>
          </div>
        )}

        {step.kind === 'confirmEmail' && (
          <form onSubmit={onConfirm} className="stack">
            <h2>{t('login.confirmTitle')}</h2>
            <p className="muted">{t('login.confirmIntro')}</p>
            <label className="field">
              <span>{t('login.email')}</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" disabled={!isValidEmail(email)}>
              {t('login.confirm')}
            </button>
          </form>
        )}

        {step.kind === 'finishing' && <p>{t('login.finishing')}</p>}

        {error && <p className="error">{t('app.error', { message: error })}</p>}
      </div>
    </div>
  )
}
