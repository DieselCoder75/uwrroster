// Runs against the Firestore emulator: npm run test:rules
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { Bytes, deleteDoc, doc, getDoc, getDocs, collection, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const ADMIN = 'admin@example.fi'
const COACH = 'coach@example.fi'
const VIEWER = 'viewer@example.fi'
const OUTSIDER = 'outsider@example.fi'
const STRANGER = 'stranger@example.fi'
const TEAM = { name: 'Naiset', gameName: 'Finland', members: [COACH, VIEWER], coaches: [COACH] }

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
    await setDoc(doc(db, 'coaches', VIEWER), { email: VIEWER, role: 'coach' })
    await setDoc(doc(db, 'coaches', OUTSIDER), { email: OUTSIDER, role: 'coach' })
    await setDoc(doc(db, 'teams', 't'), TEAM)
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

const PLAYER = {
  number: 6,
  firstName: 'Heli',
  lastName: 'Koskinen',
  mainPosition: 'DEF',
  otherPositions: ['ATT'],
  locked: false,
  captain: 'captain',
  active: true,
}

const teamPlayer = (email: string, id = 'p1') => doc(as(email), 'teams', 't', 'players', id)

describe('teams', () => {
  it('lets only admins create and change teams', async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), 'teams', 'new'), { ...TEAM, name: 'Miehet' }))
    await assertFails(setDoc(doc(as(COACH), 'teams', 'other'), TEAM))
    await assertFails(updateDoc(doc(as(COACH), 'teams', 't'), { coaches: [COACH, VIEWER] }))
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'teams', 't'), { coaches: [COACH, VIEWER] }))
  })

  it('rejects coaches who are not members, and teams without a name', async () => {
    await assertFails(setDoc(doc(as(ADMIN), 'teams', 'x'), { ...TEAM, coaches: [OUTSIDER] }))
    await assertFails(setDoc(doc(as(ADMIN), 'teams', 'x'), { ...TEAM, name: '' }))
  })

  it('shows members their own teams only', async () => {
    await assertSucceeds(getDoc(doc(as(VIEWER), 'teams', 't')))
    await assertFails(getDoc(doc(as(OUTSIDER), 'teams', 't')))
    await assertSucceeds(getDocs(query(collection(as(VIEWER), 'teams'), where('members', 'array-contains', VIEWER))))
    await assertFails(getDocs(collection(as(VIEWER), 'teams')))
    await assertSucceeds(getDocs(collection(as(ADMIN), 'teams')))
  })

  it('lets coaches change the team data and viewers only read it', async () => {
    await assertSucceeds(setDoc(teamPlayer(COACH), PLAYER))
    await assertSucceeds(setDoc(doc(as(COACH), 'teams', 't', 'tournaments', 'x', 'games', 'g'), { opponent: 'GER' }))
    await assertSucceeds(getDoc(teamPlayer(VIEWER)))
    await assertFails(setDoc(teamPlayer(VIEWER, 'p2'), PLAYER))
    await assertFails(setDoc(doc(as(VIEWER), 'teams', 't', 'tournaments', 'y'), { name: 'x' }))
    await assertFails(deleteDoc(teamPlayer(VIEWER)))
  })

  it('keeps other teams and strangers out', async () => {
    await assertFails(getDoc(teamPlayer(OUTSIDER)))
    await assertFails(setDoc(teamPlayer(OUTSIDER, 'p3'), PLAYER))
    await assertFails(getDoc(teamPlayer(STRANGER)))
    await assertSucceeds(setDoc(teamPlayer(ADMIN, 'p4'), PLAYER))
  })

  it('lets admins upload photos that fit, and members see them', async () => {
    const photo = { large: Bytes.fromUint8Array(new Uint8Array(1000)), small: Bytes.fromUint8Array(new Uint8Array(100)), type: 'image/webp', width: 1920, height: 1080, focus: '50% 50%' }
    await assertSucceeds(setDoc(doc(as(ADMIN), 'teams', 't', 'images', 'home'), photo))
    await assertFails(setDoc(doc(as(COACH), 'teams', 't', 'images', 'home'), photo))
    await assertFails(setDoc(doc(as(ADMIN), 'teams', 't', 'images', 'home'), { ...photo, large: Bytes.fromUint8Array(new Uint8Array(700_000)) }))
    await assertSucceeds(getDoc(doc(as(VIEWER), 'teams', 't', 'images', 'home')))
    await assertFails(getDoc(doc(as(OUTSIDER), 'teams', 't', 'images', 'home')))
  })
})

describe('players', () => {
  it('accepts a valid player, with or without a number', async () => {
    await assertSucceeds(setDoc(teamPlayer(COACH, 'p1'), PLAYER))
    await assertSucceeds(setDoc(teamPlayer(COACH, 'p2'), { ...PLAYER, number: null, captain: null }))
  })

  it('rejects invalid players', async () => {
    const x = teamPlayer(COACH, 'x')
    await assertFails(setDoc(x, { ...PLAYER, firstName: '' }))
    await assertFails(setDoc(x, { ...PLAYER, number: -1 }))
    await assertFails(setDoc(x, { ...PLAYER, mainPosition: 'STRIKER' }))
    await assertFails(setDoc(x, { ...PLAYER, otherPositions: ['GK', 'WING'] }))
    await assertFails(setDoc(x, { ...PLAYER, captain: 'boss' }))
  })
})

describe('data from before teams', () => {
  beforeEach(() =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'players', 'old'), PLAYER)
    }),
  )

  it('is read-only, and only admins can read it to copy it into a team', async () => {
    await assertSucceeds(getDoc(doc(as(ADMIN), 'players', 'old')))
    await assertFails(getDoc(doc(as(COACH), 'players', 'old')))
    await assertFails(setDoc(doc(as(ADMIN), 'players', 'old'), PLAYER))
    await assertFails(setDoc(doc(as(COACH), 'tournaments', 't1'), { name: 'x' }))
    await assertSucceeds(setDoc(doc(as(ADMIN), 'meta', 'teams'), { by: ADMIN }))
    await assertFails(getDoc(doc(as(COACH), 'meta', 'teams')))
  })
})
