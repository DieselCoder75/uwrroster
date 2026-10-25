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

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <span className="brand-mark small" aria-hidden="true" />
        <span>©{YEAR} Uppopallonaiset</span>
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
