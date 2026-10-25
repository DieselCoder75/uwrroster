import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import type { PreparedHero } from './heroImage'
import { sortTeams, withMember, type HeroPage, type Team, type TeamRole } from './model'

export const teamsCol = collection(db, 'teams')
export const teamDoc = (teamId: string) => doc(teamsCol, teamId)
const imagesCol = (teamId: string) => collection(db, 'teams', teamId, 'images')

const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function teamFromDoc(id: string, d: Record<string, unknown>): Team {
  return {
    id,
    name: typeof d.name === 'string' ? d.name : '',
    gameName: typeof d.gameName === 'string' ? d.gameName : '',
    members: strs(d.members),
    coaches: strs(d.coaches),
  }
}

export type TeamsState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; teams: Team[]; fromServer: boolean }

/** Admins see every team; others the teams they are a member of. */
export function useTeams(email: string | null, admin: boolean): TeamsState {
  const [state, setState] = useState<TeamsState>({ status: 'loading' })
  useEffect(() => {
    if (!email) return
    setState({ status: 'loading' })
    const q = admin ? teamsCol : query(teamsCol, where('members', 'array-contains', email))
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) =>
        setState({
          status: 'ready',
          teams: sortTeams(snap.docs.map((d) => teamFromDoc(d.id, d.data()))),
          fromServer: !snap.metadata.fromCache,
        }),
      (e) => setState({ status: 'error', message: e.message }),
    )
  }, [email, admin])
  return state
}

export type TeamInput = { name: string; gameName: string }

/** Returns the team id straight away (also offline) and the write to wait for. */
export function saveTeam(id: string | null, input: TeamInput, by: string): { id: string; saved: Promise<void> } {
  const data = { name: input.name.trim(), gameName: input.gameName.trim(), updatedAt: serverTimestamp() }
  if (id) return { id, saved: updateDoc(teamDoc(id), data) }
  const ref = doc(teamsCol)
  // The admin who makes a team coaches it, so it shows up for them like any other team.
  return { id: ref.id, saved: setDoc(ref, { ...data, members: [by], coaches: [by], createdBy: by, createdAt: serverTimestamp() }) }
}

export function setTeamMember(team: Team, email: string, role: TeamRole | null): Promise<void> {
  return updateDoc(teamDoc(team.id), { ...withMember(team, email, role), updatedAt: serverTimestamp() })
}

/** Takes a user out of every team, e.g. when their access is removed. */
export async function removeFromTeams(teams: Team[], email: string): Promise<void> {
  const batch = writeBatch(db)
  for (const team of teams) {
    if (team.members.includes(email)) batch.update(teamDoc(team.id), { ...withMember(team, email, null), updatedAt: serverTimestamp() })
  }
  await batch.commit()
}

/** Deletes a team with all its players, tournaments, games and photos (Firestore keeps subcollections otherwise). */
export async function deleteTeam(teamId: string): Promise<void> {
  const refs: DocumentReference[] = []
  const [players, tournaments, images] = await Promise.all([
    getDocs(collection(db, 'teams', teamId, 'players')),
    getDocs(collection(db, 'teams', teamId, 'tournaments')),
    getDocs(imagesCol(teamId)),
  ])
  players.forEach((d) => refs.push(d.ref))
  images.forEach((d) => refs.push(d.ref))
  for (const tour of tournaments.docs) {
    const games = await getDocs(collection(tour.ref, 'games'))
    games.forEach((g) => refs.push(g.ref))
    refs.push(tour.ref)
  }
  await commitDeletes(refs)
  await deleteDoc(teamDoc(teamId))
}

async function commitDeletes(refs: DocumentReference[]) {
  // A batch takes at most 500 writes.
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db)
    refs.slice(i, i + 400).forEach((r) => batch.delete(r))
    await batch.commit()
  }
}

/** A team's own photo for a page, as object URLs ready for an <img>. */
export type HeroPhoto = { page: HeroPage; large: string; small: string; focus: string; width: number; height: number }

function photoFromDoc(page: HeroPage, d: Record<string, unknown>): HeroPhoto | null {
  if (!(d.large instanceof Bytes) || !(d.small instanceof Bytes)) return null
  const type = typeof d.type === 'string' ? d.type : 'image/webp'
  const url = (b: Bytes) => URL.createObjectURL(new Blob([b.toUint8Array() as Uint8Array<ArrayBuffer>], { type }))
  return {
    page,
    large: url(d.large),
    small: url(d.small),
    focus: typeof d.focus === 'string' ? d.focus : '',
    width: typeof d.width === 'number' ? d.width : 0,
    height: typeof d.height === 'number' ? d.height : 0,
  }
}

function revoke(photos: Iterable<HeroPhoto>) {
  for (const p of photos) {
    URL.revokeObjectURL(p.large)
    URL.revokeObjectURL(p.small)
  }
}

/** The team's photo for one page, or null to use the app's own. */
export function useHeroPhoto(teamId: string | null, page: HeroPage | undefined): HeroPhoto | null {
  const [photo, setPhoto] = useState<HeroPhoto | null>(null)
  useEffect(() => {
    setPhoto(null)
    if (!teamId || !page) return
    let current: HeroPhoto | null = null
    const stop = onSnapshot(
      doc(imagesCol(teamId), page),
      (snap) => {
        if (current) revoke([current])
        current = snap.exists() ? photoFromDoc(page, snap.data()) : null
        setPhoto(current)
      },
      // No access or offline without a copy: just show the app's own photo.
      () => setPhoto(null),
    )
    return () => {
      stop()
      if (current) revoke([current])
    }
  }, [teamId, page])
  return photo
}

/** All of a team's own photos, for the admin panel. */
export function useHeroPhotos(teamId: string): Map<HeroPage, HeroPhoto> {
  const [photos, setPhotos] = useState<Map<HeroPage, HeroPhoto>>(new Map())
  useEffect(() => {
    let current = new Map<HeroPage, HeroPhoto>()
    const stop = onSnapshot(imagesCol(teamId), (snap) => {
      revoke(current.values())
      current = new Map()
      snap.forEach((d) => {
        const p = photoFromDoc(d.id as HeroPage, d.data())
        if (p) current.set(p.page, p)
      })
      setPhotos(current)
    })
    return () => {
      stop()
      revoke(current.values())
    }
  }, [teamId])
  return photos
}

export function saveHeroPhoto(teamId: string, page: HeroPage, photo: PreparedHero, focus: string, by: string): Promise<void> {
  return setDoc(doc(imagesCol(teamId), page), {
    large: Bytes.fromUint8Array(photo.large),
    small: Bytes.fromUint8Array(photo.small),
    type: photo.type,
    width: photo.width,
    height: photo.height,
    focus,
    updatedBy: by,
    updatedAt: serverTimestamp(),
  })
}

export function setHeroFocus(teamId: string, page: HeroPage, focus: string, by: string): Promise<void> {
  return updateDoc(doc(imagesCol(teamId), page), { focus, updatedBy: by, updatedAt: serverTimestamp() })
}

export function deleteHeroPhoto(teamId: string, page: HeroPage): Promise<void> {
  return deleteDoc(doc(imagesCol(teamId), page))
}
