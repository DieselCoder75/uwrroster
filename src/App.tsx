import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { I18nProvider, useI18n } from './i18n'
import { CoachesPage } from './pages/CoachesPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotInvitedPage } from './pages/NotInvitedPage'
import { PlayersPage } from './players/PlayersPage'
import { LineupPage } from './tournaments/LineupPage'
import { SquadPage } from './tournaments/SquadPage'
import { TournamentPage } from './tournaments/TournamentPage'
import { TournamentsPage } from './tournaments/TournamentsPage'

function AppRoutes() {
  const { t } = useI18n()
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <div className="center muted">{t('app.loading')}</div>
  }

  if (auth.status === 'notInvited') {
    return <NotInvitedPage email={auth.email} />
  }

  if (auth.status === 'signedOut') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="tournaments" element={<TournamentsPage />} />
        <Route path="tournaments/:tid" element={<TournamentPage />} />
        <Route path="tournaments/:tid/squad" element={<SquadPage />} />
        <Route path="tournaments/:tid/games/:gid" element={<LineupPage />} />
        <Route path="coaches" element={<CoachesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}
