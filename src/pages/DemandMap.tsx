import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, MapPin, Radar } from 'lucide-react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { StatusChip } from '../components/shared/StatusChip'
import { calculateCoverageGap } from '../lib/calculations'
import { useNightOwlStore } from '../store/useNightOwlStore'
import { usePilotData } from '../hooks/usePilotData'

const districtCoords: Record<string, [number, number]> = {
  'Bengaluru Urban': [12.9716, 77.5946],
  Mysuru: [12.2958, 76.6394],
  Belagavi: [15.8497, 74.4977],
  Tumakuru: [13.3392, 77.101],
  'Dakshina Kannada': [12.9141, 74.856],
  Kalaburagi: [17.3297, 76.8343],
  Shivamogga: [13.9299, 75.5681],
  Ballari: [15.1394, 76.9214],
  Dharwad: [15.4589, 75.0078],
  Vijayapura: [16.8302, 75.71],
  Bagalkot: [16.1802, 75.6961],
  Hassan: [13.0033, 76.1004],
  Chitradurga: [14.2226, 76.3986],
  Davangere: [14.4644, 75.9218],
  Raichur: [16.206, 77.3566],
  'Uttara Kannada': [14.5203, 74.6815],
  Mandya: [12.5244, 76.8958],
  Haveri: [14.7951, 75.4047],
  Chikkamagaluru: [13.3161, 75.772],
  Udupi: [13.3409, 74.7421],
  Gadag: [15.4167, 75.6167],
  Koppal: [15.35, 76.15],
  Yadgir: [16.77, 77.14],
  Chamarajanagara: [11.9261, 76.9437],
  Ramanagara: [12.72, 77.28],
  Bidar: [17.913, 77.52],
  Kodagu: [12.4244, 75.7382],
  Chikkaballapura: [13.4355, 77.7315],
  Kolar: [13.1367, 78.1298],
  'Bengaluru Rural': [13.0719, 77.3986],
}

export function DemandMapPage() {
  const state = useNightOwlStore()
  const data = usePilotData()
  const recalculateDemandForZone = useNightOwlStore((store) => store.recalculateDemandForZone)
  const [selectedZoneId, setSelectedZoneId] = useState(state.geographies[0]?.id ?? '')
  const [threshold, setThreshold] = useState(120)

  const nearbyDriverRows = useMemo(() => {
    const pickupLocality = state.selectedPickupLocality.toLowerCase()

    const driversInLocality = data.drivers
      .filter((driver) => driver.status === 'available' && driver.zone.toLowerCase().includes(pickupLocality))
      .map((driver) => {
        const linkedVehicle = data.vehicles.find(
          (vehicle) =>
            vehicle.driverId === driver.id && vehicle.available && vehicle.readiness === 'ready' && vehicle.zone === driver.zone,
        )

        return {
          driverId: driver.id,
          name: driver.name,
          zone: driver.zone,
          safetyScore: driver.safetyScore,
          etaMinutes: linkedVehicle?.etaMinutes ?? 12,
          vehicleNumber: linkedVehicle?.vehicleNumber ?? 'Pending',
          available: Boolean(linkedVehicle),
        }
      })
      .filter((row) => row.available)
      .sort((a, b) => a.etaMinutes - b.etaMinutes)

    return driversInLocality.slice(0, 8)
  }, [state.selectedPickupLocality, data.drivers, data.vehicles])

  const localCriticalGaps = useMemo(() => {
    const selectedLocality = state.selectedPickupLocality.toLowerCase()

    return state.demand.reduce((count, record) => {
      const geo = state.geographies.find((item) => item.id === record.geographyId)
      const zoneName = (geo?.ward ?? geo?.district ?? '').toLowerCase()
      if (!zoneName.includes(selectedLocality)) return count

      const available = data.vehicles.filter(
        (vehicle) => vehicle.zone.toLowerCase() === zoneName && vehicle.available && vehicle.readiness === 'ready',
      ).length

      return count + (calculateCoverageGap(record.vehiclesNeeded, available) > 2 ? 1 : 0)
    }, 0)
  }, [state.selectedPickupLocality, state.demand, state.geographies, data.vehicles])

  const rows = useMemo(
    () =>
      state.demand
        .map((record) => {
          const geo = state.geographies.find((item) => item.id === record.geographyId)
          const zoneName = geo?.ward ?? geo?.district ?? 'Unknown'
          const available = data.vehicles.filter(
            (vehicle) => vehicle.zone === zoneName && vehicle.available && vehicle.readiness === 'ready',
          ).length

          return {
            id: record.geographyId,
            zoneName,
            district: geo?.district ?? 'Unknown',
            demand: record.estimatedRideDemand,
            available,
            confidence: record.confidence,
            coverageGap: calculateCoverageGap(record.vehiclesNeeded, available),
            formula: `${record.femaleWorkers} × ${record.nightShiftRatio.toFixed(2)} × ${record.transportNeedRatio.toFixed(2)} × ${record.urbanWeight.toFixed(2)}`,
            vehiclesNeeded: record.vehiclesNeeded,
            femaleWorkers: record.femaleWorkers,
          }
        })
        .filter((row) => row.demand >= threshold)
        .sort((a, b) => b.demand - a.demand),
    [state.demand, state.geographies, data.vehicles, threshold],
  )

  const selected = rows.find((row) => row.id === selectedZoneId) ?? rows[0]
  const govMapContainerRef = useRef<HTMLDivElement | null>(null)

  const mapRows = useMemo(() => {
    return rows.map((zone) => {
      const geo = state.geographies.find((item) => item.id === zone.id)
      const district = geo?.district ?? 'Karnataka'
      const [lat, lon] = districtCoords[district] ?? [14.5, 76.5]

      return {
        ...zone,
        district,
        lat,
        lon,
      }
    })
  }, [rows, state.geographies])

  useEffect(() => {
    if (state.role !== 'government_admin' || data.isLoading || data.error) return
    if (!govMapContainerRef.current) return

    const map = L.map(govMapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true,
    }).setView([13.6, 77.2], 6)

    const southIndiaBounds = L.latLngBounds(
      [8.0, 73.0],
      [19.2, 84.5],
    )

    map.fitBounds(southIndiaBounds)
    map.setMaxBounds(southIndiaBounds.pad(0.2))

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 18,
    }).addTo(map)

    const outline = [
      [8.2, 77.6],
      [8.6, 76.8],
      [9.8, 76.1],
      [11.0, 75.2],
      [12.4, 74.9],
      [13.9, 74.8],
      [15.3, 74.8],
      [16.8, 75.0],
      [17.8, 76.0],
      [18.1, 77.2],
      [17.7, 78.3],
      [16.8, 79.0],
      [15.7, 79.7],
      [14.4, 80.5],
      [13.2, 80.3],
      [12.0, 80.6],
      [10.7, 79.7],
      [9.3, 79.1],
      [8.4, 78.3],
      [8.2, 77.6],
    ] as L.LatLngExpression[]

    L.polygon(outline, {
      color: 'transparent',
      weight: 0,
      fillColor: '#1e293b',
      fillOpacity: 0.05,
    }).addTo(map)

    const maxDemand = Math.max(...mapRows.map((item) => item.demand), 1)
    const minDemand = Math.min(...mapRows.map((item) => item.demand), 0)

    mapRows.forEach((item) => {
      const range = Math.max(1, maxDemand - minDemand)
      const priority = (item.demand - minDemand) / range
      const radius = 8 + priority * 18
      const color = priority >= 0.7 ? '#ef4444' : priority >= 0.4 ? '#facc15' : '#4f46e5'

      L.circleMarker([item.lat, item.lon], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.45,
        weight: 2,
      })
        .bindPopup(
          `<b>${item.zoneName}</b><br/>District: ${item.district}<br/>Daily rides: ${item.demand}<br/>Vehicles needed: ${item.vehiclesNeeded}<br/>Gap: ${item.coverageGap}`,
        )
        .addTo(map)
    })

    return () => {
      map.remove()
    }
  }, [state.role, data.isLoading, data.error, mapRows])

  if (data.isLoading) {
    return <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Loading fleet availability...</p>
  }
  if (data.error) {
    return <p role="alert" className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-4 text-sm text-rose-200">{data.error.message}</p>
  }

  if (state.role === 'government_admin') {
    const topThree = [...rows].slice(0, 3)

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-50">Demand Map</h2>
          <p className="mt-1 text-sm text-slate-400">Goal: View city demand and identify one high-need zone.</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-700">
            <div className="relative h-[460px] overflow-hidden bg-slate-950/80">
              <div ref={govMapContainerRef} className="h-full w-full" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {topThree.map((zone, index) => (
              <div key={zone.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm">
                <p className="font-semibold text-slate-100">#{index + 1} {zone.zoneName}</p>
                <p className="text-slate-300">Demand {zone.demand} • Needed {zone.vehiclesNeeded} • Gap {zone.coverageGap}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-700/60 bg-amber-900/20 p-4">
          <h3 className="text-lg font-semibold text-amber-100">Deployment Recommendation</h3>
          <p className="mt-1 text-sm text-amber-100">Deploy 8 more vehicles to Ward 72.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Karnataka Demand Heat Grid</h2>
            <p className="text-sm text-slate-400">District to ward demand drill-down with formula transparency.</p>
          </div>
          <label className="text-sm text-slate-300">
            Demand threshold
            <input
              type="range"
              min={40}
              max={300}
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="ml-3 align-middle"
            />
            <span className="ml-2 rounded bg-slate-800 px-2 py-1 text-xs">{threshold}+</span>
          </label>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setSelectedZoneId(zone.id)}
              className={[
                'rounded-2xl border p-4 text-left transition',
                selected?.id === zone.id
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-950/70 hover:border-slate-500',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-400">{zone.district}</p>
                  <p className="font-semibold text-slate-100">{zone.zoneName}</p>
                </div>
                <StatusChip
                  label={`${zone.demand} rides`}
                  tone={zone.demand > 260 ? 'danger' : zone.demand > 160 ? 'warning' : 'success'}
                />
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Needed {zone.vehiclesNeeded} • Available {zone.available} • Gap {zone.coverageGap}
              </p>
              <p className="mt-2 text-xs text-slate-400">Formula: {zone.formula}</p>
            </button>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-indigo-800/70 bg-slate-900/80 p-0">
          <div className="border-b border-indigo-900/70 bg-[radial-gradient(circle_at_70%_10%,rgba(239,68,68,0.16),transparent_40%),radial-gradient(circle_at_18%_60%,rgba(99,102,241,0.26),transparent_52%),linear-gradient(180deg,#030712_0%,#0b1220_100%)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tactical Safety Grid</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-50">
                  Available Drivers Near {state.selectedPickupLocality}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-700/70 bg-rose-900/30 px-3 py-1 text-xs font-semibold text-rose-200">
                <AlertTriangle size={12} />
                {localCriticalGaps} critical gaps
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <Radar size={14} className="text-indigo-300" />
                Pickup locality match
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
                {nearbyDriverRows.length} drivers ready
              </span>
            </div>

            {nearbyDriverRows.length === 0 ? (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-400">
                No immediately available verified drivers in this locality. Dispatch will search nearby wards.
              </p>
            ) : (
              <div className="space-y-2">
                {nearbyDriverRows.map((driver) => (
                  <div
                    key={driver.driverId}
                    className="flex items-center justify-between rounded-xl border border-indigo-900/70 bg-slate-950/80 p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-100">{driver.name}</p>
                      <p className="text-xs text-slate-400">
                        {driver.vehicleNumber} • ETA {driver.etaMinutes} min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Safety</p>
                      <p className="font-semibold text-indigo-300">{driver.safetyScore}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400">
              <MapPin size={13} className="text-slate-500" />
              Showing drivers whose active zone matches the rider pickup locality.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Zone Detail Drawer</h2>
          {!selected ? (
            <p className="mt-3 text-sm text-slate-400">No zones match the current threshold.</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-slate-400">Zone</p>
                <p className="font-semibold text-slate-100">{selected.zoneName}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-slate-400">Female Workers</p>
                <p className="font-semibold text-slate-100">{selected.femaleWorkers}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-slate-400">Estimated Ride Demand</p>
                <p className="font-semibold text-slate-100">{selected.demand}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-slate-400">Coverage Gap</p>
                <p className="font-semibold text-amber-300">{selected.coverageGap}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <div>
                  <p className="text-slate-400">Confidence</p>
                  <p className="font-semibold text-slate-100">{selected.confidence}</p>
                </div>
                <button
                  onClick={() => recalculateDemandForZone(selected.id)}
                  className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300"
                >
                  Recalculate
                </button>
              </div>
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}
