import { Bell, Compass, LayoutDashboard, LogOut, Navigation, Settings, Shield, Truck } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useNightOwlStore } from '../../store/useNightOwlStore'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/demand-map', label: 'Demand Map', icon: Compass },
  { to: '/dispatch', label: 'Dispatch', icon: Truck },
  { to: '/driver', label: 'Driver App', icon: Navigation },
  { to: '/riders', label: 'Riders', icon: Shield },
  { to: '/reports', label: 'Reports', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function roleTitle(role: string | null): string {
  if (!role) return 'Guest'
  return role
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

export function AppShell() {
  const role = useNightOwlStore((state) => state.role)
  const logout = useNightOwlStore((state) => state.logout)
  const visibleNavItems = navItems.filter((item) => {
    if (!role) return true
    if (item.to === '/driver') return role === 'driver'
    if (role === 'rider') return item.to !== '/reports' && item.to !== '/demand-map'
    if (role === 'driver') return ['/driver', '/dispatch'].includes(item.to)
    if (role === 'fleet_operator') return ['/dashboard', '/dispatch'].includes(item.to)
    if (role === 'company_admin') return ['/dashboard', '/reports', '/settings'].includes(item.to)
    if (role === 'government_admin') return ['/dashboard', '/demand-map'].includes(item.to)
    return true
  })

  return (
    <div className="min-h-screen bg-app-gradient text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-700/70 bg-slate-950/90 px-5 py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-slate-950">N</span>
            <div>
              <p className="text-lg font-semibold text-white">NightOwl</p>
              <p className="text-xs text-slate-400">Safety Operations</p>
            </div>
          </Link>

          <div className="mt-8 space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon size={17} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>

          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm">
            <p className="text-slate-400">Logged in as</p>
            <p className="font-semibold text-slate-100">{roleTitle(role)}</p>
          </div>

          <button
            onClick={logout}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <LogOut size={15} />
            Log out
          </button>
        </aside>

        <main className="p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
