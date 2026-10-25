import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { alreadyMigrated, migrateToDefaultTeam } from './migrate'
import { pickTeam, type Team } from './model'
import { useTeams } from './store'

const STORAGE_KEY = 'uwr.team'

export type TeamState =
  | { status: 'loading' }
  | { status: 'migrating' }
  | { status: 'error'; message: string }
  /** Signed in, but not a member of any team yet. */
  | { status: 'none'; teams: Team[] }
  | { status: 'ready'; team: Team; teams: Team[]; canCoach: boolean }

type TeamContextValue = TeamState & { selectTeam: (id: string) => void }

const TeamContext = createContext<TeamContextValue | null>(null)

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const email = auth.status === 'coach' ? auth.email : null
  const admin = auth.status === 'coach' && auth.role === 'admin'
  const teams = useTeams(email, admin)
  const [saved, setSaved] = useState(readSaved)
  const [migration, setMigration] = useState<'idle' | 'running' | 'done' | { error: string }>('idle')
  const tried = useRef(false)

  // The first admin to open the app with teams copies the data from before teams into a default team.
  const noTeamsYet = admin && teams.status === 'ready' && teams.fromServer && teams.teams.length === 0
  useEffect(() => {
    if (!noTeamsYet || !email || tried.current) return
    tried.current = true
    setMigration('running')
    void (async () => {
      try {
        if (!(await alreadyMigrated())) await migrateToDefaultTeam(email)
        setMigration('done')
      } catch (e) {
        setMigration({ error: (e as Error).message })
      }
    })()
  }, [noTeamsYet, email])

  const value = useMemo<TeamContextValue>(() => {
    const selectTeam = (id: string) => {
      setSaved(id)
      try {
        localStorage.setItem(STORAGE_KEY, id)
      } catch {
        // Private mode etc.; the choice just won't be remembered.
      }
    }
    if (typeof migration === 'object') return { status: 'error', message: migration.error, selectTeam }
    if (migration === 'running') return { status: 'migrating', selectTeam }
    if (teams.status === 'loading') return { status: 'loading', selectTeam }
    if (teams.status === 'error') return { status: 'error', message: teams.message, selectTeam }
    const team = pickTeam(teams.teams, saved)
    if (!team) {
      // Wait for the server before saying there is no team: the device may just not have a copy yet.
      return teams.fromServer ? { status: 'none', teams: teams.teams, selectTeam } : { status: 'loading', selectTeam }
    }
    const canCoach = admin || (!!email && team.coaches.includes(email))
    return { status: 'ready', team, teams: teams.teams, canCoach, selectTeam }
  }, [teams, saved, migration, admin, email])

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useTeamState(): TeamContextValue {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeamState must be used inside TeamProvider')
  return ctx
}

/** The open team, for pages that are only shown once a team is open (see TeamGate). */
// eslint-disable-next-line react/only-export-components
export function useTeam(): { team: Team; teamId: string; canCoach: boolean } {
  const state = useTeamState()
  if (state.status !== 'ready') throw new Error('useTeam needs an open team')
  return { team: state.team, teamId: state.team.id, canCoach: state.canCoach }
}
