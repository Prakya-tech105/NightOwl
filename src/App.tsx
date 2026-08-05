import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from './components/shared/AppShell'
import { DashboardPage } from './pages/Dashboard'
import { DemandMapPage } from './pages/DemandMap'
import { DispatchPage } from './pages/Dispatch'
import { FleetPage } from './pages/Fleet'
import { LoginPage } from './pages/Login'
import { ReportsPage } from './pages/Reports'
import { RidersPage } from './pages/Riders'
import { SettingsPage } from './pages/Settings'
import { useNightOwlStore } from './store/useNightOwlStore'
import type { Role } from './types/models'

const roleAccessMap: Record<Role, string[]> = {
  super_admin: ['dashboard', 'demand-map', 'dispatch', 'fleet', 'riders', 'reports', 'settings'],
  government_admin: ['dashboard', 'demand-map'],
  company_admin: ['dashboard', 'reports'],
  fleet_operator: ['dashboard', 'dispatch'],
  driver: ['dispatch', 'riders'],
  rider: ['dashboard', 'dispatch', 'riders', 'settings'],
}

function GuardedRoute(props: { pageKey: string; children: ReactNode }) {
  const role = useNightOwlStore((state) => state.role)

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (!roleAccessMap[role].includes(props.pageKey)) {
    return <Navigate to="/dashboard" replace />
  }

  return props.children
}

function App() {
  const role = useNightOwlStore((state) => state.role)

  return (
    <Routes>
      <Route path="/login" element={role ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route
        path="/"
        element={role ? <AppShell /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <GuardedRoute pageKey="dashboard">
              <DashboardPage />
            </GuardedRoute>
          }
        />
        <Route
          path="demand-map"
          element={
            <GuardedRoute pageKey="demand-map">
              <DemandMapPage />
            </GuardedRoute>
          }
        />
        <Route
          path="dispatch"
          element={
            <GuardedRoute pageKey="dispatch">
              <DispatchPage />
            </GuardedRoute>
          }
        />
        <Route
          path="fleet"
          element={
            <GuardedRoute pageKey="fleet">
              <FleetPage />
            </GuardedRoute>
          }
        />
        <Route
          path="riders"
          element={
            <GuardedRoute pageKey="riders">
              <RidersPage />
            </GuardedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <GuardedRoute pageKey="reports">
              <ReportsPage />
            </GuardedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <GuardedRoute pageKey="settings">
              <SettingsPage />
            </GuardedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={role ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default App
