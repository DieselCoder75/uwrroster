import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { Role } from '../auth/AuthProvider'
import { db } from '../firebase'

// Who may sign in at all is a document in /coaches keyed by email (named so before teams). Its role is
// 'admin' for admins and 'coach' for everyone else; what a user may do in a team is kept on the team.

export type AppUser = { email: string; role: Role }

const usersCol = collection(db, 'coaches')

export function useUsers(): { users: AppUser[]; error: string | null } {
  const [users, setUsers] = useState<AppUser[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(
    () =>
      onSnapshot(
        query(usersCol, orderBy('email')),
        (snap) => setUsers(snap.docs.map((d) => ({ email: d.id, role: d.data().role === 'admin' ? 'admin' : 'coach' }))),
        (e) => setError(e.message),
      ),
    [],
  )
  return { users, error }
}

/** Adds a user. False if they already have access. */
export async function addUser(email: string, role: Role, by: string): Promise<boolean> {
  const ref = doc(usersCol, email)
  if ((await getDoc(ref)).exists()) return false
  await setDoc(ref, { email, role, invitedBy: by, invitedAt: serverTimestamp() })
  return true
}

export function setUserRole(email: string, role: Role): Promise<void> {
  return updateDoc(doc(usersCol, email), { role })
}

export function removeUser(email: string): Promise<void> {
  return deleteDoc(doc(usersCol, email))
}
