import {
  DriverApplicationStatus,
  DriverStatus,
  DispatchStatus,
  Prisma,
  TripStatus,
  UserRole,
  type PrismaClient,
} from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { publishPilotEvent, subscribeToPilotEvents } from './events.js'
import { calculateSafetyScore, defaultSafetyWeights, type SafetyWeights } from './safety.js'

const operationsRoles: UserRole[] = [UserRole.COMPANY_ADMIN, UserRole.FLEET_OPERATOR, UserRole.SUPER_ADMIN]
const driverStatusLabels: Record<DriverStatus, 'offline' | 'available' | 'assigned'> = {
  OFFLINE: 'offline',
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
}
const applicationStatusLabels: Record<DriverApplicationStatus, 'pending' | 'approved' | 'rejected'> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}
const safetyWeightsSchema = z.object({
  aadhaarVerified: z.number().int().min(0).max(100),
  licenseVerified: z.number().int().min(0).max(100),
  backgroundCleared: z.number().int().min(0).max(100),
  gpsActive: z.number().int().min(0).max(100),
  panicReady: z.number().int().min(0).max(100),
  trainingComplete: z.number().int().min(0).max(100),
  ratingAndHistory: z.number().int().min(0).max(100),
}).strict()

const tripRequestSchema = z.object({
  pickupLabel: z.string().trim().min(1).max(250),
  pickupLatitude: z.number().finite().min(-90).max(90).optional(),
  pickupLongitude: z.number().finite().min(-180).max(180).optional(),
  dropoffLabel: z.string().trim().min(1).max(250),
  dropoffLatitude: z.number().finite().min(-90).max(90).optional(),
  dropoffLongitude: z.number().finite().min(-180).max(180).optional(),
  scheduledAt: z.string().datetime().optional(),
}).strict()
const idParamsSchema = z.object({ id: z.string().min(1).max(128) })
const tripParamsSchema = z.object({ tripId: z.string().min(1).max(128) })
const dispatchDecisionSchema = z.object({
  decision: z.enum(['accept', 'reject']),
}).strict()
const emptyBodySchema = z.object({}).strict()
const driverLocationSchema = z.discriminatedUnion('active', [
  z.object({
    active: z.literal(true),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().min(0).max(100_000).optional(),
  }).strict(),
  z.object({ active: z.literal(false) }).strict(),
])
const tripTransitionSchema = z.object({
  status: z.nativeEnum(TripStatus),
}).strict()
const dispatchInclude = {
  trip: {
    select: {
      id: true,
      riderUserId: true,
      pickupLabel: true,
      dropoffLabel: true,
      status: true,
      rider: { select: { id: true, displayName: true, phone: true } },
    },
  },
  driver: { select: { id: true, name: true, phone: true, safetyScore: true } },
  vehicle: { select: { id: true, vehicleNumber: true, type: true } },
} satisfies Prisma.DispatchInclude

type DatabaseClient = Prisma.TransactionClient | PrismaClient
type DispatchRecord = Prisma.DispatchGetPayload<{ include: typeof dispatchInclude }>
type DriverEligibilityState = {
  applicationStatus: DriverApplicationStatus
  status: DriverStatus
  safetyScore: number
  vehicle: { available: boolean; readiness: string } | null
}
type TripRecord = Prisma.TripGetPayload<{
  include: {
    rider: { select: { id: true; displayName: true; phone: true } }
    dispatches: { include: typeof dispatchInclude }
  }
}>

class DispatchConflictError extends Error {}

const allowedTripTransitions: Record<TripStatus, TripStatus[]> = {
  REQUESTED: [TripStatus.CANCELLED],
  ASSIGNED: [TripStatus.ARRIVING, TripStatus.CANCELLED],
  ARRIVING: [TripStatus.IN_TRIP, TripStatus.CANCELLED],
  IN_TRIP: [TripStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
}

function readSafetyWeights(value: Prisma.JsonValue | null): SafetyWeights {
  if (value === null) return defaultSafetyWeights
  return safetyWeightsSchema.parse(value)
}

async function getCompanySafetyWeights(database: DatabaseClient, companyId: string): Promise<SafetyWeights> {
  const company = await database.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { safetyWeights: true },
  })
  return readSafetyWeights(company.safetyWeights)
}

function safetyWeightsEqual(left: SafetyWeights, right: SafetyWeights): boolean {
  return left.aadhaarVerified === right.aadhaarVerified
    && left.licenseVerified === right.licenseVerified
    && left.backgroundCleared === right.backgroundCleared
    && left.gpsActive === right.gpsActive
    && left.panicReady === right.panicReady
    && left.trainingComplete === right.trainingComplete
    && left.ratingAndHistory === right.ratingAndHistory
}

function getTripScope(user: { role: UserRole; sub: string; companyId: string }) {
  return user.role === UserRole.RIDER
    ? { companyId: user.companyId, riderUserId: user.sub }
    : { companyId: user.companyId }
}

function isDriverEligible(driver: DriverEligibilityState): boolean {
  return driver.applicationStatus === DriverApplicationStatus.APPROVED
    && driver.status === DriverStatus.AVAILABLE
    && driver.safetyScore >= 60
    && driver.vehicle?.available === true
    && driver.vehicle.readiness === 'ready'
}

async function findDriverEligibilityState(
  database: DatabaseClient,
  driverId: string,
): Promise<DriverEligibilityState | null> {
  return database.driver.findUnique({
    where: { id: driverId },
    select: {
      applicationStatus: true,
      status: true,
      safetyScore: true,
      vehicle: { select: { available: true, readiness: true } },
    },
  })
}

async function recordEligibilityChange(
  transaction: Prisma.TransactionClient,
  companyId: string,
  actorUserId: string,
  driverId: string,
  previousEligible: boolean,
  eligible: boolean,
  reason: string,
): Promise<boolean> {
  if (previousEligible === eligible) return false
  await transaction.auditLog.create({
    data: {
      actorUserId,
      action: 'driver_eligibility_changed',
      entityType: 'driver',
      entityId: driverId,
      oldValue: { eligible: previousEligible },
      newValue: { eligible },
      metadata: { companyId, reason },
    },
  })
  return true
}

async function recalculateDriverSafetyScore(
  transaction: Prisma.TransactionClient,
  companyId: string,
  driverId: string,
  actorUserId: string,
  weights: SafetyWeights,
  reason: string,
  previousEligibility?: boolean,
): Promise<{ scoreChanged: boolean; eligibilityChanged: boolean }> {
  const driver = await transaction.driver.findFirst({
    where: { id: driverId, companyId },
    include: { vehicle: { select: { available: true, readiness: true } } },
  })
  if (!driver) return { scoreChanged: false, eligibilityChanged: false }

  const score = calculateSafetyScore(
    {
      aadhaarVerified: ['verified', 'simulated_pass'].includes(driver.identityCheckStatus),
      licenseVerified: ['verified', 'simulated_pass'].includes(driver.licenseCheckStatus),
      backgroundCleared: ['verified', 'simulated_pass'].includes(driver.policeCheckStatus),
      gpsActive: driver.gpsActive,
      panicReady: driver.panicReady,
      trainingComplete: driver.trainingComplete,
      rating: driver.rating,
      incidentCount: driver.incidentCount,
    },
    weights,
  )
  const eligibilityBefore = previousEligibility ?? isDriverEligible(driver)
  const eligible = isDriverEligible({ ...driver, safetyScore: score })
  const scoreChanged = score !== driver.safetyScore
  if (scoreChanged) {
    await transaction.driver.update({
      where: { id: driver.id },
      data: { safetyScore: score },
    })
    await transaction.safetyScoreHistory.create({
      data: {
        companyId,
        driverId,
        previousScore: driver.safetyScore,
        score,
        eligible,
        weights,
        reason,
      },
    })
    await transaction.auditLog.create({
      data: {
        actorUserId,
        action: 'driver_safety_score_changed',
        entityType: 'driver',
        entityId: driverId,
        oldValue: { safetyScore: driver.safetyScore },
        newValue: { safetyScore: score },
        metadata: { reason },
      },
    })
  }
  const eligibilityChanged = await recordEligibilityChange(
    transaction,
    companyId,
    actorUserId,
    driverId,
    eligibilityBefore,
    eligible,
    reason,
  )
  return { scoreChanged, eligibilityChanged }
}

async function getEligibleVehicles(
  database: DatabaseClient,
  companyId: string,
  excludedDriverIds: string[],
) {
  return database.vehicle.findMany({
    where: {
      companyId,
      available: true,
      readiness: 'ready',
      driver: {
        is: {
          companyId,
          id: { notIn: excludedDriverIds },
          status: DriverStatus.AVAILABLE,
          applicationStatus: DriverApplicationStatus.APPROVED,
          safetyScore: { gte: 60 },
        },
      },
    },
    include: { driver: true },
    orderBy: [{ etaMinutes: 'asc' }, { id: 'asc' }],
  })
}

async function assignNextEligibleVehicle(
  transaction: Prisma.TransactionClient,
  companyId: string,
  tripId: string,
  excludedDriverIds: string[],
  actorUserId: string,
) {
  const candidates = await getEligibleVehicles(transaction, companyId, excludedDriverIds)

  for (const candidate of candidates) {
    const claimedVehicle = await transaction.vehicle.updateMany({
      where: { id: candidate.id, companyId, available: true, readiness: 'ready' },
      data: { available: false },
    })
    if (claimedVehicle.count !== 1) continue

    const claimedDriver = await transaction.driver.updateMany({
      where: {
        id: candidate.driverId,
        companyId,
        status: DriverStatus.AVAILABLE,
        applicationStatus: DriverApplicationStatus.APPROVED,
        safetyScore: { gte: 60 },
      },
      data: { status: DriverStatus.ASSIGNED },
    })
    if (claimedDriver.count !== 1) {
      await transaction.vehicle.updateMany({
        where: { id: candidate.id, available: false },
        data: { available: true },
      })
      continue
    }

    await recordEligibilityChange(
      transaction,
      companyId,
      actorUserId,
      candidate.driverId,
      true,
      false,
      'dispatch_offer_created',
    )

    const previousDispatch = await transaction.dispatch.findFirst({
      where: { tripId },
      orderBy: { attempt: 'desc' },
      select: { attempt: true },
    })
    return transaction.dispatch.create({
      data: {
        tripId,
        driverId: candidate.driverId,
        vehicleId: candidate.id,
        status: DispatchStatus.OFFERED,
        etaMinutes: candidate.etaMinutes,
        safetyScore: candidate.driver.safetyScore,
        attempt: (previousDispatch?.attempt ?? 0) + 1,
      },
      include: dispatchInclude,
    })
  }

  return null
}

export async function registerOperationsRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/events', { preHandler: app.authenticate }, (request, reply) => {
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    reply.raw.write('event: ready\ndata: {"type":"ready"}\n\n')

    const unsubscribe = subscribeToPilotEvents((event) => {
      if (event.companyId === request.user.companyId) {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    })
    const heartbeat = setInterval(() => reply.raw.write(': keep-alive\n\n'), 25_000)
    const cleanup = () => {
      clearInterval(heartbeat)
      unsubscribe()
    }
    reply.raw.once('close', cleanup)
  })

  app.get(
    '/drivers',
    { preHandler: app.requireRole(operationsRoles) },
    async (request) => {
      const drivers = await prisma.driver.findMany({
        where: { companyId: request.user.companyId },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      })
      return drivers.map((driver) => ({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        aadhaarVerified: ['verified', 'simulated_pass'].includes(driver.identityCheckStatus),
        licenseVerified: ['verified', 'simulated_pass'].includes(driver.licenseCheckStatus),
        backgroundCleared: ['verified', 'simulated_pass'].includes(driver.policeCheckStatus),
        gpsActive: driver.gpsActive,
        panicReady: driver.panicReady,
        trainingComplete: driver.trainingComplete,
        rating: driver.rating,
        incidentCount: driver.incidentCount,
        safetyScore: driver.safetyScore,
        status: driverStatusLabels[driver.status],
        zone: driver.zone,
        simulationOnly: driver.simulationOnly,
        applicationStatus: applicationStatusLabels[driver.applicationStatus],
      }))
    },
  )

  app.get(
    '/vehicles',
    { preHandler: app.requireRole(operationsRoles) },
    async (request) => {
      const vehicles = await prisma.vehicle.findMany({
        where: { companyId: request.user.companyId },
        orderBy: [{ zone: 'asc' }, { etaMinutes: 'asc' }],
      })
      return vehicles.map((vehicle) => ({
        ...vehicle,
        type: vehicle.type as 'auto' | 'cab' | 'van',
        readiness: vehicle.readiness === 'ready' ? 'ready' : 'not_ready',
      }))
    },
  )

  app.get('/trips', { preHandler: app.authenticate }, async (request) =>
    prisma.trip.findMany({
      where: {
        ...getTripScope(request.user),
        ...(request.user.role === UserRole.DRIVER
          ? { dispatches: { some: { driver: { userId: request.user.sub } } } }
          : {}),
      },
      include: {
        rider: { select: { id: true, displayName: true, phone: true } },
        dispatches: {
          ...(request.user.role === UserRole.DRIVER
            ? { where: { driver: { userId: request.user.sub } } }
            : {}),
          orderBy: { attempt: 'desc' },
          include: {
            driver: { select: { id: true, name: true, phone: true, safetyScore: true } },
            vehicle: { select: { id: true, vehicleNumber: true, type: true } },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    }),
  )

  app.get('/dispatches', { preHandler: app.authenticate }, async (request) =>
    prisma.dispatch.findMany({
      where: {
        trip: getTripScope(request.user),
        ...(request.user.role === UserRole.DRIVER ? { driver: { userId: request.user.sub } } : {}),
      },
      include: {
        trip: {
          select: {
            id: true,
            riderUserId: true,
            pickupLabel: true,
            dropoffLabel: true,
            status: true,
          },
        },
        driver: { select: { id: true, name: true, phone: true, safetyScore: true } },
        vehicle: { select: { id: true, vehicleNumber: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  )

  app.get(
    '/trips/:tripId/eligible-vehicles',
    { preHandler: app.requireRole(operationsRoles) },
    async (request, reply) => {
      const params = tripParamsSchema.safeParse(request.params)
      if (!params.success) {
        return reply.code(400).send({ error: 'Invalid trip identifier.' })
      }
      const trip = await prisma.trip.findFirst({
        where: { id: params.data.tripId, companyId: request.user.companyId },
        select: { id: true },
      })
      if (!trip) {
        return reply.code(404).send({ error: 'Trip not found.' })
      }
      const previousDispatches = await prisma.dispatch.findMany({
        where: { tripId: trip.id },
        select: { driverId: true },
      })
      const vehicles = await getEligibleVehicles(
        prisma,
        request.user.companyId,
        previousDispatches.map((dispatch) => dispatch.driverId),
      )
      return vehicles.map((vehicle) => ({
        id: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        type: vehicle.type,
        etaMinutes: vehicle.etaMinutes,
        driver: {
          id: vehicle.driver.id,
          name: vehicle.driver.name,
          safetyScore: vehicle.driver.safetyScore,
        },
      }))
    },
  )

  app.post(
    '/trips/:tripId/dispatch',
    { preHandler: app.requireRole(operationsRoles) },
    async (request, reply) => {
      const params = tripParamsSchema.safeParse(request.params)
      const body = emptyBodySchema.safeParse(request.body)
      if (!params.success || !body.success) {
        return reply.code(400).send({ error: 'Provide a valid trip identifier and empty request body.' })
      }
      const trip = await prisma.trip.findFirst({
        where: { id: params.data.tripId, companyId: request.user.companyId },
        select: { id: true, status: true },
      })
      if (!trip) {
        return reply.code(404).send({ error: 'Trip not found.' })
      }
      if (trip.status !== TripStatus.REQUESTED) {
        return reply.code(409).send({ error: 'Only requested trips can be dispatched.' })
      }

      const dispatch = await prisma.$transaction(async (transaction) => {
        const currentTrip = await transaction.trip.findFirst({
          where: { id: trip.id, companyId: request.user.companyId, status: TripStatus.REQUESTED },
          select: { id: true },
        })
        if (!currentTrip) return null

        const activeDispatch = await transaction.dispatch.findFirst({
          where: {
            tripId: trip.id,
            status: { in: [DispatchStatus.OFFERED, DispatchStatus.ACCEPTED, DispatchStatus.ASSIGNED] },
          },
          select: { id: true },
        })
        if (activeDispatch) return null

        const previousDispatches = await transaction.dispatch.findMany({
          where: { tripId: trip.id },
          select: { driverId: true },
        })
        return assignNextEligibleVehicle(
          transaction,
          request.user.companyId,
          trip.id,
          previousDispatches.map((item) => item.driverId),
          request.user.sub,
        )
      }, { isolationLevel: 'Serializable' })

      if (!dispatch) {
        return reply.code(409).send({ error: 'No eligible available vehicle can be assigned to this trip.' })
      }

      publishPilotEvent({
        companyId: request.user.companyId,
        type: 'dispatch.updated',
        entityId: dispatch.id,
      })
      publishPilotEvent({
        companyId: request.user.companyId,
        type: 'safety.updated',
        entityId: dispatch.driverId,
      })
      return reply.code(201).send(dispatch)
    },
  )

  app.post(
    '/dispatches/:id/respond',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params)
      const parsed = dispatchDecisionSchema.safeParse(request.body)
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: 'Provide a valid dispatch identifier and decision.' })
      }
      if (request.user.role !== UserRole.DRIVER) {
        return reply.code(403).send({ error: 'Only the assigned driver can respond to a dispatch.' })
      }

      const driver = await prisma.driver.findUnique({
        where: { userId: request.user.sub },
        select: { id: true },
      })
      if (!driver) {
        return reply.code(403).send({ error: 'Driver profile not found.' })
      }
      const offer = await prisma.dispatch.findFirst({
        where: {
          id: params.data.id,
          driverId: driver.id,
          trip: { companyId: request.user.companyId },
        },
        select: { id: true, tripId: true, vehicleId: true, status: true },
      })
      if (!offer) {
        return reply.code(404).send({ error: 'Dispatch offer not found.' })
      }
      if (offer.status !== DispatchStatus.OFFERED) {
        return reply.code(409).send({ error: 'This dispatch offer is no longer open.' })
      }

      let result: {
        dispatch: DispatchRecord
        reassignedDispatchId: string | null
        reassignedDriverId: string | null
      }
      try {
        result = await prisma.$transaction(async (transaction) => {
          const respondedAt = new Date()
          const changed = await transaction.dispatch.updateMany({
            where: { id: offer.id, driverId: driver.id, status: DispatchStatus.OFFERED },
            data: {
              status: parsed.data.decision === 'accept' ? DispatchStatus.ACCEPTED : DispatchStatus.REJECTED,
              respondedAt,
            },
          })
          if (changed.count !== 1) {
            throw new DispatchConflictError()
          }

          let reassignedDispatchId: string | null = null
          let reassignedDriverId: string | null = null
          if (parsed.data.decision === 'accept') {
            const updatedTrip = await transaction.trip.updateMany({
              where: {
                id: offer.tripId,
                companyId: request.user.companyId,
                status: TripStatus.REQUESTED,
              },
              data: { status: TripStatus.ASSIGNED, assignedAt: respondedAt },
            })
            if (updatedTrip.count !== 1) {
              throw new DispatchConflictError()
            }
          } else {
            const releasedDriver = await transaction.driver.updateMany({
              where: { id: driver.id, status: DriverStatus.ASSIGNED },
              data: { status: DriverStatus.AVAILABLE },
            })
            const releasedVehicle = await transaction.vehicle.updateMany({
              where: { id: offer.vehicleId, available: false },
              data: { available: true },
            })
            if (releasedDriver.count !== 1 || releasedVehicle.count !== 1) {
              throw new DispatchConflictError()
            }
            const releasedDriverState = await findDriverEligibilityState(transaction, driver.id)
            if (releasedDriverState) {
              await recordEligibilityChange(
                transaction,
                request.user.companyId,
                request.user.sub,
                driver.id,
                false,
                isDriverEligible(releasedDriverState),
                'dispatch_offer_rejected',
              )
            }
            const previousDispatches = await transaction.dispatch.findMany({
              where: { tripId: offer.tripId },
              select: { driverId: true },
            })
            const reassigned = await assignNextEligibleVehicle(
              transaction,
              request.user.companyId,
              offer.tripId,
              previousDispatches.map((item) => item.driverId),
              request.user.sub,
            )
            reassignedDispatchId = reassigned?.id ?? null
            reassignedDriverId = reassigned?.driverId ?? null
          }

          const dispatch = await transaction.dispatch.findUniqueOrThrow({
            where: { id: offer.id },
            include: dispatchInclude,
          })
          return { dispatch, reassignedDispatchId, reassignedDriverId }
        }, { isolationLevel: 'Serializable' })
      } catch (error) {
        if (error instanceof DispatchConflictError) {
          return reply.code(409).send({ error: 'The trip or dispatch changed; refresh and try again.' })
        }
        throw error
      }

      publishPilotEvent({
        companyId: request.user.companyId,
        type: 'dispatch.updated',
        entityId: offer.id,
      })
      publishPilotEvent({
        companyId: request.user.companyId,
        type: 'trip.updated',
        entityId: offer.tripId,
      })
      if (result.reassignedDispatchId) {
        publishPilotEvent({
          companyId: request.user.companyId,
          type: 'dispatch.updated',
          entityId: result.reassignedDispatchId,
        })
      }
      if (parsed.data.decision === 'reject') {
        publishPilotEvent({
          companyId: request.user.companyId,
          type: 'safety.updated',
          entityId: driver.id,
        })
        if (result.reassignedDriverId) {
          publishPilotEvent({
            companyId: request.user.companyId,
            type: 'safety.updated',
            entityId: result.reassignedDriverId,
          })
        }
      }
      return reply.send(result)
    },
  )

  app.put(
    '/driver/location',
    { preHandler: app.authenticate },
    async (request, reply) => {
      if (request.user.role !== UserRole.DRIVER) {
        return reply.code(403).send({ error: 'Only drivers can report their location.' })
      }
      const parsed = driverLocationSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Provide a valid location or stop-sharing request.' })
      }
      const driver = await prisma.driver.findUnique({
        where: { userId: request.user.sub },
        select: { id: true },
      })
      if (!driver) {
        return reply.code(403).send({ error: 'Driver profile not found.' })
      }
      if (parsed.data.active) {
        const activeTrip = await prisma.trip.findFirst({
          where: {
            companyId: request.user.companyId,
            status: { in: [TripStatus.ASSIGNED, TripStatus.ARRIVING, TripStatus.IN_TRIP] },
            dispatches: {
              some: {
                driverId: driver.id,
                status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.ASSIGNED] },
              },
            },
          },
          select: { id: true },
        })
        if (!activeTrip) {
          return reply.code(409).send({ error: 'Location reporting is only available during an active assigned trip.' })
        }
      }

      const result = await prisma.$transaction(async (transaction) => {
        const currentDriver = await transaction.driver.findFirst({
          where: { id: driver.id, companyId: request.user.companyId },
          include: { vehicle: { select: { available: true, readiness: true } } },
        })
        if (!currentDriver) return null

        const eligibilityBefore = isDriverEligible(currentDriver)
        const updatedDriver = await transaction.driver.update({
          where: { id: driver.id },
          data: parsed.data.active
            ? {
                latitude: parsed.data.latitude,
                longitude: parsed.data.longitude,
                gpsActive: true,
                gpsUpdatedAt: new Date(),
              }
            : {
                latitude: null,
                longitude: null,
                gpsActive: false,
                gpsUpdatedAt: null,
              },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            gpsActive: true,
            gpsUpdatedAt: true,
            safetyScore: true,
          },
        })
        const weights = await getCompanySafetyWeights(transaction, request.user.companyId)
        const changes = await recalculateDriverSafetyScore(
          transaction,
          request.user.companyId,
          driver.id,
          request.user.sub,
          weights,
          parsed.data.active ? 'driver_location_reporting' : 'driver_location_sharing_stopped',
          eligibilityBefore,
        )
        const recalculatedDriver = await transaction.driver.findUniqueOrThrow({
          where: { id: driver.id },
          select: { safetyScore: true },
        })
        return {
          driver: { ...updatedDriver, safetyScore: recalculatedDriver.safetyScore },
          changes,
        }
      }, { isolationLevel: 'Serializable' })

      if (!result) {
        return reply.code(404).send({ error: 'Driver profile not found.' })
      }
      publishPilotEvent({
        companyId: request.user.companyId,
        type: 'driver.location',
        entityId: driver.id,
      })
      if (result.changes.scoreChanged || result.changes.eligibilityChanged) {
        publishPilotEvent({
          companyId: request.user.companyId,
          type: 'safety.updated',
          entityId: driver.id,
        })
      }
      return reply.send({
        ...result.driver,
        accuracyMeters: parsed.data.active ? parsed.data.accuracyMeters ?? null : null,
      })
    },
  )

  app.patch(
    '/trips/:tripId/status',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const params = tripParamsSchema.safeParse(request.params)
      const parsed = tripTransitionSchema.safeParse(request.body)
      if (!params.success || !parsed.success) {
        return reply.code(400).send({ error: 'Provide a valid trip identifier and status.' })
      }

      const targetStatus = parsed.data.status
      if (request.user.role === UserRole.RIDER && targetStatus !== TripStatus.CANCELLED) {
        return reply.code(403).send({ error: 'Riders can only cancel their own trip.' })
      }
      if (
        request.user.role === UserRole.DRIVER
        && targetStatus !== TripStatus.ARRIVING
        && targetStatus !== TripStatus.IN_TRIP
        && targetStatus !== TripStatus.COMPLETED
      ) {
        return reply.code(403).send({ error: 'Drivers can only update their assigned trip progress.' })
      }
      if (!operationsRoles.includes(request.user.role)
        && request.user.role !== UserRole.RIDER
        && request.user.role !== UserRole.DRIVER) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      let driverId: string | undefined
      if (request.user.role === UserRole.DRIVER) {
        const driver = await prisma.driver.findUnique({
          where: { userId: request.user.sub },
          select: { id: true },
        })
        if (!driver) return reply.code(403).send({ error: 'Driver profile not found.' })
        driverId = driver.id
      }
      const trip = await prisma.trip.findFirst({
        where: {
          id: params.data.tripId,
          companyId: request.user.companyId,
          ...(request.user.role === UserRole.RIDER ? { riderUserId: request.user.sub } : {}),
          ...(driverId
            ? {
                dispatches: {
                  some: {
                    driverId,
                    status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.ASSIGNED] },
                  },
                },
              }
            : {}),
        },
        select: { id: true, status: true },
      })
      if (!trip) return reply.code(404).send({ error: 'Trip not found.' })
      if (!allowedTripTransitions[trip.status].includes(targetStatus)) {
        return reply.code(409).send({ error: `Trip cannot transition from ${trip.status} to ${targetStatus}.` })
      }
      if (request.user.role === UserRole.COMPANY_ADMIN
        || request.user.role === UserRole.SUPER_ADMIN
        || request.user.role === UserRole.FLEET_OPERATOR) {
        if (targetStatus !== TripStatus.CANCELLED) {
          return reply.code(403).send({ error: 'Operations users can only cancel a trip.' })
        }
      }

      const now = new Date()
      let changedDispatchIds: string[] = []
      let changedDriverIds: string[] = []
      let updatedTrip: TripRecord
      try {
        updatedTrip = await prisma.$transaction(async (transaction) => {
          const changed = await transaction.trip.updateMany({
            where: {
              id: trip.id,
              companyId: request.user.companyId,
              status: trip.status,
            },
            data: {
              status: targetStatus,
              ...(targetStatus === TripStatus.IN_TRIP ? { startedAt: now } : {}),
              ...(targetStatus === TripStatus.COMPLETED ? { completedAt: now } : {}),
              ...(targetStatus === TripStatus.CANCELLED ? { cancelledAt: now } : {}),
            },
          })
          if (changed.count !== 1) throw new DispatchConflictError()

          if (targetStatus === TripStatus.CANCELLED) {
            const activeDispatches = await transaction.dispatch.findMany({
              where: {
                tripId: trip.id,
                status: { in: [DispatchStatus.OFFERED, DispatchStatus.ACCEPTED, DispatchStatus.ASSIGNED] },
              },
              select: { id: true, driverId: true, vehicleId: true },
            })
            changedDispatchIds = activeDispatches.map((dispatch) => dispatch.id)
            changedDriverIds = [...new Set(activeDispatches.map((dispatch) => dispatch.driverId))]
            await transaction.dispatch.updateMany({
              where: { id: { in: changedDispatchIds } },
              data: { status: DispatchStatus.CANCELLED, respondedAt: now },
            })
            await transaction.driver.updateMany({
              where: { id: { in: changedDriverIds }, status: DriverStatus.ASSIGNED },
              data: {
                status: DriverStatus.AVAILABLE,
                gpsActive: false,
                latitude: null,
                longitude: null,
                gpsUpdatedAt: null,
              },
            })
            await transaction.vehicle.updateMany({
              where: { id: { in: activeDispatches.map((dispatch) => dispatch.vehicleId) } },
              data: { available: true },
            })
            const weights = await getCompanySafetyWeights(transaction, request.user.companyId)
            for (const changedDriverId of changedDriverIds) {
              await recalculateDriverSafetyScore(
                transaction,
                request.user.companyId,
                changedDriverId,
                request.user.sub,
                weights,
                'trip_cancelled',
                false,
              )
            }
          } else if (targetStatus === TripStatus.COMPLETED && driverId) {
            const activeDispatch = await transaction.dispatch.findFirst({
              where: {
                tripId: trip.id,
                driverId,
                status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.ASSIGNED] },
              },
              select: { vehicleId: true },
            })
            if (activeDispatch) {
              await transaction.driver.update({
                where: { id: driverId },
                data: {
                  status: DriverStatus.AVAILABLE,
                  gpsActive: false,
                  latitude: null,
                  longitude: null,
                  gpsUpdatedAt: null,
                },
              })
              await transaction.vehicle.update({
                where: { id: activeDispatch.vehicleId },
                data: { available: true },
              })
              changedDriverIds = [driverId]
              const weights = await getCompanySafetyWeights(transaction, request.user.companyId)
              await recalculateDriverSafetyScore(
                transaction,
                request.user.companyId,
                driverId,
                request.user.sub,
                weights,
                'trip_completed',
                false,
              )
            }
          }

          return transaction.trip.findUniqueOrThrow({
            where: { id: trip.id },
            include: {
              rider: { select: { id: true, displayName: true, phone: true } },
              dispatches: { include: dispatchInclude, orderBy: { attempt: 'asc' } },
            },
          })
        }, { isolationLevel: 'Serializable' })
      } catch (error) {
        if (error instanceof DispatchConflictError) {
          return reply.code(409).send({ error: 'The trip changed; refresh and try again.' })
        }
        throw error
      }

      publishPilotEvent({
        companyId: request.user.companyId,
        type: 'trip.updated',
        entityId: trip.id,
      })
      for (const dispatchId of changedDispatchIds) {
        publishPilotEvent({
          companyId: request.user.companyId,
          type: 'dispatch.updated',
          entityId: dispatchId,
        })
      }
      for (const changedDriverId of changedDriverIds) {
        publishPilotEvent({
          companyId: request.user.companyId,
          type: 'safety.updated',
          entityId: changedDriverId,
        })
      }
      return reply.send(updatedTrip)
    },
  )

  app.get(
    '/riders',
    { preHandler: app.authenticate },
    async (request, reply) => {
      if (request.user.role !== UserRole.RIDER && !operationsRoles.includes(request.user.role)) {
        return reply.code(403).send({ error: 'Forbidden' })
      }
      const users = await prisma.user.findMany({
        where: {
          companyId: request.user.companyId,
          ...(request.user.role === UserRole.RIDER
            ? { id: request.user.sub }
            : { role: UserRole.RIDER, employee: { active: true } }),
        },
        include: {
          company: { select: { pilotCorridor: true } },
          employee: { include: { trustedContacts: true } },
          trips: {
            orderBy: { requestedAt: 'desc' },
            take: 1,
            include: { dispatches: { orderBy: { attempt: 'desc' }, take: 1 } },
          },
        },
        orderBy: { displayName: 'asc' },
      })

      return users.map((user) => ({
        id: user.id,
        name: user.displayName,
        phone: user.phone,
        shiftEndTime: user.employee?.shiftEndAt ?? 'Not set',
        pickupZone: user.company.pilotCorridor,
        assignedDispatchId: user.trips[0]?.dispatches[0]?.id,
        emergencyContacts: user.employee?.trustedContacts.map((contact) => contact.phone) ?? [],
      }))
    },
  )

  app.post('/trips', { preHandler: app.authenticate }, async (request, reply) => {
    if (request.user.role !== UserRole.RIDER) {
      return reply.code(403).send({ error: 'Only enrolled riders can request a trip.' })
    }

    const parsed = tripRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Enter valid pickup and destination details.' })
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: request.user.sub },
      select: { id: true, active: true },
    })
    if (!employee?.active) {
      return reply.code(403).send({ error: 'An active pilot employee record is required to request a trip.' })
    }

    const trip = await prisma.trip.create({
      data: {
        companyId: request.user.companyId,
        riderUserId: request.user.sub,
        employeeId: employee.id,
        pickupLabel: parsed.data.pickupLabel,
        pickupLatitude: parsed.data.pickupLatitude ?? null,
        pickupLongitude: parsed.data.pickupLongitude ?? null,
        dropoffLabel: parsed.data.dropoffLabel,
        dropoffLatitude: parsed.data.dropoffLatitude ?? null,
        dropoffLongitude: parsed.data.dropoffLongitude ?? null,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      },
      include: {
        rider: { select: { id: true, displayName: true, phone: true } },
        dispatches: true,
      },
    })

    publishPilotEvent({
      companyId: request.user.companyId,
      type: 'trip.updated',
      entityId: trip.id,
    })
    return reply.code(201).send(trip)
  })

  app.get(
    '/drivers/:id/safety-history',
    { preHandler: app.requireRole(operationsRoles) },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params)
      if (!params.success) {
        return reply.code(400).send({ error: 'Invalid driver identifier.' })
      }
      const driver = await prisma.driver.findFirst({
        where: { id: params.data.id, companyId: request.user.companyId },
        select: { id: true },
      })
      if (!driver) {
        return reply.code(404).send({ error: 'Driver not found.' })
      }
      return prisma.safetyScoreHistory.findMany({
        where: { companyId: request.user.companyId, driverId: driver.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    },
  )

  app.get(
    '/safety/weights',
    { preHandler: app.requireRole(operationsRoles) },
    async (request) => {
      const company = await prisma.company.findUniqueOrThrow({
        where: { id: request.user.companyId },
        select: { safetyWeights: true },
      })
      return readSafetyWeights(company.safetyWeights)
    },
  )

  app.put(
    '/safety/weights',
    { preHandler: app.requireRole([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]) },
    async (request, reply) => {
      const parsed = safetyWeightsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Safety weights must be integers between 0 and 100.' })
      }

      const changed = await prisma.$transaction(async (transaction) => {
        const company = await transaction.company.findUniqueOrThrow({
          where: { id: request.user.companyId },
          select: { safetyWeights: true },
        })
        const currentWeights = readSafetyWeights(company.safetyWeights)
        const changedWeights = !safetyWeightsEqual(currentWeights, parsed.data)
        if (changedWeights) {
          await transaction.company.update({
            where: { id: request.user.companyId },
            data: { safetyWeights: parsed.data },
          })
          await transaction.auditLog.create({
            data: {
              actorUserId: request.user.sub,
              action: 'safety_weights_changed',
              entityType: 'company',
              entityId: request.user.companyId,
              oldValue: company.safetyWeights ?? Prisma.JsonNull,
              newValue: parsed.data,
            },
          })
        }

        const drivers = await transaction.driver.findMany({
          where: { companyId: request.user.companyId },
          select: { id: true },
        })
        let driverStateChanged = false
        for (const driver of drivers) {
          const changes = await recalculateDriverSafetyScore(
            transaction,
            request.user.companyId,
            driver.id,
            request.user.sub,
            parsed.data,
            'safety_weights_updated',
          )
          driverStateChanged ||= changes.scoreChanged || changes.eligibilityChanged
        }
        return changedWeights || driverStateChanged
      })

      if (changed) {
        publishPilotEvent({
          companyId: request.user.companyId,
          type: 'safety.updated',
          entityId: request.user.companyId,
        })
      }
      return parsed.data
    },
  )
}
