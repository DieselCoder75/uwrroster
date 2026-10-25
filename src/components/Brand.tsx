/** The team website's slanted mark with the app's name: UWR Roster. */
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true" />
      <span className="brand-tag brand-app">UWR Roster</span>
    </span>
  )
}

const YEAR = new Date().getFullYear()

/** The release this copy of the app is: "PR #19 · 1033dff · 25.10.2026". */
function releaseLabel(): string {
  const { pr, commit, date } = __BUILD_INFO__
  const built = new Date(date)
  const day = `${built.getDate()}.${built.getMonth() + 1}.${built.getFullYear()}`
  return [pr ? `PR #${pr}` : null, commit, day].filter(Boolean).join(' · ')
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <span className="brand-mark small" aria-hidden="true" />
        <div className="footer-text">
          <span>©{YEAR} Uppopallonaiset</span>
          <span className="footer-version" title={__BUILD_INFO__.date}>
            {releaseLabel()}
          </span>
        </div>
      </div>
      <div className="footer-links">
        <a href="https://uppopallonaiset.fi/" target="_blank" rel="noreferrer">
          UPPOPALLONAISET.FI
        </a>
        <a href="https://www.instagram.com/uppopallonaiset/" target="_blank" rel="noreferrer">
          INSTAGRAM
        </a>
        <a href="https://www.facebook.com/uppopallonaiset/" target="_blank" rel="noreferrer">
          FACEBOOK
        </a>
      </div>
    </footer>
  )
}
