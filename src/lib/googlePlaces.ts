const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete'
const GOOGLE_GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json'

function getGoogleMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? ''
}

function getGoogleMapsSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function fetchGooglePlaceSuggestions(input: string, sessionToken?: string): Promise<string[]> {
  const apiKey = getGoogleMapsApiKey()
  const trimmed = input.trim()

  if (!apiKey || trimmed.length < 2) {
    return []
  }

  const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'suggestions.placePrediction.text.text,suggestions.queryPrediction.text.text',
    },
    body: JSON.stringify({
      input: trimmed,
      languageCode: 'en',
      includedRegionCodes: ['in'],
      locationBias: {
        circle: {
          center: { latitude: 12.9716, longitude: 77.5946 },
          radius: 50000,
        },
      },
      sessionToken: sessionToken ?? getGoogleMapsSessionToken(),
    }),
  })

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as {
    suggestions?: Array<{
      placePrediction?: { text?: { text?: string } }
      queryPrediction?: { text?: { text?: string } }
    }>
  }

  const labels = (payload.suggestions ?? [])
    .map((item) => item.placePrediction?.text?.text ?? item.queryPrediction?.text?.text ?? '')
    .filter((item) => item.trim().length > 0)

  return Array.from(new Set(labels))
}

export async function reverseGeocodeLatLng(lat: number, lng: number): Promise<string | null> {
  const apiKey = getGoogleMapsApiKey()
  if (!apiKey) return null

  const endpoint = `${GOOGLE_GEOCODE_ENDPOINT}?latlng=${lat},${lng}&key=${apiKey}&region=in`
  const response = await fetch(endpoint)

  if (!response.ok) return null

  const payload = (await response.json()) as {
    results?: Array<{ formatted_address?: string }>
    status?: string
  }

  if (payload.status !== 'OK') return null

  return payload.results?.[0]?.formatted_address?.trim() ?? null
}

export function isGooglePlacesConfigured(): boolean {
  return getGoogleMapsApiKey().length > 0
}
