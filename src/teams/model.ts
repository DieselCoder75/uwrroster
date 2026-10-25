/** A team has its own players, tournaments and camps. Who may see and coach it is kept on the team. */
export type Team = {
  id: string
  name: string
  /** Our name in game titles, e.g. "Finland" in "Finland vs Germany". */
  gameName: string
  /** Everyone who sees the team, coaches included. */
  members: string[]
  /** Members who may also coach: add players, create tournaments and camps, pick squads and lineups. */
  coaches: string[]
}

/** Coach: can change the team's data. Viewer: can only look. */
export type TeamRole = 'coach' | 'viewer'
export const TEAM_ROLES: TeamRole[] = ['coach', 'viewer']

/** The team the data from before teams was moved into. */
export const DEFAULT_TEAM_ID = 'default'

export function teamRole(team: Pick<Team, 'members' | 'coaches'>, email: string): TeamRole | null {
  if (team.coaches.includes(email)) return 'coach'
  return team.members.includes(email) ? 'viewer' : null
}

/** The team's member lists with `email` given `role`, or removed when role is null. */
export function withMember(team: Pick<Team, 'members' | 'coaches'>, email: string, role: TeamRole | null): Pick<Team, 'members' | 'coaches'> {
  const members = team.members.filter((e) => e !== email)
  const coaches = team.coaches.filter((e) => e !== email)
  if (role) members.push(email)
  if (role === 'coach') coaches.push(email)
  return { members: members.sort(), coaches: coaches.sort() }
}

export function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => a.name.localeCompare(b.name, 'fi'))
}

/** Which team to open: the saved choice if it is still available, else the first one. */
export function pickTeam(teams: Team[], saved: string | null): Team | null {
  return teams.find((t) => t.id === saved) ?? teams[0] ?? null
}

/** Pages with a photo banner. Each team can set its own photo for each. */
export type HeroPage = 'home' | 'players' | 'tournaments' | 'tournament' | 'camp' | 'squad' | 'lineup'
export const HERO_PAGES: HeroPage[] = ['home', 'players', 'tournaments', 'tournament', 'camp', 'squad', 'lineup']
