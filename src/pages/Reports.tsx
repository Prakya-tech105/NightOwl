import { useMemo, useState } from 'react'
import { StatusChip } from '../components/shared/StatusChip'
import { useNightOwlStore } from '../store/useNightOwlStore'
import { usePilotData } from '../hooks/usePilotData'

type ReportType = 'coverage' | 'safety' | 'demand'

function csvFromRows(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const values = rows.map((row) => headers.map((header) => row[header]).join(','))
  return [headers.join(','), ...values].join('\n')
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

export function ReportsPage() {
  const state = useNightOwlStore()
  const data = usePilotData()
  const [reportType, setReportType] = useState<ReportType>('coverage')

  const rows = useMemo(() => {
    return state.demand.map((record) => {
      const geo = state.geographies.find((item) => item.id === record.geographyId)
      const zone = geo?.ward ?? geo?.district ?? 'Unknown'
      const available = data.vehicles.filter((vehicle) => vehicle.zone === zone && vehicle.available).length
      const verifiedRate = Math.round(
        (data.drivers.filter((driver) => driver.zone === zone && driver.safetyScore >= 75).length /
          Math.max(data.drivers.filter((driver) => driver.zone === zone).length, 1)) *
          100,
      )

      return {
        zone,
        district: geo?.district ?? 'Unknown',
        demand: record.estimatedRideDemand,
        neededVehicles: record.vehiclesNeeded,
        availableVehicles: available,
        coverageGap: Math.max(0, record.vehiclesNeeded - available),
        verifiedRate,
        confidence: record.confidence,
      }
    })
  }, [state.demand, state.geographies, data.vehicles, data.drivers])

  const exportCsv = () => {
    downloadText(`nightowl-${reportType}-report.csv`, csvFromRows(rows))
  }

  const exportPdfMock = () => {
    const content = [
      'NightOwl Report Summary (PDF Mock)',
      `Type: ${reportType}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      ...rows.map((row) => `${row.zone}: demand ${row.demand}, gap ${row.coverageGap}, verified ${row.verifiedRate}%`),
    ].join('\n')

    downloadText(`nightowl-${reportType}-report.pdf.txt`, content)
  }

  if (data.isLoading) {
    return <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Loading report data...</p>
  }
  if (data.error) {
    return <p role="alert" className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-4 text-sm text-rose-200">{data.error.message}</p>
  }

  if (state.role === 'company_admin') {
    const totalEmployeesNeedingRides = rows.reduce((total, row) => total + row.demand, 0)
    const totalAssignedVehicles = rows.reduce((total, row) => total + row.availableVehicles, 0)
    const totalCoverageGap = rows.reduce((total, row) => total + row.coverageGap, 0)

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-50">Demand Summary</h2>
          <p className="mt-1 text-sm text-slate-400">Goal: View employee demand and confirm fleet support.</p>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm">
            <p className="text-slate-300">Employees needing rides tonight: {totalEmployeesNeedingRides.toLocaleString()}</p>
            <p className="text-slate-300">Assigned vehicles: {totalAssignedVehicles}</p>
            <p className="text-slate-300">Coverage gap: {totalCoverageGap}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-700/60 bg-emerald-900/20 p-4">
          <h3 className="text-lg font-semibold text-emerald-100">Allocation Result</h3>
          <p className="mt-1 text-sm text-emerald-100">Transport covered for tonight.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Reports and Exports</h2>
          <p className="text-sm text-slate-400">Coverage, safety, and demand visibility with downloadable summaries.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={reportType}
            onChange={(event) => setReportType(event.target.value as ReportType)}
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="coverage">Coverage Gap Report</option>
            <option value="safety">Safety Compliance Report</option>
            <option value="demand">Demand by Ward Report</option>
          </select>
          <button onClick={exportCsv} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950">
            Export CSV
          </button>
          <button
            onClick={exportPdfMock}
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            Export PDF
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <StatusChip label="Printable dashboard summary ready" tone="success" />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-700 text-slate-300">
              <tr>
                <th className="px-2 py-2">Zone</th>
                <th className="px-2 py-2">Demand</th>
                <th className="px-2 py-2">Vehicles Needed</th>
                <th className="px-2 py-2">Available</th>
                <th className="px-2 py-2">Coverage Gap</th>
                <th className="px-2 py-2">Verified %</th>
                <th className="px-2 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.zone} className="border-b border-slate-800/70 text-slate-100">
                  <td className="px-2 py-2">{row.zone}</td>
                  <td className="px-2 py-2">{row.demand}</td>
                  <td className="px-2 py-2">{row.neededVehicles}</td>
                  <td className="px-2 py-2">{row.availableVehicles}</td>
                  <td className="px-2 py-2">{row.coverageGap}</td>
                  <td className="px-2 py-2">{row.verifiedRate}%</td>
                  <td className="px-2 py-2">{row.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
