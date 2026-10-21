import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = Fastify({ logger: true })

await app.register(helmet)
await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
})

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
