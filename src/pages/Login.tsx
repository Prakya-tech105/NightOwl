import { ShieldCheck, Truck, Users } from 'lucide-react'
import type { Role } from '../types/models'
import { useNightOwlStore } from '../store/useNightOwlStore'

const roles: Array<{ role: Role; title: string; subtitle: string }> = [
  { role: 'rider', title: 'Rider', subtitle: 'Trip visibility and SOS support' },
  { role: 'fleet_operator', title: 'Fleet Operator', subtitle: 'Vehicle readiness and dispatch execution' },
  { role: 'company_admin', title: 'Company Admin', subtitle: 'Employee demand and fleet alignment' },
  { role: 'government_admin', title: 'Government Admin', subtitle: 'City demand and coverage command' },
]

export function LoginPage() {
  const loginAsDemoRole = useNightOwlStore((state) => state.loginAsDemoRole)

  return (
    <div className="grid min-h-screen place-items-center bg-app-gradient px-4 py-8 text-slate-100">
      <div className="w-full max-w-5xl rounded-3xl border border-slate-700 bg-slate-950/85 p-6 shadow-soft sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-amber-300">
              NightOwl Civic Transport Grid
            </div>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Women Night-Safety
              <span className="block text-amber-400">Planning and Dispatch</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
              Forecast tonight demand, deploy only verified drivers, and monitor coverage in real time across
              Karnataka zones.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
                <ShieldCheck className="text-emerald-400" size={18} />
                <p className="mt-2 text-xs uppercase text-slate-400">Verified Dispatch Rate</p>
                <p className="mt-1 text-xl font-bold">96%</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
                <Truck className="text-amber-400" size={18} />
                <p className="mt-2 text-xs uppercase text-slate-400">Vehicles Active</p>
                <p className="mt-1 text-xl font-bold">48</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
                <Users className="text-violet-300" size={18} />
                <p className="mt-2 text-xs uppercase text-slate-400">Expected Riders</p>
                <p className="mt-1 text-xl font-bold">1,172</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold">Sign In</h2>
            <p className="mt-2 text-sm text-slate-400">Enter your credentials to continue.</p>

            <form className="mt-4 space-y-3">
              <label className="block text-sm text-slate-300">
                Email
                <input
                  type="email"
                  placeholder="admin@nightowl.in"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Password
                <input
                  type="password"
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100"
                />
              </label>
              <button
                type="button"
                onClick={() => loginAsDemoRole('government_admin')}
                className="w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300"
              >
                Sign in
              </button>
              <button type="button" className="w-full text-sm text-slate-400 hover:text-slate-200">
                Forgot password
              </button>
            </form>

            <div className="mt-5 border-t border-slate-700 pt-4">
              <h3 className="text-base font-semibold text-slate-100">Demo Role Login</h3>
              <p className="mt-2 text-sm text-slate-400">Or select a role to enter the command dashboard instantly.</p>

              <div className="mt-4 space-y-3">
                {roles.map((entry) => (
                  <button
                    key={entry.role}
                    onClick={() => loginAsDemoRole(entry.role)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-left hover:border-amber-400/80 hover:bg-slate-900"
                  >
                    <p className="font-semibold text-slate-100">{entry.title}</p>
                    <p className="text-sm text-slate-400">{entry.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
