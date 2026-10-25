import { useI18n } from '../i18n'
import { useOnline } from '../lib/online'

/** "Saving…" / "Saved", or that changes wait for the connection when offline. */
export function SaveStatus({ pending }: { pending: number }) {
  const { t } = useI18n()
  const online = useOnline()
  if (!online) return <span className="muted small">{t('net.pending')}</span>
  return <span className="muted small">{pending > 0 ? t('lineup.saving') : t('lineup.saved')}</span>
}
