import { EventEmitter } from 'node:events'

export type PilotEvent = {
  companyId: string
  type: 'trip.updated' | 'dispatch.updated' | 'driver.location' | 'safety.updated'
  entityId: string
}

const events = new EventEmitter()

export function publishPilotEvent(event: PilotEvent): void {
  events.emit('pilot-event', event)
}

export function subscribeToPilotEvents(listener: (event: PilotEvent) => void): () => void {
  events.on('pilot-event', listener)
  return () => events.off('pilot-event', listener)
}
