import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, db } from '../firebase'
import { normalizeEmail } from '../lib/email'

export type Role = 'admin' | 'coach'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'notInvited'; user: User; email: string }
  | { status: 'coach'; user: User; email: string; role: Role }

type AuthContextValue = AuthState & { signOut: () => Promise<void> }

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let stopCoachListener: (() => void) | undefined

    const stopAuthListener = onAuthStateChanged(auth, (user) => {
      stopCoachListener?.()
      stopCoachListener = undefined

      if (!user?.email) {
        setState({ status: 'signedOut' })
        return
      }

      const email = normalizeEmail(user.email)
      setState({ status: 'loading' })
      // Listen so access changes (invite added or removed) apply without reloading.
      stopCoachListener = onSnapshot(
        doc(db, 'coaches', email),
        (snap) => {
          if (snap.exists()) {
            const role: Role = snap.data().role === 'admin' ? 'admin' : 'coach'
            setState({ status: 'coach', user, email, role })
          } else if (snap.metadata.fromCache) {
            // Not cached on this device yet: wait for the server rather than turning the coach away while offline.
            setState({ status: 'loading' })
          } else {
            setState({ status: 'notInvited', user, email })
          }
        },
        () => setState({ status: 'notInvited', user, email }),
      )
    })

    return () => {
      stopCoachListener?.()
      stopAuthListener()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signOut: () => firebaseSignOut(auth) }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
