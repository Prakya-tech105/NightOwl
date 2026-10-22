import { useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { requestOtp, verifyOtp } from '../lib/api'
import { useNightOwlStore } from '../store/useNightOwlStore'

export function LoginPage() {
  const loginWithToken = useNightOwlStore((state) => state.loginWithToken)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeRequested, setCodeRequested] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await requestOtp(phone.trim())
      setMessage(response.message)
      setCodeRequested(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not request a code.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await verifyOtp(phone.trim(), code.trim())
      loginWithToken(response.accessToken, response.user)
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Could not verify the code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-app-gradient px-4 py-8 text-slate-100">
      <div className="w-full max-w-5xl rounded-3xl border border-slate-700 bg-slate-950/85 p-6 shadow-soft sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-amber-300">
              ACME SYSTEMS · BELLANDUR / ORR PILOT
            </div>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Women&apos;s night commute
              <span className="block text-amber-400">Safety Operations</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
              A single-employer pilot focused on safety-gated dispatch, active trip support, and
              auditable employer reporting across the Bellandur corridor.
            </p>

            <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <ShieldCheck size={18} />
                <h2 className="font-semibold">Simulation notice</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Seeded accounts, driver checks, KYC, police verification, and development OTP delivery
                are simulated. No real verification or SMS is performed.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold">Sign in with your phone</h2>
            <p className="mt-2 text-sm text-slate-400">
              Only phone numbers enrolled by the pilot employer can sign in.
            </p>

            <form
              className="mt-5 space-y-4"
              onSubmit={codeRequested ? handleVerifyOtp : handleRequestOtp}
            >
              <label className="block text-sm text-slate-300">
                Phone number
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+919900000101"
                  required
                  disabled={loading || codeRequested}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100"
                />
              </label>
              {codeRequested && (
                <>
                  <p className="text-sm text-slate-300" role="status">{message}</p>
                  <label className="block text-sm text-slate-300">
                    Six-digit one-time code
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-slate-100"
                    />
                  </label>
                </>
              )}
              {error && (
                <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Please wait...' : codeRequested ? 'Verify and continue' : 'Send one-time code'}
              </button>
              {codeRequested && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setCodeRequested(false)
                    setCode('')
                    setMessage('')
                    setError(null)
                  }}
                  className="w-full text-sm text-slate-400 hover:text-slate-200"
                >
                  Use a different phone number
                </button>
              )}
            </form>

            <p className="mt-5 border-t border-slate-700 pt-4 text-xs leading-5 text-slate-500">
              Development OTPs are logged by the API and are not sent as SMS. Real SMS delivery requires
              an OTP provider integration.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
