import { useMemo, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  Bell,
  CreditCard,
  KeyRound,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Shield,
  Siren,
  Trash2,
  UserCircle2,
  Wallet,
} from 'lucide-react'
import { useNightOwlStore } from '../store/useNightOwlStore'

function NumberInput(props: {
  label: string
  value: number
  step?: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-sm text-slate-200">
      {props.label}
      <input
        type="number"
        value={props.value}
        step={props.step ?? 1}
        min={props.min}
        max={props.max}
        onChange={(event: ChangeEvent<HTMLInputElement>) => props.onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
      />
    </label>
  )
}

function ToggleRow(props: {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
      <div>
        <p className="text-sm font-medium text-slate-100">{props.label}</p>
        {props.description ? <p className="mt-1 text-xs text-slate-400">{props.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => props.onChange(!props.checked)}
        className={[
          'relative mt-0.5 inline-flex h-7 w-12 items-center rounded-full transition',
          props.checked ? 'bg-violet-600' : 'bg-slate-700',
        ].join(' ')}
        aria-label={`${props.label} toggle`}
      >
        <span
          className={[
            'inline-block h-5 w-5 rounded-full bg-white transition',
            props.checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

function RiderSettingsView() {
  const rider = useNightOwlStore((state) => state.riders[0])
  const logout = useNightOwlStore((state) => state.logout)

  const [trustedContacts, setTrustedContacts] = useState<string[]>(
    rider?.emergencyContacts.slice(0, 3) ?? ['+91 9988776655', '+91 8877665544'],
  )
  const [newContact, setNewContact] = useState('')
  const [defaultEmergencyContact, setDefaultEmergencyContact] = useState<string>(trustedContacts[0] ?? '')

  const [autoShareNightTrips, setAutoShareNightTrips] = useState(true)
  const [autoShareAfter, setAutoShareAfter] = useState('20:00')

  const [sosPolice, setSosPolice] = useState(true)
  const [sosHelpline, setSosHelpline] = useState(true)
  const [sosTrustedContact, setSosTrustedContact] = useState(true)

  const [saferRoutePreference, setSaferRoutePreference] = useState(true)
  const [showVerificationStatus, setShowVerificationStatus] = useState(true)
  const [ridePinRequired, setRidePinRequired] = useState(true)

  const [defaultRideType, setDefaultRideType] = useState('Pink Auto')
  const [defaultBookingMode, setDefaultBookingMode] = useState('Ride now')
  const [womenPreferredRide, setWomenPreferredRide] = useState(true)
  const [pickupPreference, setPickupPreference] = useState('Current location')
  const [silentRidePreference, setSilentRidePreference] = useState(false)
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('None')

  const [phoneMasking, setPhoneMasking] = useState(true)
  const [tripSharingAudience, setTripSharingAudience] = useState('Trusted contacts only')
  const [locationSharingPermissions, setLocationSharingPermissions] = useState(true)
  const [saveRideHistory, setSaveRideHistory] = useState(true)
  const [hideHomeWorkLabels, setHideHomeWorkLabels] = useState(true)

  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState('UPI')
  const [fareAlerts, setFareAlerts] = useState(true)
  const [surgeAlerts, setSurgeAlerts] = useState(true)

  const [notifyDriverArriving, setNotifyDriverArriving] = useState(true)
  const [notifyTripStatus, setNotifyTripStatus] = useState(true)
  const [notifyScheduleReminder, setNotifyScheduleReminder] = useState(true)
  const [notifyEmergencyAlerts, setNotifyEmergencyAlerts] = useState(true)
  const [notifySafetyReminders, setNotifySafetyReminders] = useState(true)
  const [notifyPromotions, setNotifyPromotions] = useState(false)

  const [language, setLanguage] = useState('English')
  const [biometricLogin, setBiometricLogin] = useState(true)
  const [actionFeedback, setActionFeedback] = useState('')

  const canAddContact = trustedContacts.length < 5 && newContact.trim().length > 0

  const accountProfile = useMemo(
    () => ({
      name: rider?.name ?? 'NightOwl Rider',
      phone: rider?.phone ?? '+91 9000000000',
      email: 'rider@nightowl.in',
    }),
    [rider?.name, rider?.phone],
  )

  const addTrustedContact = () => {
    if (!canAddContact) return

    const next = newContact.trim()
    setTrustedContacts((current) => [...current, next])
    if (!defaultEmergencyContact) {
      setDefaultEmergencyContact(next)
    }
    setNewContact('')
  }

  const removeTrustedContact = (contact: string) => {
    setTrustedContacts((current) => current.filter((item) => item !== contact))
    if (defaultEmergencyContact === contact) {
      setDefaultEmergencyContact('')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-2xl border border-violet-700/60 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-violet-300" />
          <h2 className="text-xl font-semibold text-slate-50">Safety Toolkit</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">Trusted contacts, SOS setup, safer routes, and ride verification.</p>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <p className="text-sm font-medium text-slate-100">Trusted contacts (up to 5)</p>
            <div className="mt-2 space-y-2">
              {trustedContacts.map((contact) => (
                <div key={contact} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-xs">
                  <div>
                    <p className="text-slate-200">{contact}</p>
                    <label className="mt-1 inline-flex items-center gap-1 text-slate-400">
                      <input
                        type="radio"
                        name="defaultEmergency"
                        checked={defaultEmergencyContact === contact}
                        onChange={() => setDefaultEmergencyContact(contact)}
                      />
                      Default emergency contact
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${contact}`} className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800">
                      <Phone size={12} />
                      Call
                    </a>
                    <a href={`sms:${contact}`} className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800">
                      <MessageCircle size={12} />
                      Message
                    </a>
                    <button
                      type="button"
                      onClick={() => removeTrustedContact(contact)}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-700/60 px-2 py-1 text-rose-300 hover:bg-rose-900/30"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={newContact}
                onChange={(event) => setNewContact(event.target.value)}
                placeholder="Add contact number"
                className="h-10 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
              />
              <button
                type="button"
                onClick={addTrustedContact}
                disabled={!canAddContact}
                className="inline-flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-slate-100">Auto-share night trips</p>
              <button
                type="button"
                onClick={() => setAutoShareNightTrips((current) => !current)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  autoShareNightTrips ? 'bg-emerald-700/40 text-emerald-200' : 'bg-slate-700 text-slate-300',
                ].join(' ')}
              >
                {autoShareNightTrips ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <label className="mt-2 block text-xs text-slate-400">
              Auto-share after time
              <input
                type="time"
                value={autoShareAfter}
                onChange={(event) => setAutoShareAfter(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100"
              />
            </label>
          </div>

          <ToggleRow label="SOS calls police" checked={sosPolice} onChange={setSosPolice} />
          <ToggleRow label="SOS calls helpline" checked={sosHelpline} onChange={setSosHelpline} />
          <ToggleRow label="SOS alerts trusted contact" checked={sosTrustedContact} onChange={setSosTrustedContact} />
          <ToggleRow
            label="Safer route preference"
            description="Prefer well-lit and monitored corridors where possible."
            checked={saferRoutePreference}
            onChange={setSaferRoutePreference}
          />
          <ToggleRow
            label="Show driver verification before boarding"
            description="Always display Aadhaar-verified and background-checked status."
            checked={showVerificationStatus}
            onChange={setShowVerificationStatus}
          />
          <ToggleRow
            label="Ride PIN / trip code required"
            description="Verify the correct vehicle before trip start."
            checked={ridePinRequired}
            onChange={setRidePinRequired}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-slate-50">Ride Preferences</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-200">
            Default ride type
            <select
              value={defaultRideType}
              onChange={(event) => setDefaultRideType(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100"
            >
              <option>Safe Auto</option>
              <option>Pink Auto</option>
              <option>Mini</option>
              <option>Sedan</option>
            </select>
          </label>

          <label className="block text-sm text-slate-200">
            Default booking mode
            <select
              value={defaultBookingMode}
              onChange={(event) => setDefaultBookingMode(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100"
            >
              <option>Ride now</option>
              <option>Schedule later</option>
            </select>
          </label>

          <label className="block text-sm text-slate-200">
            Pickup preference
            <select
              value={pickupPreference}
              onChange={(event) => setPickupPreference(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100"
            >
              <option>Current location</option>
              <option>Saved Home</option>
              <option>Saved Work</option>
            </select>
          </label>

          <label className="block text-sm text-slate-200">
            Accessibility needs
            <select
              value={accessibilityNeeds}
              onChange={(event) => setAccessibilityNeeds(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100"
            >
              <option>None</option>
              <option>Wheelchair support</option>
              <option>Low-step vehicle preferred</option>
              <option>Assistance at pickup</option>
            </select>
          </label>
        </div>

        <div className="mt-3 space-y-2">
          <ToggleRow label="Women-preferred ride option" checked={womenPreferredRide} onChange={setWomenPreferredRide} />
          <ToggleRow label="Silent ride / minimal conversation" checked={silentRidePreference} onChange={setSilentRidePreference} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-slate-50">Privacy Controls</h3>
        <div className="mt-3 space-y-2">
          <ToggleRow label="Phone number masking" checked={phoneMasking} onChange={setPhoneMasking} />
          <ToggleRow label="Location sharing permissions" checked={locationSharingPermissions} onChange={setLocationSharingPermissions} />
          <ToggleRow label="Save ride history" checked={saveRideHistory} onChange={setSaveRideHistory} />
          <ToggleRow label="Hide Home/Work labels on shared screens" checked={hideHomeWorkLabels} onChange={setHideHomeWorkLabels} />
          <label className="block text-sm text-slate-200">
            Who receives trip-sharing links
            <select
              value={tripSharingAudience}
              onChange={(event) => setTripSharingAudience(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100"
            >
              <option>Trusted contacts only</option>
              <option>Any selected contact</option>
              <option>No one by default</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setActionFeedback('Ride history deleted from this device (demo action).')}
            className="rounded-lg border border-rose-700/60 px-3 py-2 text-sm text-rose-300 hover:bg-rose-900/20"
          >
            Delete ride history
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Wallet size={17} className="text-violet-300" />
          <h3 className="text-lg font-semibold text-slate-50">Payments</h3>
        </div>

        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Saved payment methods</p>
            <p className="mt-1">UPI • Visa Card • Wallet • Cash</p>
          </div>

          <label className="block text-sm text-slate-200">
            Preferred payment method
            <select
              value={preferredPaymentMethod}
              onChange={(event) => setPreferredPaymentMethod(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100"
            >
              <option>UPI</option>
              <option>Card</option>
              <option>Wallet</option>
              <option>Cash</option>
            </select>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleRow label="Fare alerts" checked={fareAlerts} onChange={setFareAlerts} />
            <ToggleRow label="Surge alerts" checked={surgeAlerts} onChange={setSurgeAlerts} />
          </div>

          <button
            type="button"
            onClick={() => setActionFeedback('Invoice download started for your latest ride (demo action).')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <CreditCard size={14} />
            Download invoices
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Bell size={17} className="text-violet-300" />
          <h3 className="text-lg font-semibold text-slate-50">Notifications</h3>
        </div>
        <div className="mt-3 space-y-2">
          <ToggleRow label="Driver arriving" checked={notifyDriverArriving} onChange={setNotifyDriverArriving} />
          <ToggleRow label="Trip started/completed" checked={notifyTripStatus} onChange={setNotifyTripStatus} />
          <ToggleRow label="Schedule reminders" checked={notifyScheduleReminder} onChange={setNotifyScheduleReminder} />
          <ToggleRow label="Emergency alerts" checked={notifyEmergencyAlerts} onChange={setNotifyEmergencyAlerts} />
          <ToggleRow label="Safety reminders" checked={notifySafetyReminders} onChange={setNotifySafetyReminders} />
          <ToggleRow label="Promotional notifications" checked={notifyPromotions} onChange={setNotifyPromotions} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <UserCircle2 size={18} className="text-violet-300" />
          <h3 className="text-lg font-semibold text-slate-50">Account</h3>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <p className="text-slate-400">Name</p>
            <p className="mt-1 font-medium text-slate-100">{accountProfile.name}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
            <p className="text-slate-400">Phone</p>
            <p className="mt-1 font-medium text-slate-100">{accountProfile.phone}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm sm:col-span-2">
            <p className="text-slate-400">Email</p>
            <p className="mt-1 font-medium text-slate-100">{accountProfile.email}</p>
          </div>

          <label className="block text-sm text-slate-200 sm:col-span-2">
            Language
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100"
            >
              <option>English</option>
              <option>Kannada</option>
              <option>Hindi</option>
            </select>
          </label>
        </div>

        <div className="mt-3 space-y-2">
          <ToggleRow label="Biometric login" checked={biometricLogin} onChange={setBiometricLogin} />
          <button
            type="button"
            onClick={() => setActionFeedback('Safety concern report opened. Our safety desk will contact you shortly.')}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-700/60 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/20"
          >
            <AlertTriangle size={14} />
            Report a safety concern
          </button>
          <button
            type="button"
            onClick={() => setActionFeedback('Help and support chat opened (demo action).')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <Siren size={14} />
            Help and support
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <LogOut size={14} />
            Logout
          </button>
          <button
            type="button"
            onClick={() => setActionFeedback('Delete account request submitted to support (demo action).')}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-700/60 px-3 py-2 text-sm text-rose-300 hover:bg-rose-900/20"
          >
            <KeyRound size={14} />
            Delete account
          </button>
        </div>
      </section>

      {actionFeedback ? (
        <div className="rounded-xl border border-indigo-800/70 bg-indigo-950/40 p-3 text-sm text-indigo-100">
          {actionFeedback}
        </div>
      ) : null}

      <div className="rounded-xl border border-emerald-700/60 bg-emerald-900/25 p-3 text-xs text-emerald-100">
        Safety snapshot: Auto-share after {autoShareAfter}, SOS routes to{' '}
        {[sosPolice && 'police', sosHelpline && 'helpline', sosTrustedContact && 'trusted contact']
          .filter(Boolean)
          .join(', ') || 'none'}
        , route preference {saferRoutePreference ? 'enabled' : 'disabled'}.
      </div>
    </div>
  )
}

function OperationsSettingsView() {
  const demandSettings = useNightOwlStore((state) => state.demandSettings)
  const safetyWeights = useNightOwlStore((state) => state.safetyWeights)
  const geographies = useNightOwlStore((state) => state.geographies)
  const updateDemandSettings = useNightOwlStore((state) => state.updateDemandSettings)
  const updateSafetyWeights = useNightOwlStore((state) => state.updateSafetyWeights)
  const recalculateDemandForZone = useNightOwlStore((state) => state.recalculateDemandForZone)

  const applyDemandUpdate = (field: keyof typeof demandSettings, value: number) => {
    updateDemandSettings({ [field]: value })
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="text-lg font-semibold text-slate-50">Demand Multipliers</h2>
        <p className="mt-1 text-sm text-slate-400">Tune V1 heuristics and recalculate by zone.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <NumberInput
            label="Night Shift Ratio"
            value={demandSettings.nightShiftRatio}
            step={0.01}
            min={0.05}
            max={1}
            onChange={(value) => applyDemandUpdate('nightShiftRatio', value)}
          />
          <NumberInput
            label="Transport Need Ratio"
            value={demandSettings.transportNeedRatio}
            step={0.01}
            min={0.1}
            max={1}
            onChange={(value) => applyDemandUpdate('transportNeedRatio', value)}
          />
          <NumberInput
            label="Urban Weight"
            value={demandSettings.urbanWeight}
            step={0.01}
            min={0.5}
            max={1.4}
            onChange={(value) => applyDemandUpdate('urbanWeight', value)}
          />
          <NumberInput
            label="Average Capacity per Vehicle"
            value={demandSettings.averageCapacityPerVehicle}
            min={3}
            max={20}
            onChange={(value) => applyDemandUpdate('averageCapacityPerVehicle', value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {geographies.map((geo) => (
            <button
              key={geo.id}
              onClick={() => recalculateDemandForZone(geo.id)}
              className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
            >
              Recalculate {geo.ward ?? geo.district}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="text-lg font-semibold text-slate-50">Safety Score Weights</h2>
        <p className="mt-1 text-sm text-slate-400">Dispatch is blocked automatically below 60.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <NumberInput
            label="Aadhaar Verified"
            value={safetyWeights.aadhaarVerified}
            onChange={(value) => updateSafetyWeights({ aadhaarVerified: value })}
          />
          <NumberInput
            label="License Verified"
            value={safetyWeights.licenseVerified}
            onChange={(value) => updateSafetyWeights({ licenseVerified: value })}
          />
          <NumberInput
            label="Background Cleared"
            value={safetyWeights.backgroundCleared}
            onChange={(value) => updateSafetyWeights({ backgroundCleared: value })}
          />
          <NumberInput
            label="GPS Active"
            value={safetyWeights.gpsActive}
            onChange={(value) => updateSafetyWeights({ gpsActive: value })}
          />
          <NumberInput
            label="Panic Ready"
            value={safetyWeights.panicReady}
            onChange={(value) => updateSafetyWeights({ panicReady: value })}
          />
          <NumberInput
            label="Training Complete"
            value={safetyWeights.trainingComplete}
            onChange={(value) => updateSafetyWeights({ trainingComplete: value })}
          />
          <NumberInput
            label="Rating + History"
            value={safetyWeights.ratingAndHistory}
            onChange={(value) => updateSafetyWeights({ ratingAndHistory: value })}
          />
        </div>
      </section>
    </div>
  )
}

export function SettingsPage() {
  const role = useNightOwlStore((state) => state.role)

  if (role === 'rider') {
    return <RiderSettingsView />
  }

  return <OperationsSettingsView />
}
