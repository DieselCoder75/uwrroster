import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth } from '../firebase'

/** Signs in with a Google account. Access still requires an invite for that account's email. */
export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    const code = (e as { code?: string }).code
    // Closing the popup is not an error worth showing.
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
    // Some browsers (e.g. an installed app on a phone) block popups: go through a full-page redirect instead.
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
      return
    }
    throw e
  }
}
