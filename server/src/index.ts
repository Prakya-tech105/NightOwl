import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { registerAuthRoutes, type OtpDeliveryProvider } from './auth.js'
import { registerOperationsRoutes } from './operations.js'

const prisma = new PrismaClient()
const app = Fastify({ logger: true })
const jwtSecret = process.env.JWT_SECRET
const otpHashSecret = process.env.OTP_HASH_SECRET ?? jwtSecret

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.')
}
if (!otpHashSecret || otpHashSecret.length < 32) {
  throw new Error('OTP_HASH_SECRET must be configured with at least 32 characters.')
}

const otpProvider: OtpDeliveryProvider = {
  async send(phone, code) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('A real OTP delivery provider is required in production.')
    }
    app.log.info({ phone, otp: code }, 'Simulated development OTP; no SMS was sent.')
  },
}

await app.register(helmet)
await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
})
await app.register(jwt, {
  secret: jwtSecret,
  sign: { expiresIn: '12h' },
})
await registerAuthRoutes(app, prisma, otpProvider, otpHashSecret)
await registerOperationsRoutes(app, prisma)

app.get('/health', async () => ({ status: 'ok' }))

app.get('/ready', async (_request, reply) => {
  await prisma.$queryRaw`SELECT 1`
  return reply.send({ status: 'ready' })
})

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '127.0.0.1'

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  await prisma.$disconnect()
  process.exitCode = 1
}

const shutdown = async () => {
  await app.close()
  await prisma.$disconnect()
}

process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())
