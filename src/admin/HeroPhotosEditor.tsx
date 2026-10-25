import { useRef, useState, type MouseEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { DEFAULT_HERO, heroSrcSet } from '../components/heroImages'
import { useI18n } from '../i18n'
import { MAX_FILE_BYTES, RECOMMENDED_WIDTH, photoWarnings, prepareHero } from '../teams/heroImage'
import { HERO_PAGES, type HeroPage, type Team } from '../teams/model'
import { deleteHeroPhoto, saveHeroPhoto, setHeroFocus, useHeroPhotos, type HeroPhoto } from '../teams/store'

/** Upload the team's own banner photo for each page, with advice on what works. */
export function HeroPhotosEditor({ team }: { team: Team }) {
  const { t } = useI18n()
  const photos = useHeroPhotos(team.id)

  return (
    <section className="card stack">
      <h2>{t('photos.title')}</h2>
      <p className="muted">{t('photos.intro')}</p>
      <div className="photo-guide">
        <h3>{t('photos.guideTitle')}</h3>
        <ul>
          <li>{t('photos.guide.shape', { width: RECOMMENDED_WIDTH })}</li>
          <li>{t('photos.guide.subject')}</li>
          <li>{t('photos.guide.bottom')}</li>
          <li>{t('photos.guide.format')}</li>
          <li>{t('photos.guide.quality')}</li>
          <li>{t('photos.guide.rights')}</li>
        </ul>
      </div>
      <div className="photo-grid">
        {HERO_PAGES.map((page) => (
          <PagePhoto key={page} team={team} page={page} photo={photos.get(page) ?? null} />
        ))}
      </div>
    </section>
  )
}

/** "37% 52%" from a click on the photo. */
function focusFromClick(e: MouseEvent<HTMLElement>): string {
  const box = e.currentTarget.getBoundingClientRect()
  const pct = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100)
  return `${pct((e.clientX - box.left) / box.width)}% ${pct((e.clientY - box.top) / box.height)}%`
}

function PagePhoto({ team, page, photo }: { team: Team; page: HeroPage; photo: HeroPhoto | null }) {
  const { t } = useI18n()
  const auth = useAuth()
  const by = auth.status === 'coach' ? auth.email : ''
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const fallback = DEFAULT_HERO[page]
  const src = photo ? photo.large : undefined
  const srcSet = photo ? undefined : heroSrcSet(fallback.image)
  const focus = (photo ? photo.focus : fallback.focus) || '50% 35%'
  const [fx, fy] = focus.split(' ')

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setWarnings([])
    if (file.size > MAX_FILE_BYTES) return setError(t('photos.tooBig'))
    setBusy(true)
    try {
      let prepared
      try {
        prepared = await prepareHero(file)
      } catch {
        throw new Error(t('photos.unreadable'))
      }
      setWarnings(photoWarnings(prepared.width, prepared.height).map((w) => t(`photos.warn.${w}`, { width: RECOMMENDED_WIDTH, actual: prepared.width })))
      await saveHeroPhoto(team.id, page, prepared, '50% 50%', by)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function onPick(e: MouseEvent<HTMLElement>) {
    if (!photo || busy) return
    const next = focusFromClick(e)
    void setHeroFocus(team.id, page, next, by).catch((err: Error) => setError(err.message))
  }

  function onRemove() {
    if (!window.confirm(t('photos.removeConfirm', { page: t(`photos.page.${page}`) }))) return
    setWarnings([])
    void deleteHeroPhoto(team.id, page).catch((err: Error) => setError(err.message))
  }

  return (
    <article className="photo-card">
      <header className="photo-head">
        <h3>{t(`photos.page.${page}`)}</h3>
        <span className={`status-pill ${photo ? 'ok' : ''}`}>{photo ? t('photos.own') : t('photos.default')}</span>
      </header>

      {/* The whole photo; a tap picks the point that stays in view however the banner is cropped. */}
      <button type="button" className={`photo-full ${photo ? 'pickable' : ''}`} onClick={onPick} disabled={!photo || busy} aria-label={t('photos.pickFocus')}>
        <img src={src} srcSet={srcSet} sizes="400px" alt="" />
        <span className="photo-focus" style={{ left: fx, top: fy }} />
      </button>
      {photo && <p className="muted small">{t('photos.focusHelp')}</p>}

      <div className="photo-crops" aria-hidden="true">
        <figure>
          <span className="crop crop-wide">
            <img src={src} srcSet={srcSet} sizes="300px" alt="" style={{ objectPosition: focus }} />
          </span>
          <figcaption>{t('photos.desktop')}</figcaption>
        </figure>
        <figure>
          <span className="crop crop-phone">
            <img src={src} srcSet={srcSet} sizes="120px" alt="" style={{ objectPosition: focus }} />
          </span>
          <figcaption>{t('photos.phone')}</figcaption>
        </figure>
      </div>

      {photo && (
        <p className="muted small">{t('photos.size', { width: photo.width, height: photo.height })}</p>
      )}
      {warnings.map((w) => (
        <p key={w} className="notice warn-notice small">
          {w}
        </p>
      ))}
      {error && <p className="error small">{error}</p>}

      <div className="row">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        <button type="button" className="btn btn-small btn-primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? t('photos.processing') : photo ? t('photos.replace') : t('photos.upload')}
        </button>
        {photo && (
          <button type="button" className="btn btn-small" disabled={busy} onClick={onRemove}>
            {t('photos.remove')}
          </button>
        )}
      </div>
    </article>
  )
}
