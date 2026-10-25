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

/** Today's date on this device as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Whole days from one YYYY-MM-DD date to another (negative when it has passed). */
export function daysUntil(iso: string, from: string): number {
  const a = parse(from)
  const b = parse(iso)
  if (!a || !b) return 0
  // Round so a daylight-saving change in between doesn't cost a day.
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** "25.10. klo 21.05" / "25 Oct, 21:05" from milliseconds; empty when not known. */
export function formatStamp(ms: number, lang: Lang): string {
  if (!ms) return ''
  return new Date(ms).toLocaleString(locale(lang), {
    day: 'numeric',
    month: lang === 'fi' ? 'numeric' : 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
