import { useI18n } from '../i18n'

/** Tells a team member without coaching rights why nothing can be changed. */
export function ViewOnly() {
  const { t } = useI18n()
  return <p className="notice small">👁 {t('team.viewOnly')}</p>
}
