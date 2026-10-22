import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { UserRole, type PrismaClient } from '@prisma/client'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

export type OtpDeliveryProvider = {
  send(phone: string, code: string): Promise<void>
}

const requestOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
})

const verifyOtpSchema = requestOtpSchema.extend({
  code: z.string().regex(/^\d{6}$/),
})

const pilotCompanySlug = 'acme-bellandur-pilot'
const otpLifetimeMs = 5 * 60 * 1000
const maxOtpAttempts = 5

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      role: UserRole
      companyId: string
    }
    user: {
      sub: string
      role: UserRole
      companyId: string
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (roles: UserRole[]) => (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>
  }
}

function hashOtp(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code).digest('hex')
}

function hashesMatch(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer)
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  otpProvider: OtpDeliveryProvider,
  otpHashSecret: string,
) {
  app.decorate('authenticate', async (request) => {
    await request.jwtVerify()
  })

  app.decorate('requireRole', (roles) => async (request, reply) => {
    await request.jwtVerify()
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Forbidden' })
    }
  })

  app.post('/auth/request-otp', async (request, reply) => {
    const parsed = requestOtpSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Enter a valid phone number.' })
    }

    const user = await prisma.user.findFirst({
      where: {
        phone: parsed.data.phone,
        company: { slug: pilotCompanySlug },
      },
      select: { id: true },
    })

    if (user) {
      const code = randomInt(100_000, 1_000_000).toString()
      const now = new Date()

      await prisma.$transaction([
        prisma.otpChallenge.updateMany({
          where: { userId: user.id, consumedAt: null },
          data: { consumedAt: now },
        }),
        prisma.otpChallenge.create({
          data: {
            userId: user.id,
            codeHash: hashOtp(code, otpHashSecret),
            expiresAt: new Date(now.getTime() + otpLifetimeMs),
          },
        }),
      ])

      await otpProvider.send(parsed.data.phone, code)
    }

    return reply.code(202).send({
      message: 'If this phone is enrolled in the pilot, a one-time code has been sent.',
    })
  })

  app.post('/auth/verify-otp', async (request, reply) => {
    const parsed = verifyOtpSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Enter a valid phone number and six-digit code.' })
    }

    const user = await prisma.user.findFirst({
      where: {
        phone: parsed.data.phone,
        company: { slug: pilotCompanySlug },
      },
      select: { id: true, role: true, companyId: true, displayName: true, phone: true },
    })
    const now = new Date()
    const challenge = user
      ? await prisma.otpChallenge.findFirst({
          where: {
            userId: user.id,
            consumedAt: null,
            expiresAt: { gt: now },
            attempts: { lt: maxOtpAttempts },
          },
          orderBy: { createdAt: 'desc' },
        })
      : null

    if (!user || !challenge) {
      return reply.code(401).send({ error: 'Invalid or expired one-time code.' })
    }

    const candidateHash = hashOtp(parsed.data.code, otpHashSecret)
    if (!hashesMatch(candidateHash, challenge.codeHash)) {
      await prisma.otpChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null, attempts: { lt: maxOtpAttempts } },
        data: { attempts: { increment: 1 } },
      })
      return reply.code(401).send({ error: 'Invalid or expired one-time code.' })
    }

    const consumed = await prisma.otpChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: maxOtpAttempts },
      },
      data: { consumedAt: now },
    })
    if (consumed.count !== 1) {
      return reply.code(401).send({ error: 'Invalid or expired one-time code.' })
    }

    const accessToken = app.jwt.sign({
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
    })

    return reply.send({
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
        companyId: user.companyId,
      },
    })
  })

  app.get('/auth/me', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, phone: true, displayName: true, role: true, companyId: true },
    })
    if (!user || user.companyId !== request.user.companyId || user.role !== request.user.role) {
      return reply.code(401).send({ error: 'Session is no longer valid.' })
    }
    return user
  })

  app.get(
    '/ops/access',
    { preHandler: app.requireRole([UserRole.COMPANY_ADMIN, UserRole.FLEET_OPERATOR]) },
    async (request) => ({
      userId: request.user.sub,
      role: request.user.role,
      companyId: request.user.companyId,
    }),
  )
}
