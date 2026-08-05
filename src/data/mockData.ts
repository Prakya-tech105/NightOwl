import {
  deriveConfidenceBand,
  estimateNightWorkers,
  estimateRideDemand,
  estimateVehiclesNeeded,
} from '../lib/calculations'
import { calculateSafetyScore, defaultSafetyWeights } from '../lib/safety'
import type { DemandRecord, Driver, Geography, Rider, Vehicle } from '../types/models'

const zones = [
  {
    id: 'geo-bengaluru-ward-72',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    city: 'Bengaluru',
    ward: 'Ward 72',
    pincode: '560043',
    femaleWorkers: 1451,
    nightShiftRatio: 0.35,
    transportNeedRatio: 0.68,
    urbanWeight: 1,
    riskWeight: 78,
  },
  {
    id: 'geo-mysuru-12',
    state: 'Karnataka',
    district: 'Mysuru',
    city: 'Mysuru',
    ward: 'Ward 12',
    pincode: '570010',
    femaleWorkers: 930,
    nightShiftRatio: 0.31,
    transportNeedRatio: 0.62,
    urbanWeight: 0.9,
    riskWeight: 63,
  },
  {
    id: 'geo-mangaluru-18',
    state: 'Karnataka',
    district: 'Dakshina Kannada',
    city: 'Mangaluru',
    ward: 'Ward 18',
    pincode: '575001',
    femaleWorkers: 1010,
    nightShiftRatio: 0.28,
    transportNeedRatio: 0.57,
    urbanWeight: 0.92,
    riskWeight: 56,
  },
  {
    id: 'geo-hubbali-34',
    state: 'Karnataka',
    district: 'Dharwad',
    city: 'Hubballi',
    ward: 'Ward 34',
    pincode: '580020',
    femaleWorkers: 860,
    nightShiftRatio: 0.32,
    transportNeedRatio: 0.59,
    urbanWeight: 0.88,
    riskWeight: 67,
  },
  {
    id: 'geo-shivamogga-7',
    state: 'Karnataka',
    district: 'Shivamogga',
    city: 'Shivamogga',
    ward: 'Ward 7',
    pincode: '577201',
    femaleWorkers: 640,
    nightShiftRatio: 0.24,
    transportNeedRatio: 0.51,
    urbanWeight: 0.8,
    riskWeight: 49,
  },
] as const

export const geographies: Geography[] = zones.map((zone) => ({
  id: zone.id,
  state: zone.state,
  district: zone.district,
  city: zone.city,
  ward: zone.ward,
  pincode: zone.pincode,
}))

export const demandRecords: DemandRecord[] = zones.map((zone, index) => {
  const demand = estimateRideDemand(zone)

  return {
    id: `dem-${index + 1}`,
    geographyId: zone.id,
    femaleWorkers: zone.femaleWorkers,
    nightShiftRatio: zone.nightShiftRatio,
    transportNeedRatio: zone.transportNeedRatio,
    urbanWeight: zone.urbanWeight,
    estimatedNightWorkers: estimateNightWorkers(zone),
    estimatedRideDemand: demand,
    vehiclesNeeded: estimateVehiclesNeeded(demand),
    confidence: deriveConfidenceBand(zone.nightShiftRatio, zone.transportNeedRatio),
    timestamp: new Date().toISOString(),
  }
})

const driverZones = zones.map((zone) => zone.ward)

export const drivers: Driver[] = Array.from({ length: 80 }, (_, i) => {
  const idx = i + 1
  const zone = driverZones[i % driverZones.length]
  const baseDriver = {
    id: `drv-${idx.toString().padStart(3, '0')}`,
    name: `Driver ${idx}`,
    phone: `+91 98${(10000000 + idx * 17).toString().slice(0, 8)}`,
    aadhaarVerified: idx % 9 !== 0,
    licenseVerified: idx % 8 !== 0,
    backgroundCleared: idx % 11 !== 0,
    gpsActive: idx % 6 !== 0,
    panicReady: idx % 7 !== 0,
    trainingComplete: idx % 10 !== 0,
    rating: 3.7 + (idx % 13) * 0.1,
    incidentCount: idx % 12 === 0 ? 2 : idx % 5 === 0 ? 1 : 0,
    status: (idx % 14 === 0 ? 'offline' : idx % 3 === 0 ? 'assigned' : 'available') as
      | 'available'
      | 'assigned'
      | 'offline',
    zone,
  }

  return {
    ...baseDriver,
    rating: Math.min(4.9, Number(baseDriver.rating.toFixed(1))),
    safetyScore: calculateSafetyScore(baseDriver, defaultSafetyWeights),
  }
})

export const vehicles: Vehicle[] = Array.from({ length: 48 }, (_, i) => {
  const idx = i + 1
  const type: Vehicle['type'] = idx % 9 === 0 ? 'van' : idx % 3 === 0 ? 'cab' : 'auto'
  const zone = driverZones[i % driverZones.length]

  return {
    id: `veh-${idx.toString().padStart(3, '0')}`,
    vehicleNumber: `KA-01-${(2000 + idx).toString().padStart(4, '0')}`,
    type,
    capacity: type === 'van' ? 7 : type === 'cab' ? 4 : 3,
    zone,
    driverId: drivers[i % drivers.length].id,
    available: idx % 5 !== 0,
    etaMinutes: 6 + (idx % 18),
    readiness: idx % 8 === 0 ? 'not_ready' : 'ready',
  }
})

export const riders: Rider[] = Array.from({ length: 24 }, (_, i) => {
  const idx = i + 1
  const zone = driverZones[i % driverZones.length]

  return {
    id: `rid-${idx.toString().padStart(3, '0')}`,
    name: `Rider ${idx}`,
    phone: `+91 90${(10000000 + idx * 21).toString().slice(0, 8)}`,
    shiftEndTime: `${(20 + (idx % 4)).toString().padStart(2, '0')}:30`,
    pickupZone: zone,
    emergencyContacts: ['+91 9988776655', '+91 8877665544'],
  }
})

export const zoneRiskWeights: Record<string, number> = zones.reduce<Record<string, number>>(
  (acc, zone) => {
    acc[zone.id] = zone.riskWeight
    return acc
  },
  {},
)
