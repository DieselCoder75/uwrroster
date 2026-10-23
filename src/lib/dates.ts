import type { Lang } from '../i18n'

const locale = (lang: Lang) => (lang === 'fi' ? 'fi-FI' : 'en-GB')

function parse(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/** "la 27.2." / "Sat 27 Feb" */
export function formatDay(iso: string, lang: Lang): string {
  const d = parse(iso)
  if (!d) return ''
  return d.toLocaleDateString(locale(lang), { weekday: 'short', day: 'numeric', month: lang === 'fi' ? 'numeric' : 'short' })
}

/** "27.–28.2.2027" style range, falling back to whichever end is set. */
export function formatRange(start: string, end: string, lang: Lang): string {
  const a = parse(start)
  const b = parse(end)
  const fmt = (d: Date) => d.toLocaleDateString(locale(lang), { day: 'numeric', month: lang === 'fi' ? 'numeric' : 'short', year: 'numeric' })
  if (a && b && start !== end) return `${fmt(a)} – ${fmt(b)}`
  if (a) return fmt(a)
  if (b) return fmt(b)
  return ''
}
