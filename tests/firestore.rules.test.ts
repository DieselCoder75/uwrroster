// Runs against the Firestore emulator: npm run test:rules
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const ADMIN = 'admin@example.fi'
const COACH = 'coach@example.fi'
const STRANGER = 'stranger@example.fi'

function as(email: string, verified = true) {
  return env.authenticatedContext(email, { email, email_verified: verified }).firestore()
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-uwrroster',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'coaches', ADMIN), { email: ADMIN, role: 'admin' })
    await setDoc(doc(db, 'coaches', COACH), { email: COACH, role: 'coach' })
  })
})

describe('coaches', () => {
  it('lets a stranger check only their own invite', async () => {
    await assertSucceeds(getDoc(doc(as(STRANGER), 'coaches', STRANGER)))
    await assertFails(getDoc(doc(as(STRANGER), 'coaches', COACH)))
    await assertFails(getDocs(collection(as(STRANGER), 'coaches')))
  })

  it('lets coaches list coaches', async () => {
    await assertSucceeds(getDocs(collection(as(COACH), 'coaches')))
  })

  it('treats the email case-insensitively', async () => {
    await assertSucceeds(getDocs(collection(as('Coach@Example.FI'), 'coaches')))
  })

  it('requires a verified email', async () => {
    await assertFails(getDocs(collection(as(COACH, false), 'coaches')))
  })

  it('only lets admins invite', async () => {
    const invite = { email: 'new@example.fi', role: 'coach', invitedBy: ADMIN }
    await assertSucceeds(setDoc(doc(as(ADMIN), 'coaches', 'new@example.fi'), invite))
    await assertFails(setDoc(doc(as(COACH), 'coaches', 'other@example.fi'), { ...invite, email: 'other@example.fi' }))
    await assertFails(setDoc(doc(as(STRANGER), 'coaches', STRANGER), { email: STRANGER, role: 'admin' }))
  })

  it('rejects invites with a mismatched email or unknown role', async () => {
    await assertFails(setDoc(doc(as(ADMIN), 'coaches', 'a@example.fi'), { email: 'b@example.fi', role: 'coach' }))
    await assertFails(setDoc(doc(as(ADMIN), 'coaches', 'a@example.fi'), { email: 'a@example.fi', role: 'owner' }))
  })

  it('does not let an admin remove or demote themselves', async () => {
    await assertFails(deleteDoc(doc(as(ADMIN), 'coaches', ADMIN)))
    await assertFails(updateDoc(doc(as(ADMIN), 'coaches', ADMIN), { role: 'coach' }))
    await assertSucceeds(deleteDoc(doc(as(ADMIN), 'coaches', COACH)))
  })
})

describe('team data', () => {
  it('is only for coaches', async () => {
    await assertSucceeds(setDoc(doc(as(COACH), 'players', 'p1'), { first: 'Ida' }))
    await assertSucceeds(setDoc(doc(as(COACH), 'tournaments', 't1', 'games', 'g1'), { name: 'Game 1' }))
    await assertFails(getDoc(doc(as(STRANGER), 'players', 'p1')))
    await assertFails(setDoc(doc(as(STRANGER), 'tournaments', 't1'), { name: 'x' }))
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'players', 'p1')))
  })
})
