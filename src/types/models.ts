export type Role =
  | 'super_admin'
  | 'government_admin'
  | 'company_admin'
  | 'fleet_operator'
  | 'driver'
  | 'rider'

export type Geography = {
  id: string
  state: string
  district: string
  city?: string
  ward?: string
  pincode?: string
  lat?: number
  lng?: number
}

export type Confidence = 'low' | 'medium' | 'high'

export type DemandRecord = {
  id: string
  geographyId: string
  femaleWorkers: number
  nightShiftRatio: number
  transportNeedRatio: number
  urbanWeight: number
  estimatedNightWorkers: number
  estimatedRideDemand: number
  vehiclesNeeded: number
  confidence: Confidence
  timestamp: string
}

export type Driver = {
  id: string
  name: string
  phone: string
  aadhaarVerified: boolean
  licenseVerified: boolean
  backgroundCleared: boolean
  gpsActive: boolean
  panicReady: boolean
  trainingComplete: boolean
  rating: number
  incidentCount: number
  safetyScore: number
  status: 'available' | 'assigned' | 'offline'
  zone: string
  simulationOnly: boolean
  applicationStatus: 'pending' | 'approved' | 'rejected'
}

export type Vehicle = {
  id: string
  vehicleNumber: string
  type: 'auto' | 'cab' | 'van'
  capacity: number
  zone: string
  driverId: string
  available: boolean
  etaMinutes: number
  readiness: 'ready' | 'not_ready'
}

export type DispatchStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'ASSIGNED'
  | 'CANCELLED'

export type TripStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ARRIVING'
  | 'IN_TRIP'
  | 'COMPLETED'
  | 'CANCELLED'

export type Dispatch = {
  id: string
  tripId: string
  vehicleId: string
  driverId: string
  etaMinutes: number
  safetyScore: number
  status: DispatchStatus
  attempt: number
  createdAt: string
  trip?: {
    id: string
    riderUserId: string
    pickupLabel: string
    dropoffLabel: string
    status: TripStatus
    rider?: { id: string; displayName: string; phone: string }
  }
  driver?: Pick<Driver, 'id' | 'name' | 'phone' | 'safetyScore'>
  vehicle?: Pick<Vehicle, 'id' | 'vehicleNumber' | 'type'>
}

export type Trip = {
  id: string
  riderUserId: string
  status: TripStatus
  pickupLabel: string
  pickupLatitude: number | null
  pickupLongitude: number | null
  dropoffLabel: string
  dropoffLatitude: number | null
  dropoffLongitude: number | null
  requestedAt: string
  scheduledAt: string | null
  assignedAt: string | null
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  rider?: { id: string; displayName: string; phone: string }
  dispatches: Dispatch[]
}

export type Rider = {
  id: string
  name: string
  phone: string
  shiftEndTime: string
  pickupZone: string
  assignedDispatchId?: string
  emergencyContacts: string[]
}

export type SafetyWeights = {
  aadhaarVerified: number
  licenseVerified: number
  backgroundCleared: number
  gpsActive: number
  panicReady: number
  trainingComplete: number
  ratingAndHistory: number
}

export type SafetyScoreHistory = {
  id: string
  driverId: string
  previousScore: number | null
  score: number
  eligible: boolean
  weights: SafetyWeights
  reason: string
  createdAt: string
}

export type DemandInputs = {
  femaleWorkers: number
  nightShiftRatio: number
  transportNeedRatio: number
  urbanWeight: number
}
