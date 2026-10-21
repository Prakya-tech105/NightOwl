import { PrismaClient } from '@prisma/client'
import { drivers as mockDrivers, vehicles as mockVehicles } from '../../src/data/mockData.ts'
import { calculateSafetyScore, defaultSafetyWeights } from '../../src/lib/safety.ts'

const prisma = new PrismaClient()
const companySlug = 'acme-bellandur-pilot'
const pilotZone = 'Ward 72'
const pilotCorridor = 'Bellandur ORR - Embassy Tech Village'

async function seed() {
  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: { name: 'Acme Systems', pilotCorridor, city: 'Bengaluru' },
    create: { name: 'Acme Systems', slug: companySlug, pilotCorridor, city: 'Bengaluru' },
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
  const driverIds = new Map<string, string>()

  for (const [index, fixture] of corridorDrivers.entries()) {
    const phone = `+919900002${(index + 1).toString().padStart(2, '0')}`
    const user = await prisma.user.upsert({
      where: { phone },
      update: { displayName: fixture.name, role: 'DRIVER', companyId: company.id },
      create: { phone, displayName: fixture.name, role: 'DRIVER', companyId: company.id },
    })
    const score = calculateSafetyScore(fixture, defaultSafetyWeights)
    const driver = await prisma.driver.upsert({
      where: { phone },
      update: {
        userId: user.id,
        companyId: company.id,
        name: fixture.name,
        isWoman: index % 2 === 0,
        status: 'OFFLINE',
        applicationStatus: 'PENDING',
        simulationOnly: true,
        identityCheckStatus: 'simulated',
        policeCheckStatus: 'simulated',
        licenseCheckStatus: 'simulated',
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
        identityCheckStatus: 'simulated',
        policeCheckStatus: 'simulated',
        licenseCheckStatus: 'simulated',
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

    await prisma.vehicle.upsert({
      where: { vehicleNumber: `KA-01-SIM${(index + 1).toString().padStart(2, '0')}` },
      update: {
        companyId: company.id,
        driverId,
        type: fixture.type,
        capacity: fixture.capacity,
        zone: 'Bellandur / ORR',
        available: false,
        etaMinutes: fixture.etaMinutes,
        readiness: 'simulated',
      },
      create: {
        companyId: company.id,
        driverId,
        vehicleNumber: `KA-01-SIM${(index + 1).toString().padStart(2, '0')}`,
        type: fixture.type,
        capacity: fixture.capacity,
        zone: 'Bellandur / ORR',
        available: false,
        etaMinutes: fixture.etaMinutes,
        readiness: 'simulated',
      },
    })
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
    `Seeded simulation-only company "${company.name}" for ${pilotCorridor}: ${demoUsers.length} employees/users, ${corridorDrivers.length} pending drivers, ${corridorVehicles.length} unavailable vehicles.`,
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
