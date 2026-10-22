import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { usePilotEvents } from './hooks/usePilotEvents'
import { AppShell } from './components/shared/AppShell'
import { DashboardPage } from './pages/Dashboard'
import { DemandMapPage } from './pages/DemandMap'
import { DispatchPage } from './pages/Dispatch'
import { DriverPwaPage } from './pages/DriverPwa'
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
  company_admin: ['dashboard', 'reports', 'settings'],
  fleet_operator: ['dashboard', 'dispatch'],
  driver: ['driver', 'dispatch'],
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
  const currentUser = useNightOwlStore((state) => state.currentUser)
  const authStatus = useNightOwlStore((state) => state.authStatus)
  const authError = useNightOwlStore((state) => state.authError)
  const restoreSession = useNightOwlStore((state) => state.restoreSession)
  const logout = useNightOwlStore((state) => state.logout)
  const eventStreamError = usePilotEvents(currentUser?.id, authStatus === 'authenticated')

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  if (authStatus === 'loading') {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">Checking session...</div>
  }

  if (authStatus === 'error') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-200">
        <div className="max-w-md rounded-2xl border border-rose-500/40 bg-slate-900 p-6">
          <h1 className="text-lg font-semibold">Unable to verify your session</h1>
          <p className="mt-2 text-sm text-slate-300">{authError}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void restoreSession()}
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm"
            >
              Sign in again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {eventStreamError ? (
        <div role="status" className="border-b border-amber-700/50 bg-amber-950/40 px-4 py-2 text-center text-sm text-amber-100">
          {eventStreamError}
        </div>
      ) : null}
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
          path="driver"
          element={
            <GuardedRoute pageKey="driver">
              <DriverPwaPage />
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
    </>
  )
}

export default App
