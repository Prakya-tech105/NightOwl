import type { DemandInputs, DemandRecord } from '../types/models'

export const DEFAULT_CAPACITY_PER_VEHICLE = 14

export function estimateRideDemand(inputs: DemandInputs): number {
  return Math.round(
    inputs.femaleWorkers *
      inputs.nightShiftRatio *
      inputs.transportNeedRatio *
      inputs.urbanWeight,
  )
}

export function estimateNightWorkers(inputs: DemandInputs): number {
  return Math.round(inputs.femaleWorkers * inputs.nightShiftRatio)
}

export function estimateVehiclesNeeded(
  estimatedRideDemand: number,
  capacityPerVehicle = DEFAULT_CAPACITY_PER_VEHICLE,
): number {
  return Math.max(1, Math.ceil(estimatedRideDemand / capacityPerVehicle))
}

export function deriveConfidenceBand(
  nightShiftRatio: number,
  transportNeedRatio: number,
): DemandRecord['confidence'] {
  const volatility = Math.abs(nightShiftRatio - 0.35) + Math.abs(transportNeedRatio - 0.68)
  if (volatility <= 0.12) {
    return 'high'
  }
  if (volatility <= 0.22) {
    return 'medium'
  }
  return 'low'
}

export function calculateCoverageGap(needed: number, available: number): number {
  return Math.max(0, needed - available)
}

export function calculatePriorityScore(params: {
  demand: number
  coverageGap: number
  riskWeight: number
  etaStress: number
}): number {
  const score =
    params.demand * 0.4 +
    params.coverageGap * 0.3 +
    params.riskWeight * 0.2 +
    params.etaStress * 0.1

  return Math.round(score)
}
