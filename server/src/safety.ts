export type SafetyWeights = {
  aadhaarVerified: number
  licenseVerified: number
  backgroundCleared: number
  gpsActive: number
  panicReady: number
  trainingComplete: number
  ratingAndHistory: number
}

export const defaultSafetyWeights: SafetyWeights = {
  aadhaarVerified: 15,
  licenseVerified: 15,
  backgroundCleared: 20,
  gpsActive: 10,
  panicReady: 10,
  trainingComplete: 10,
  ratingAndHistory: 20,
}

type SafetyFactors = {
  aadhaarVerified: boolean
  licenseVerified: boolean
  backgroundCleared: boolean
  gpsActive: boolean
  panicReady: boolean
  trainingComplete: boolean
  rating: number
  incidentCount: number
}

export function calculateSafetyScore(driver: SafetyFactors, weights: SafetyWeights): number {
  let score = 0

  if (driver.aadhaarVerified) score += weights.aadhaarVerified
  if (driver.licenseVerified) score += weights.licenseVerified
  if (driver.backgroundCleared) score += weights.backgroundCleared
  if (driver.gpsActive) score += weights.gpsActive
  if (driver.panicReady) score += weights.panicReady
  if (driver.trainingComplete) score += weights.trainingComplete

  const ratingRatio = Math.min(1, driver.rating / 5)
  const historyPenalty = Math.min(0.6, driver.incidentCount * 0.08)
  score += Math.round(Math.max(0, ratingRatio - historyPenalty) * weights.ratingAndHistory)

  return Math.max(0, Math.min(100, score))
}
