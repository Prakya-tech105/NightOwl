export type TripMode = 'now' | 'later'

export type RiderFlowStep = 'booking' | 'options' | 'confirm' | 'arriving' | 'in_trip'

export type RouteSummary = {
  durationMinutes: number
  distanceKm: number
  corridorHint: string
}

export type RideOption = {
  id: string
  name: string
  etaMinutes: number
  fare: number
  capacity: number
  safetyScore: number
  verifiedOnly: boolean
  recommendedTag?: 'Safest' | 'Best Value'
}

export type DriverSnapshot = {
  id: string
  name: string
  vehicleNumber: string
  vehicleType: string
  etaMinutes: number
  safetyConfidence: number
  backgroundChecked: boolean
}
