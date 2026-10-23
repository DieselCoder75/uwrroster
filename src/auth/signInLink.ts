import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from 'firebase/auth'
import { auth } from '../firebase'
import { normalizeEmail } from '../lib/email'

const PENDING_EMAIL_KEY = 'uwr.pendingEmail'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Sends a sign-in link. Also used to deliver invites, so `remember` is false for other people's emails. */
export async function sendLink(email: string, remember = true): Promise<void> {
  const normalized = normalizeEmail(email)
  await sendSignInLinkToEmail(auth, normalized, {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
  })
  if (remember) storage()?.setItem(PENDING_EMAIL_KEY, normalized)
}

export function isSignInLink(href = window.location.href): boolean {
  return isSignInWithEmailLink(auth, href)
}

export function pendingEmail(): string | null {
  return storage()?.getItem(PENDING_EMAIL_KEY) ?? null
}

export async function completeSignIn(email: string, href = window.location.href): Promise<void> {
  await signInWithEmailLink(auth, normalizeEmail(email), href)
  storage()?.removeItem(PENDING_EMAIL_KEY)
}
