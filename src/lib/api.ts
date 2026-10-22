import type {
  Dispatch,
  Driver,
  Rider,
  SafetyScoreHistory,
  SafetyWeights,
  Trip,
  Vehicle,
  Role,
} from '../types/models'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'
const tokenStorageKey = 'nightowl_access_token'

type ServerRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'FLEET_OPERATOR'
  | 'DRIVER'
  | 'RIDER'

export type AuthUser = {
  id: string
  phone: string
  displayName: string
  role: ServerRole
  companyId: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const roleMap: Record<ServerRole, Role> = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  FLEET_OPERATOR: 'fleet_operator',
  DRIVER: 'driver',
  RIDER: 'rider',
}

export function getRoleForUser(user: AuthUser): Role {
  return roleMap[user.role]
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(tokenStorageKey)
}

export function saveAccessToken(token: string): void {
  window.localStorage.setItem(tokenStorageKey, token)
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(tokenStorageKey)
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const accessToken = getAccessToken()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  const bodyText = await response.text()
  const body: unknown = bodyText ? JSON.parse(bodyText) : null

  if (!response.ok) {
    const errorMessage =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}.`
    throw new ApiError(errorMessage, response.status)
  }

  return body as T
}

export function requestOtp(phone: string): Promise<{ message: string }> {
  return apiRequest('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

export function verifyOtp(
  phone: string,
  code: string,
): Promise<{ accessToken: string; user: AuthUser }> {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  })
}

export function fetchCurrentUser(): Promise<AuthUser> {
  return apiRequest('/auth/me')
}

export function fetchDrivers(): Promise<Driver[]> {
  return apiRequest('/drivers')
}

export function fetchVehicles(): Promise<Vehicle[]> {
  return apiRequest('/vehicles')
}

export function fetchTrips(): Promise<Trip[]> {
  return apiRequest('/trips')
}

export function fetchDispatches(): Promise<Dispatch[]> {
  return apiRequest('/dispatches')
}

export type EligibleVehicle = {
  id: string
  vehicleNumber: string
  type: Vehicle['type']
  etaMinutes: number
  driver: Pick<Driver, 'id' | 'name' | 'safetyScore'>
}

export function fetchEligibleVehicles(tripId: string): Promise<EligibleVehicle[]> {
  return apiRequest(`/trips/${encodeURIComponent(tripId)}/eligible-vehicles`)
}

export function createDispatch(tripId: string): Promise<Dispatch> {
  return apiRequest(`/trips/${encodeURIComponent(tripId)}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function respondToDispatch(
  dispatchId: string,
  decision: 'accept' | 'reject',
): Promise<{ dispatch: Dispatch; reassignedDispatchId: string | null }> {
  return apiRequest(`/dispatches/${encodeURIComponent(dispatchId)}/respond`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  })
}

export function transitionTrip(
  tripId: string,
  status: Trip['status'],
): Promise<Trip> {
  return apiRequest(`/trips/${encodeURIComponent(tripId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export type DriverLocationInput = {
  active: true
  latitude: number
  longitude: number
  accuracyMeters?: number
}

export function reportDriverLocation(location: DriverLocationInput): Promise<{
  latitude: number
  longitude: number
  gpsActive: boolean
  gpsUpdatedAt: string
  safetyScore: number
}> {
  return apiRequest('/driver/location', {
    method: 'PUT',
    body: JSON.stringify(location),
  })
}

export function stopDriverLocation(): Promise<{
  latitude: null
  longitude: null
  gpsActive: false
  gpsUpdatedAt: null
  safetyScore: number
}> {
  return apiRequest('/driver/location', {
    method: 'PUT',
    body: JSON.stringify({ active: false }),
  })
}

export function fetchRiders(): Promise<Rider[]> {
  return apiRequest('/riders')
}

export function fetchSafetyWeights(): Promise<SafetyWeights> {
  return apiRequest('/safety/weights')
}

export function fetchDriverSafetyHistory(driverId: string): Promise<SafetyScoreHistory[]> {
  return apiRequest(`/drivers/${encodeURIComponent(driverId)}/safety-history`)
}

export function updateSafetyWeights(weights: SafetyWeights): Promise<SafetyWeights> {
  return apiRequest('/safety/weights', {
    method: 'PUT',
    body: JSON.stringify(weights),
  })
}

export type CreateTripInput = {
  pickupLabel: string
  pickupLatitude?: number
  pickupLongitude?: number
  dropoffLabel: string
  dropoffLatitude?: number
  dropoffLongitude?: number
  scheduledAt?: string
}

export function createTrip(input: CreateTripInput): Promise<Trip> {
  return apiRequest('/trips', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type PilotEvent = {
  companyId: string
  type: 'trip.updated' | 'dispatch.updated' | 'driver.location' | 'safety.updated'
  entityId: string
}

const pilotEventTypes: PilotEvent['type'][] = [
  'trip.updated',
  'dispatch.updated',
  'driver.location',
  'safety.updated',
]

function isPilotEvent(payload: unknown): payload is PilotEvent {
  return typeof payload === 'object'
    && payload !== null
    && 'companyId' in payload
    && typeof payload.companyId === 'string'
    && 'type' in payload
    && typeof payload.type === 'string'
    && pilotEventTypes.includes(payload.type as PilotEvent['type'])
    && 'entityId' in payload
    && typeof payload.entityId === 'string'
}

export async function streamPilotEvents(
  onEvent: (event: PilotEvent) => void,
  signal: AbortSignal,
  onConnected?: () => void,
): Promise<void> {
  const accessToken = getAccessToken()
  if (!accessToken) throw new ApiError('Sign in to receive live pilot updates.', 401)

  const response = await fetch(`${apiBaseUrl}/events`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream',
    },
    signal,
  })
  if (!response.ok) {
    const responseBody = await response.text()
    throw new ApiError(
      responseBody || `Live updates failed with status ${response.status}.`,
      response.status,
    )
  }
  if (!response.body) {
    throw new Error('The browser does not support the live updates stream.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let dataLines: string[] = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const normalizedLine = line.endsWith('\r') ? line.slice(0, -1) : line
        if (normalizedLine.startsWith('data:')) {
          dataLines.push(normalizedLine.slice(5).trimStart())
        } else if (normalizedLine === '' && dataLines.length) {
          const payload: unknown = JSON.parse(dataLines.join('\n'))
          dataLines = []
          if (
            typeof payload === 'object'
            && payload !== null
            && 'type' in payload
            &&             payload.type === 'ready'
          ) {
            onConnected?.()
            continue
          }
          if (!isPilotEvent(payload)) {
            throw new Error('The live updates stream returned an invalid event.')
          }
          onEvent(payload)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
