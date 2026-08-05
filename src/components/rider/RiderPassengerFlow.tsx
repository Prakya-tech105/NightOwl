import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarClock, Clock3, CreditCard, MapPin, Navigation, ShieldCheck } from 'lucide-react'
import { DriverArrivalCard } from './DriverArrivalCard'
import { FloatingSOSButton } from './FloatingSOSButton'
import { RideNowScheduleToggle } from './RideNowScheduleToggle'
import { RiderLocationField } from './RiderLocationField'
import { RoutePreviewCard } from './RoutePreviewCard'
import { SafeRideOptionCard } from './SafeRideOptionCard'
import { SafetyAdvisoryCard } from './SafetyAdvisoryCard'
import { fetchGooglePlaceSuggestions, isGooglePlacesConfigured, reverseGeocodeLatLng } from '../../lib/googlePlaces'
import { calculateIndianMeterFare } from '../../lib/indianMeterFare'
import { useNightOwlStore } from '../../store/useNightOwlStore'
import type { DriverSnapshot, RideOption, RiderFlowStep, RouteSummary, TripMode } from './types'

const bengaluruLocations = [
  'Indiranagar Metro Station, Bengaluru',
  '100 Feet Road, Indiranagar, Bengaluru',
  '12th Main Road, Indiranagar, Bengaluru',
  'Rajajinagar Metro Station, Bengaluru',
  '1st Block, Rajajinagar, Bengaluru',
  'Forum Mall, Koramangala, Bengaluru',
  'Sony Signal, Koramangala, Bengaluru',
  'HSR Layout BDA Complex, Bengaluru',
  '27th Main, HSR Layout, Bengaluru',
  'Church Street, MG Road, Bengaluru',
  'Brigade Road, MG Road, Bengaluru',
  '4th Block, Jayanagar, Bengaluru',
  'South End Circle, Jayanagar, Bengaluru',
  'Electronic City Phase 1, Bengaluru',
  'Electronic City Toll Gate, Bengaluru',
]

const baseRideOptions: Omit<RideOption, 'fare'>[] = [
  {
    id: 'safe-auto',
    name: 'Safe Auto',
    etaMinutes: 5,
    capacity: 3,
    safetyScore: 92,
    verifiedOnly: true,
    recommendedTag: 'Best Value',
  },
  {
    id: 'pink-auto',
    name: 'Pink Auto',
    etaMinutes: 6,
    capacity: 3,
    safetyScore: 95,
    verifiedOnly: true,
    recommendedTag: 'Safest',
  },
  {
    id: 'mini',
    name: 'Mini',
    etaMinutes: 4,
    capacity: 4,
    safetyScore: 89,
    verifiedOnly: true,
  },
  {
    id: 'sedan',
    name: 'Sedan',
    etaMinutes: 7,
    capacity: 4,
    safetyScore: 90,
    verifiedOnly: true,
  },
]

const fareModelByRideId: Record<
  string,
  {
    baseFare: number
    includedKm: number
    mileageKmPerLitre: number
    driverAndOpsPerKm: number
    safetyFee: number
    nightSurchargePct: number
  }
> = {
  'safe-auto': {
    baseFare: 36,
    includedKm: 1.8,
    mileageKmPerLitre: 28,
    driverAndOpsPerKm: 15,
    safetyFee: 8,
    nightSurchargePct: 0.12,
  },
  'pink-auto': {
    baseFare: 40,
    includedKm: 1.8,
    mileageKmPerLitre: 27,
    driverAndOpsPerKm: 16,
    safetyFee: 12,
    nightSurchargePct: 0.12,
  },
  mini: {
    baseFare: 58,
    includedKm: 2,
    mileageKmPerLitre: 14,
    driverAndOpsPerKm: 19,
    safetyFee: 10,
    nightSurchargePct: 0.14,
  },
  sedan: {
    baseFare: 72,
    includedKm: 2,
    mileageKmPerLitre: 12,
    driverAndOpsPerKm: 22,
    safetyFee: 12,
    nightSurchargePct: 0.14,
  },
}

const drivers: DriverSnapshot[] = [
  {
    id: 'drv-latha',
    name: 'Latha Reddy',
    vehicleNumber: 'KA-03-MJ-4821',
    vehicleType: 'Pink Auto',
    etaMinutes: 6,
    safetyConfidence: 96,
    backgroundChecked: true,
  },
  {
    id: 'drv-ananya',
    name: 'Ananya S',
    vehicleNumber: 'KA-01-PQ-7148',
    vehicleType: 'Mini',
    etaMinutes: 4,
    safetyConfidence: 88,
    backgroundChecked: true,
  },
  {
    id: 'drv-kavya',
    name: 'Kavya N',
    vehicleNumber: 'KA-05-TC-2639',
    vehicleType: 'Sedan',
    etaMinutes: 8,
    safetyConfidence: 82,
    backgroundChecked: true,
  },
]

const routeSummaryByKey: Record<string, RouteSummary> = {
  'Indiranagar|Koramangala': { durationMinutes: 24, distanceKm: 8.9, corridorHint: 'Well-lit route preferred' },
  'MG Road|Jayanagar': { durationMinutes: 21, distanceKm: 7.1, corridorHint: 'Patrolled corridor active' },
  'Rajajinagar|Electronic City': {
    durationMinutes: 43,
    distanceKm: 19.4,
    corridorHint: 'Safer arterial route enabled',
  },
}

function getRouteSummary(from: string, to: string): RouteSummary {
  if (!from || !to) {
    return { durationMinutes: 0, distanceKm: 0, corridorHint: 'Route not available' }
  }

  const normalizeZone = (value: string): string => {
    const normalized = value.toLowerCase()
    if (normalized.includes('indiranagar')) return 'Indiranagar'
    if (normalized.includes('koramangala')) return 'Koramangala'
    if (normalized.includes('mg road')) return 'MG Road'
    if (normalized.includes('jayanagar')) return 'Jayanagar'
    if (normalized.includes('rajajinagar')) return 'Rajajinagar'
    if (normalized.includes('electronic city')) return 'Electronic City'
    if (normalized.includes('hsr')) return 'HSR Layout'
    return value
  }

  const direct = routeSummaryByKey[`${normalizeZone(from)}|${normalizeZone(to)}`]
  if (direct) return direct

  return {
    durationMinutes: 18 + ((from.length + to.length) % 19),
    distanceKm: 5.5 + (((from.length * to.length) % 110) / 10),
    corridorHint: 'Well-lit route preferred',
  }
}

type RiderPassengerFlowProps = {
  riderName: string
  emergencyContacts: string[]
}

export function RiderPassengerFlow(props: RiderPassengerFlowProps) {
  const setSelectedPickupLocality = useNightOwlStore((state) => state.setSelectedPickupLocality)
  const [step, setStep] = useState<RiderFlowStep>('booking')
  const [fromLocation, setFromLocation] = useState('Indiranagar Metro Station, Bengaluru')
  const [toLocation, setToLocation] = useState('Forum Mall, Koramangala, Bengaluru')
  const [tripMode, setTripMode] = useState<TripMode>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [selectedRideId, setSelectedRideId] = useState(baseRideOptions[1].id)
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [activeDriver, setActiveDriver] = useState<DriverSnapshot>(drivers[0])
  const [sosTriggered, setSosTriggered] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [tripActionMessage, setTripActionMessage] = useState<string | null>(null)
  const [showTrustedContacts, setShowTrustedContacts] = useState(false)
  const [showVerificationSummary, setShowVerificationSummary] = useState(false)
  const petrolPricePerLitre = 103
  const [placesSessionToken] = useState(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  })

  const routeSummary = useMemo(
    () => getRouteSummary(fromLocation, toLocation),
    [fromLocation, toLocation],
  )
  const rideOptions = useMemo(
    () =>
      baseRideOptions.map((ride) => {
        const model = fareModelByRideId[ride.id]
        const fare = calculateIndianMeterFare({
          distanceKm: routeSummary.distanceKm,
          petrolPricePerLitre,
          ...model,
        })

        return {
          ...ride,
          fare,
        }
      }),
    [petrolPricePerLitre, routeSummary.distanceKm],
  )
  const selectedRide = rideOptions.find((ride) => ride.id === selectedRideId) ?? rideOptions[0]
  const canSeeOptions = Boolean(fromLocation && toLocation && (tripMode === 'now' || scheduledAt))

  function extractLocality(value: string): string {
    const normalized = value.toLowerCase()
    if (normalized.includes('indiranagar')) return 'Indiranagar'
    if (normalized.includes('koramangala')) return 'Koramangala'
    if (normalized.includes('mg road')) return 'MG Road'
    if (normalized.includes('jayanagar')) return 'Jayanagar'
    if (normalized.includes('rajajinagar')) return 'Rajajinagar'
    if (normalized.includes('electronic city')) return 'Electronic City'
    if (normalized.includes('hsr')) return 'HSR Layout'
    if (normalized.includes('btm')) return 'BTM Layout'
    if (normalized.includes('bellandur')) return 'Bellandur'
    return value.split(',')[0]?.trim() || 'Indiranagar'
  }

  function updateFromLocation(value: string) {
    setFromLocation(value)
    setSelectedPickupLocality(extractLocality(value))
  }

  useEffect(() => {
    setSelectedPickupLocality(extractLocality(fromLocation))
  }, [fromLocation, setSelectedPickupLocality])

  function goToOptions() {
    if (!canSeeOptions) return
    setStep('options')
  }

  function goToConfirm() {
    if (!selectedRideId) return
    setStep('confirm')
  }

  function confirmRide() {
    const linkedDriver = drivers.find((driver) =>
      driver.vehicleType.toLowerCase().includes(selectedRide.name.toLowerCase().split(' ')[0]),
    )
    setActiveDriver(linkedDriver ?? drivers[0])
    setStep('arriving')
  }

  function resetRideFlow() {
    setStep('booking')
    setSelectedRideId(rideOptions[1]?.id ?? rideOptions[0].id)
    setTripActionMessage(null)
    setShowTrustedContacts(false)
    setShowVerificationSummary(false)
  }

  async function handleShareLiveTrip() {
    const text = `NightOwl live trip: ${fromLocation} to ${toLocation}. Driver ${activeDriver.name}, vehicle ${activeDriver.vehicleNumber}, ETA 14 min.`

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'NightOwl Live Trip',
          text,
        })
        setTripActionMessage('Live trip shared successfully.')
        return
      }

      await navigator.clipboard.writeText(text)
      setTripActionMessage('Trip details copied to clipboard. Share it with your trusted contacts.')
    } catch {
      setTripActionMessage('Unable to share right now. Please try again.')
    }
  }

  function handleEmergencyHelpline() {
    setTripActionMessage('Connecting emergency helpline (112). If call does not open, dial 112 manually.')
    window.open('tel:112', '_self')
  }

  function handleReportIssue() {
    setTripActionMessage('Issue report logged. NightOwl safety desk has been notified and is monitoring your trip.')
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      updateFromLocation('Church Street, MG Road, Bengaluru')
      setLocationError('Live location is not supported in this browser. Defaulted to central Bengaluru.')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(5)
        const lng = position.coords.longitude.toFixed(5)

        const resolvedLocation = await reverseGeocodeLatLng(position.coords.latitude, position.coords.longitude)
        const nextLocation = resolvedLocation ?? `Current location (${lat}, ${lng})`
        updateFromLocation(nextLocation)
        setIsLocating(false)
      },
      () => {
        updateFromLocation('Church Street, MG Road, Bengaluru')
        setLocationError('Could not fetch live location. Please allow permission or type your pickup spot.')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function handleFetchSuggestions(query: string): Promise<string[]> {
    return fetchGooglePlaceSuggestions(query, placesSessionToken)
  }

  return (
    <div className="relative min-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[28px] border border-indigo-900/70 bg-[#030b2a]/95 lg:min-h-[calc(100vh-3rem)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(124,58,237,0.2),transparent_30%),radial-gradient(circle_at_88%_4%,rgba(56,189,248,0.12),transparent_26%)]" />

      <div className="relative border-b border-indigo-900/70 px-6 py-4 sm:px-8">
        <div className="flex flex-wrap gap-7 text-base font-semibold sm:text-lg">
          <span className="text-violet-400">Passenger View</span>
          <span className="text-slate-400">Safety-first Booking</span>
          <span className="text-slate-400">Verified Night Rides</span>
        </div>
      </div>

      <div className="relative mx-auto max-w-4xl space-y-6 px-5 py-6 sm:px-8 sm:py-8">
        {step === 'booking' ? (
          <section className="space-y-5 rounded-3xl border border-indigo-900/70 bg-slate-950/55 p-5 sm:p-6">
            <div>
              <h2 className="text-3xl font-semibold text-slate-100 sm:text-4xl">Book a Safe Ride</h2>
              <p className="mt-2 text-sm text-slate-300">
                Women&apos;s night-safety rides with verified drivers only. Welcome, {props.riderName}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <RiderLocationField
                label="From"
                placeholder="Search pickup spot"
                value={fromLocation}
                options={bengaluruLocations}
                icon={MapPin}
                onChange={updateFromLocation}
                fetchSuggestions={handleFetchSuggestions}
                allowCurrentLocation
                currentLocationLabel="Use current location"
                onUseCurrentLocation={useCurrentLocation}
                isUsingCurrentLocation={isLocating}
              />

              <RiderLocationField
                label="To"
                placeholder="Search destination spot"
                value={toLocation}
                options={bengaluruLocations}
                icon={Navigation}
                onChange={setToLocation}
                fetchSuggestions={handleFetchSuggestions}
              />
            </div>

            {locationError ? <p className="text-xs text-amber-300">{locationError}</p> : null}
            {!isGooglePlacesConfigured() ? (
              <p className="text-xs text-slate-400">
                Add VITE_GOOGLE_MAPS_API_KEY in your environment to enable live Google Maps place predictions.
              </p>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Saved places</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Home - 12th Main Road, Indiranagar, Bengaluru',
                  'Work - Electronic City Phase 1, Bengaluru',
                  'Recent - 27th Main, HSR Layout, Bengaluru',
                ].map((place) => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => {
                      const parts = place.split(' - ')
                      if (parts.length === 2) {
                        updateFromLocation(parts[1])
                      }
                    }}
                    className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-violet-700/70"
                  >
                    {place}
                  </button>
                ))}
              </div>
            </div>

            <RideNowScheduleToggle
              value={tripMode}
              onChange={setTripMode}
              scheduledAt={scheduledAt}
              onScheduleChange={setScheduledAt}
            />

            {fromLocation && toLocation ? (
              <RoutePreviewCard from={fromLocation} to={toLocation} summary={routeSummary} />
            ) : null}

            <SafetyAdvisoryCard
              title="Night-safe pickup hint"
              message="Move to a lit storefront or gate before pickup. Only verified drivers are assigned for night rides."
            />

            <button
              type="button"
              disabled={!canSeeOptions}
              onClick={goToOptions}
              className={[
                'inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold transition',
                canSeeOptions
                  ? 'bg-gradient-to-r from-violet-700 to-indigo-600 text-white shadow-[0_0_28px_rgba(124,58,237,0.4)] hover:from-violet-600 hover:to-indigo-500'
                  : 'cursor-not-allowed bg-violet-900/60 text-slate-400',
              ].join(' ')}
            >
              See Safe Ride Options
              <ArrowRight size={18} />
            </button>
          </section>
        ) : null}

        {step === 'options' ? (
          <section className="space-y-5 rounded-3xl border border-indigo-900/70 bg-slate-950/55 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold text-slate-100">Choose your safe ride</h3>
              <button
                type="button"
                onClick={() => setStep('booking')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                <ArrowLeft size={14} />
                Edit route
              </button>
            </div>

            <RoutePreviewCard from={fromLocation} to={toLocation} summary={routeSummary} />

            <div className="space-y-3">
              {rideOptions.map((ride) => (
                <SafeRideOptionCard
                  key={ride.id}
                  ride={ride}
                  selected={selectedRideId === ride.id}
                  onSelect={setSelectedRideId}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goToConfirm}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-600 text-lg font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,0.4)] hover:from-violet-600 hover:to-indigo-500"
            >
              Continue to Confirmation
              <ArrowRight size={18} />
            </button>
          </section>
        ) : null}

        {step === 'confirm' ? (
          <section className="space-y-5 rounded-3xl border border-indigo-900/70 bg-slate-950/55 p-5 sm:p-6">
            <h3 className="text-2xl font-semibold text-slate-100">Confirm booking</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
                <p className="text-slate-400">Pickup</p>
                <p className="mt-1 font-semibold text-slate-100">{fromLocation}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
                <p className="text-slate-400">Destination</p>
                <p className="mt-1 font-semibold text-slate-100">{toLocation}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
                <p className="text-slate-400">Ride type</p>
                <p className="mt-1 font-semibold text-slate-100">{selectedRide.name}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm">
                <p className="text-slate-400">Fare estimate</p>
                <p className="mt-1 font-semibold text-slate-100">INR {selectedRide.fare}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-violet-700/70 bg-violet-900/30 px-2.5 py-1 text-violet-100">
                ETA {selectedRide.etaMinutes} min
              </span>
              <span className="rounded-full border border-violet-700/70 bg-violet-900/30 px-2.5 py-1 text-violet-100">
                Safety score {selectedRide.safetyScore}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1 text-emerald-200">
                <ShieldCheck size={12} />
                Verified driver only
              </span>
              <span className="rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1 text-emerald-200">
                Safer route
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200">
                Background checked
              </span>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Payment method
              <div className="relative mt-3">
                <CreditCard
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="h-12 w-full rounded-xl border border-indigo-900/70 bg-[#020826] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-violet-500"
                >
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Cash</option>
                  <option>Wallet</option>
                </select>
              </div>
            </label>

            <SafetyAdvisoryCard
              title="AI safety note"
              message="Route screening active. Driver verification is continuously checked until drop-off."
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep('options')}
                className="h-12 rounded-xl border border-slate-700 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Back to options
              </button>
              <button
                type="button"
                onClick={confirmRide}
                className="h-12 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 text-sm font-semibold text-white shadow-[0_0_22px_rgba(124,58,237,0.4)] hover:from-violet-600 hover:to-indigo-500"
              >
                Confirm Ride
              </button>
            </div>
          </section>
        ) : null}

        {step === 'arriving' ? (
          <section className="space-y-5 rounded-3xl border border-indigo-900/70 bg-slate-950/55 p-5 sm:p-6">
            <div>
              <h3 className="text-2xl font-semibold text-slate-100">Driver arriving</h3>
              <p className="mt-1 text-sm text-slate-300">
                Match found for your trip from {fromLocation} to {toLocation}.
              </p>
            </div>

            <DriverArrivalCard driver={activeDriver} onStartTrip={() => setStep('in_trip')} />

            <SafetyAdvisoryCard
              title="Trip advisory"
              message="Share your live trip with trusted contacts before boarding. NightOwl will monitor route confidence in real time."
            />
          </section>
        ) : null}

        {step === 'in_trip' ? (
          <section className="space-y-5 rounded-3xl border border-indigo-900/70 bg-slate-950/55 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold text-slate-100">In trip safety mode</h3>
              <span className="rounded-full border border-emerald-700/70 bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                Trip protected
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
                <p>
                  {fromLocation} to {toLocation}
                </p>
                <p className="inline-flex items-center gap-1">
                  <Clock3 size={14} />
                  ETA to destination 14 min
                </p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-800">
                <div className="h-2 w-[36%] rounded-full bg-gradient-to-r from-violet-500 to-sky-500" />
              </div>
              <p className="mt-2 text-xs text-slate-400">Trip progress 36% complete</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={handleShareLiveTrip}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Share live trip
              </button>
              <button
                onClick={() => setShowTrustedContacts((current) => !current)}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Trusted contacts
              </button>
              <button
                onClick={handleEmergencyHelpline}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Emergency helpline
              </button>
              <button
                onClick={handleReportIssue}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Report issue
              </button>
              <button
                onClick={() => setShowVerificationSummary((current) => !current)}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Driver verification summary
              </button>
              <button
                onClick={resetRideFlow}
                className="min-h-11 rounded-xl border border-violet-700/60 bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-600"
              >
                Book another ride
              </button>
            </div>

            {tripActionMessage ? (
              <p className="rounded-xl border border-indigo-800/70 bg-indigo-950/40 p-3 text-sm text-indigo-100">{tripActionMessage}</p>
            ) : null}

            {showTrustedContacts ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
                <p className="font-semibold text-slate-100">Trusted contacts</p>
                <ul className="mt-2 space-y-1 text-slate-300">
                  {props.emergencyContacts.map((contact) => (
                    <li key={contact}>{contact}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showVerificationSummary ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">Driver verification summary</p>
                <p className="mt-2">Driver: {activeDriver.name}</p>
                <p>Vehicle: {activeDriver.vehicleNumber}</p>
                <p>Background checked: {activeDriver.backgroundChecked ? 'Yes' : 'No'}</p>
                <p>Safety confidence: {activeDriver.safetyConfidence}%</p>
              </div>
            ) : null}

            <SafetyAdvisoryCard
              title="AI route watch"
              message="No route deviation detected. Safer route preference remains active for this trip."
            />
          </section>
        ) : null}

        <div className="rounded-2xl border border-emerald-700/60 bg-emerald-900/20 p-3 text-xs text-emerald-100">
          Only verified drivers are assigned for night rides. Emergency contacts: {props.emergencyContacts.join(', ')}.
        </div>

        {tripMode === 'later' && scheduledAt ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-700/70 bg-indigo-950/70 px-3 py-1 text-xs text-indigo-100">
            <CalendarClock size={13} />
            Scheduled pickup at {new Date(scheduledAt).toLocaleString()}
          </div>
        ) : null}
      </div>

      <FloatingSOSButton onClick={() => setSosTriggered(true)} />
      {sosTriggered ? (
        <div className="fixed bottom-24 right-6 z-40 max-w-xs rounded-xl border border-rose-700/80 bg-rose-950/95 p-3 text-xs text-rose-100 shadow-[0_0_20px_rgba(190,18,60,0.45)]">
          SOS sent to NightOwl control room. Emergency helpline and trusted contacts have been alerted.
        </div>
      ) : null}
    </div>
  )
}
