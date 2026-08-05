export type IndianMeterFareInput = {
  distanceKm: number
  petrolPricePerLitre: number
  baseFare: number
  includedKm: number
  mileageKmPerLitre: number
  driverAndOpsPerKm: number
  safetyFee: number
  nightSurchargePct: number
}

export function calculateIndianMeterFare(input: IndianMeterFareInput): number {
  const safeDistance = Math.max(0, input.distanceKm)
  const billableKm = Math.max(0, safeDistance - input.includedKm)
  const safeMileage = Math.max(1, input.mileageKmPerLitre)
  const safePetrol = Math.max(1, input.petrolPricePerLitre)

  // Indian meter style: base fare includes initial km, then per-km variable charge.
  const fuelCostPerKm = safePetrol / safeMileage
  const variablePerKmRate = fuelCostPerKm + Math.max(0, input.driverAndOpsPerKm)

  const subtotal =
    Math.max(0, input.baseFare) + billableKm * variablePerKmRate + Math.max(0, input.safetyFee)
  const withNightSurcharge = subtotal * (1 + Math.max(0, input.nightSurchargePct))

  return Math.ceil(withNightSurcharge)
}
