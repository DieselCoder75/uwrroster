import { useI18n } from '../i18n'
import type { EventKind } from './model'

/** Small label telling a tournament from a camp: orange for tournaments, cyan for camps. */
export function KindTag({ kind }: { kind: EventKind }) {
  const { t } = useI18n()
  return <span className={`kind-tag kind-${kind}`}>{t(`event.kind.${kind}`)}</span>
}
