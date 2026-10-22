import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { streamPilotEvents } from '../lib/api'

export function usePilotEvents(userId: string | undefined, enabled: boolean): string | null {
  const queryClient = useQueryClient()
  const [streamState, setStreamState] = useState<{ userId: string; error: string | null } | null>(null)

  useEffect(() => {
    if (!enabled || !userId) return

    const controller = new AbortController()
    let reconnectTimer: number | undefined
    const reconnect = () => {
      reconnectTimer = window.setTimeout(connect, 3_000)
    }
    const connect = () => {
      void streamPilotEvents(
        (event) => {
          const queryFamilies = event.type === 'trip.updated'
            ? ['trips', 'dispatches']
            : event.type === 'dispatch.updated'
              ? ['dispatches', 'trips', 'drivers', 'vehicles']
              : event.type === 'driver.location'
                ? ['drivers']
                : ['drivers', 'safetyWeights', 'safetyHistory']
          for (const family of queryFamilies) {
            void queryClient.invalidateQueries({ queryKey: [family, userId] })
          }
        },
        controller.signal,
        () => setStreamState({ userId, error: null }),
      ).then(() => {
        if (!controller.signal.aborted) {
          setStreamState({ userId, error: 'Live updates disconnected; reconnecting.' })
          reconnect()
        }
      }).catch((streamError: unknown) => {
        if (!controller.signal.aborted) {
          setStreamState({
            userId,
            error: streamError instanceof Error ? `Live updates unavailable: ${streamError.message}` : 'Live updates unavailable.',
          })
          reconnect()
        }
      })
    }

    connect()
    return () => {
      controller.abort()
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
    }
  }, [enabled, queryClient, userId])

  if (!enabled || !userId || streamState?.userId !== userId) return null
  return streamState.error
}
