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
  | 'pending'
  | 'assigned'
  | 'en_route'
  | 'arrived'
  | 'trip_started'
  | 'completed'
  | 'cancelled'

export type Dispatch = {
  id: string
  geographyId: string
  demandRecordId: string
  vehicleId: string
  driverId: string
  etaMinutes: number
  safetyScore: number
  status: DispatchStatus
  createdAt: string
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

export type DemandInputs = {
  femaleWorkers: number
  nightShiftRatio: number
  transportNeedRatio: number
  urbanWeight: number
}
