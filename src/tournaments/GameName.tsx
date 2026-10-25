import { useI18n } from '../i18n'
import { useTeam } from '../teams/TeamProvider'
import { OUR_TEAM, gameTeams, type Game } from './model'

/** "Finland vs Germany" with each team's cap colour beside its name. */
export function GameName({ game, big }: { game: Pick<Game, 'opponent' | 'cap'>; big?: boolean }) {
  const { t } = useI18n()
  const { team } = useTeam()
  const teams = gameTeams(game, team.gameName || OUR_TEAM)
  if (!teams) return <>vs {game.opponent}</>
  const dot = (cap: 'blue' | 'white') => <span className={`cap-dot${big ? ' big' : ''} cap-${cap}`} title={t(`cap.${cap}`)} />
  return (
    <>
      {dot('blue')}
      {teams.blue} vs {dot('white')}
      {teams.white}
    </>
  )
}
