import { collection, doc, getDocFromServer, getDocs, serverTimestamp, writeBatch, type DocumentData, type DocumentReference } from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_TEAM_ID } from './model'
import { teamDoc } from './store'

// Before teams, players and tournaments were top-level collections and every invited coach could edit them.
// The first admin to open this version copies them into a default team, keeping the document ids so squads and
// lineups still point at the right players. The old copies are left in place untouched.

const markerDoc = doc(db, 'meta', 'teams')

export const DEFAULT_TEAM = { name: 'Naisten uppopallomaajoukkue', gameName: 'Finland' }

/** True when the copy has been made before, even if the team was later deleted. */
export async function alreadyMigrated(): Promise<boolean> {
  return (await getDocFromServer(markerDoc)).exists()
}

export async function migrateToDefaultTeam(adminEmail: string): Promise<void> {
  const writes: [DocumentReference, DocumentData][] = []
  const [players, tournaments, coaches] = await Promise.all([
    getDocs(collection(db, 'players')),
    getDocs(collection(db, 'tournaments')),
    getDocs(collection(db, 'coaches')),
  ])
  players.forEach((p) => writes.push([doc(db, 'teams', DEFAULT_TEAM_ID, 'players', p.id), p.data()]))
  for (const tour of tournaments.docs) {
    writes.push([doc(db, 'teams', DEFAULT_TEAM_ID, 'tournaments', tour.id), tour.data()])
    const games = await getDocs(collection(tour.ref, 'games'))
    games.forEach((g) => writes.push([doc(db, 'teams', DEFAULT_TEAM_ID, 'tournaments', tour.id, 'games', g.id), g.data()]))
  }
  // A batch takes at most 500 writes.
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db)
    for (const [ref, data] of writes.slice(i, i + 400)) batch.set(ref, data)
    await batch.commit()
  }
  // Everyone invited so far could coach, so they all coach the default team.
  const emails = [...new Set([adminEmail, ...coaches.docs.map((c) => c.id)])].sort()
  // The team appears last, so nobody opens it half copied.
  const batch = writeBatch(db)
  batch.set(teamDoc(DEFAULT_TEAM_ID), {
    ...DEFAULT_TEAM,
    members: emails,
    coaches: emails,
    createdBy: adminEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(markerDoc, { migratedAt: serverTimestamp(), by: adminEmail, players: players.size, tournaments: tournaments.size })
  await batch.commit()
}
