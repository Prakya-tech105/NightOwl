import type { Driver, SafetyWeights } from '../types/models'

export const defaultSafetyWeights: SafetyWeights = {
  aadhaarVerified: 15,
  licenseVerified: 15,
  backgroundCleared: 20,
  gpsActive: 10,
  panicReady: 10,
  trainingComplete: 10,
  ratingAndHistory: 20,
}

export function calculateSafetyScore(
  driver: Omit<Driver, 'safetyScore'>,
  weights: SafetyWeights,
): number {
  let score = 0

  if (driver.aadhaarVerified) score += weights.aadhaarVerified
  if (driver.licenseVerified) score += weights.licenseVerified
  if (driver.backgroundCleared) score += weights.backgroundCleared
  if (driver.gpsActive) score += weights.gpsActive
  if (driver.panicReady) score += weights.panicReady
  if (driver.trainingComplete) score += weights.trainingComplete

  const ratingRatio = Math.min(1, driver.rating / 5)
  const historyPenalty = Math.min(0.6, driver.incidentCount * 0.08)
  const weightedHistory = Math.max(0, ratingRatio - historyPenalty)
  score += Math.round(weightedHistory * weights.ratingAndHistory)

  return Math.max(0, Math.min(100, score))
}

export function getSafetyBadge(score: number): 'trusted' | 'safe' | 'review' | 'do_not_dispatch' {
  if (score >= 90) return 'trusted'
  if (score >= 75) return 'safe'
  if (score >= 60) return 'review'
  return 'do_not_dispatch'
}

export function canDispatchDriver(score: number): boolean {
  return score >= 60
}
