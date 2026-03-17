import React from 'react'
import { CoachComplianceData, ComplianceStatus } from '../../lib/types'
import { computeComplianceStatus } from '../../lib/compliance'

interface TeamComplianceBarProps {
  team: string
  coachData: CoachComplianceData[]
}

export function TeamComplianceBar({ team, coachData }: TeamComplianceBarProps) {
  const teamCoaches = coachData.filter((d) => d.coach.team_years.includes(team))
  const total = teamCoaches.length

  if (total === 0) return null

  const counts: Record<ComplianceStatus, number> = {
    compliant: 0,
    action_required: 0,
    non_compliant: 0,
  }

  teamCoaches.forEach((d) => {
    const status = computeComplianceStatus(d)
    counts[status]++
  })

  const compliantPct = (counts.compliant / total) * 100
  const actionPct = (counts.action_required / total) * 100
  const nonPct = (counts.non_compliant / total) * 100

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{team}</span>
        <span className="text-xs text-gray-500">{total} coach{total !== 1 ? 'es' : ''}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {compliantPct > 0 && (
          <div
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${compliantPct}%` }}
            title={`${counts.compliant} compliant`}
          />
        )}
        {actionPct > 0 && (
          <div
            className="bg-amber-400 transition-all duration-500"
            style={{ width: `${actionPct}%` }}
            title={`${counts.action_required} action required`}
          />
        )}
        {nonPct > 0 && (
          <div
            className="bg-red-400 transition-all duration-500"
            style={{ width: `${nonPct}%` }}
            title={`${counts.non_compliant} non-compliant`}
          />
        )}
      </div>
      <div className="flex gap-3 mt-1.5">
        {counts.compliant > 0 && (
          <span className="text-xs text-green-700">{counts.compliant} compliant</span>
        )}
        {counts.action_required > 0 && (
          <span className="text-xs text-amber-700">{counts.action_required} action req.</span>
        )}
        {counts.non_compliant > 0 && (
          <span className="text-xs text-red-700">{counts.non_compliant} non-compliant</span>
        )}
      </div>
    </div>
  )
}
