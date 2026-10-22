import { PrismaClient } from '@prisma/client'
import { drivers as mockDrivers, vehicles as mockVehicles } from '../../src/data/mockData.ts'
import { calculateSafetyScore, defaultSafetyWeights } from '../../src/lib/safety.ts'

const prisma = new PrismaClient()
const companySlug = 'acme-bellandur-pilot'
const pilotZone = 'Ward 72'
const pilotCorridor = 'Bellandur ORR - Embassy Tech Village'

function isDispatchEligible(driver: {
  applicationStatus: string
  status: string
  safetyScore: number
  vehicle: { available: boolean; readiness: string } | null
}): boolean {
  return driver.applicationStatus === 'APPROVED'
    && driver.status === 'AVAILABLE'
    && driver.safetyScore >= 60
    && driver.vehicle?.available === true
    && driver.vehicle.readiness === 'ready'
}

async function seed() {
  const existingCompany = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { safetyWeights: true },
  })
  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: {
      name: 'Acme Systems',
      pilotCorridor,
      city: 'Bengaluru',
      safetyWeights: defaultSafetyWeights,
    },
    create: {
      name: 'Acme Systems',
      slug: companySlug,
      pilotCorridor,
      city: 'Bengaluru',
      safetyWeights: defaultSafetyWeights,
    },
  })

  const demoUsers = [
    { phone: '+919900000101', name: 'Acme Pilot Admin', role: 'COMPANY_ADMIN' as const },
    { phone: '+919900000102', name: 'Acme Fleet Operator', role: 'FLEET_OPERATOR' as const },
    ...Array.from({ length: 8 }, (_, index) => ({
      phone: `+919900001${(index + 1).toString().padStart(2, '0')}`,
      name: `Pilot Rider ${index + 1}`,
      role: 'RIDER' as const,
    })),
  ]

  const users = new Map<string, string>()
  for (const demoUser of demoUsers) {
    const user = await prisma.user.upsert({
      where: { phone: demoUser.phone },
      update: { displayName: demoUser.name, role: demoUser.role, companyId: company.id },
      create: {
        phone: demoUser.phone,
        displayName: demoUser.name,
        role: demoUser.role,
        companyId: company.id,
      },
    })
    users.set(demoUser.phone, user.id)

    if (demoUser.role === 'RIDER') {
      const suffix = demoUser.phone.slice(-2)
      const employeeCode = `ACME-${suffix}`
      const employee = await prisma.employee.upsert({
        where: { companyId_employeeCode: { companyId: company.id, employeeCode } },
        update: { userId: user.id, department: 'Pilot Operations', shiftEndAt: '23:30' },
        create: {
          companyId: company.id,
          userId: user.id,
          employeeCode,
          department: 'Pilot Operations',
          shiftEndAt: '23:30',
        },
      })

      await prisma.trustedContact.upsert({
        where: { id: `seed-contact-${employee.id}` },
        update: { name: `Trusted Contact ${suffix}`, phone: '+919900009999' },
        create: {
          id: `seed-contact-${employee.id}`,
          employeeId: employee.id,
          name: `Trusted Contact ${suffix}`,
          phone: '+919900009999',
          relationship: 'Family',
        },
      })
    }
  }

  const corridorDrivers = mockDrivers.filter((driver) => driver.zone === pilotZone).slice(0, 6)
  const eligibleDriverCount = Math.min(2, corridorDrivers.length)
  const driverIds = new Map<string, string>()
  const previousDriverStates = new Map<string, { score: number | null; eligible: boolean }>()

  for (const [index, fixture] of corridorDrivers.entries()) {
    const phone = `+919900002${(index + 1).toString().padStart(2, '0')}`
    const existingDriver = await prisma.driver.findUnique({
      where: { phone },
      select: {
        safetyScore: true,
        status: true,
        applicationStatus: true,
        vehicle: { select: { available: true, readiness: true } },
      },
    })
    previousDriverStates.set(fixture.id, {
      score: existingDriver?.safetyScore ?? null,
      eligible: existingDriver ? isDispatchEligible(existingDriver) : false,
    })
    const user = await prisma.user.upsert({
      where: { phone },
      update: { displayName: fixture.name, role: 'DRIVER', companyId: company.id },
      create: { phone, displayName: fixture.name, role: 'DRIVER', companyId: company.id },
    })
    const eligible = index < eligibleDriverCount
    const score = calculateSafetyScore(fixture, defaultSafetyWeights)
    const driver = await prisma.driver.upsert({
      where: { phone },
      update: {
        userId: user.id,
        companyId: company.id,
        name: fixture.name,
        isWoman: index % 2 === 0,
        status: eligible ? 'AVAILABLE' : 'OFFLINE',
        applicationStatus: eligible ? 'APPROVED' : 'PENDING',
        simulationOnly: true,
        gpsActive: fixture.gpsActive,
        panicReady: fixture.panicReady,
        trainingComplete: fixture.trainingComplete,
        identityCheckStatus: fixture.aadhaarVerified ? 'simulated_pass' : 'simulated_fail',
        policeCheckStatus: fixture.backgroundCleared ? 'simulated_pass' : 'simulated_fail',
        licenseCheckStatus: fixture.licenseVerified ? 'simulated_pass' : 'simulated_fail',
        safetyScore: score,
        rating: fixture.rating,
        incidentCount: fixture.incidentCount,
        zone: 'Bellandur / ORR',
      },
      create: {
        userId: user.id,
        companyId: company.id,
        name: fixture.name,
        phone,
        isWoman: index % 2 === 0,
        status: 'OFFLINE',
        applicationStatus: 'PENDING',
        simulationOnly: true,
        gpsActive: fixture.gpsActive,
        panicReady: fixture.panicReady,
        trainingComplete: fixture.trainingComplete,
        identityCheckStatus: fixture.aadhaarVerified ? 'simulated_pass' : 'simulated_fail',
        policeCheckStatus: fixture.backgroundCleared ? 'simulated_pass' : 'simulated_fail',
        licenseCheckStatus: fixture.licenseVerified ? 'simulated_pass' : 'simulated_fail',
        safetyScore: score,
        rating: fixture.rating,
        incidentCount: fixture.incidentCount,
        zone: 'Bellandur / ORR',
      },
    })
    driverIds.set(fixture.id, driver.id)
  }

  const corridorVehicles = mockVehicles
    .filter((vehicle) => vehicle.zone === pilotZone)
    .slice(0, corridorDrivers.length)

  for (const [index, fixture] of corridorVehicles.entries()) {
    const driverId = driverIds.get(fixture.driverId)
    if (!driverId) continue
    const eligible = index < eligibleDriverCount

    await prisma.vehicle.upsert({
      where: { vehicleNumber: `KA-01-SIM${(index + 1).toString().padStart(2, '0')}` },
      update: {
        companyId: company.id,
        driverId,
        type: fixture.type,
        capacity: fixture.capacity,
        zone: 'Bellandur / ORR',
        available: eligible,
        etaMinutes: fixture.etaMinutes,
        readiness: eligible ? 'ready' : 'simulated',
      },
      create: {
        companyId: company.id,
        driverId,
        vehicleNumber: `KA-01-SIM${(index + 1).toString().padStart(2, '0')}`,
        type: fixture.type,
        capacity: fixture.capacity,
        zone: 'Bellandur / ORR',
        available: eligible,
        etaMinutes: fixture.etaMinutes,
        readiness: eligible ? 'ready' : 'simulated',
      },
    })
  }

  const adminUserId = users.get('+919900000101') ?? null
  if (JSON.stringify(existingCompany?.safetyWeights) !== JSON.stringify(defaultSafetyWeights)) {
    await prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'safety_weights_changed',
        entityType: 'company',
        entityId: company.id,
        oldValue: existingCompany?.safetyWeights ?? null,
        newValue: defaultSafetyWeights,
        metadata: { reason: 'pilot_seeded' },
      },
    })
  }

  for (const [fixtureId, driverId] of driverIds) {
    const driver = await prisma.driver.findUniqueOrThrow({
      where: { id: driverId },
      include: { vehicle: { select: { available: true, readiness: true } } },
    })
    const previous = previousDriverStates.get(fixtureId)
    const eligible = isDispatchEligible(driver)
    const hasSafetyHistory = await prisma.safetyScoreHistory.findFirst({
      where: { driverId, companyId: company.id },
      select: { id: true },
    })
    const scoreChanged = previous !== undefined && previous.score !== driver.safetyScore
    if (!hasSafetyHistory || !previous || scoreChanged) {
      await prisma.safetyScoreHistory.create({
        data: {
          companyId: company.id,
          driverId,
          previousScore: previous?.score ?? null,
          score: driver.safetyScore,
          eligible,
          weights: defaultSafetyWeights,
          reason: 'pilot_seeded',
        },
      })
      await prisma.auditLog.create({
        data: {
          actorUserId: adminUserId,
          action: scoreChanged ? 'driver_safety_score_changed' : 'driver_safety_score_initialized',
          entityType: 'driver',
          entityId: driverId,
          oldValue: scoreChanged ? { safetyScore: previous.score } : null,
          newValue: { safetyScore: driver.safetyScore },
          metadata: { reason: 'pilot_seeded' },
        },
      })
    }
    if (previous ? previous.eligible !== eligible : eligible) {
      await prisma.auditLog.create({
        data: {
          actorUserId: adminUserId,
          action: 'driver_eligibility_changed',
          entityType: 'driver',
          entityId: driverId,
          oldValue: { eligible: previous?.eligible ?? false },
          newValue: { eligible },
          metadata: { reason: 'pilot_seeded', simulationOnly: true },
        },
      })
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: users.get('+919900000101') ?? null,
      action: 'pilot_seeded',
      entityType: 'company',
      entityId: company.id,
      metadata: {
        simulationOnly: true,
        pilotCorridor,
        note: 'Seed fixtures are simulated and do not indicate real KYC, police, or license verification.',
      },
    },
  })

  console.info(
    `Seeded simulation-only company "${company.name}" for ${pilotCorridor}: ${demoUsers.length} employees/users, ${eligibleDriverCount} dispatch-ready drivers, ${corridorDrivers.length - eligibleDriverCount} pending drivers.`,
  )
}

seed()
  .catch((error: unknown) => {
    console.error('Pilot seed failed.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
