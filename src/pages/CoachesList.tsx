import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCoaches } from '../hooks/useCoaches'
import { useCertifications } from '../hooks/useCertifications'
import { usePVG } from '../hooks/usePVG'
import { Coach, CoachComplianceData } from '../lib/types'
import { computeComplianceStatus } from '../lib/compliance'
import { ComplianceBadge, CoachStatusBadge } from '../components/ui/StatusBadge'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'

const TEAM_FILTERS = ['All', '2014s', '2015s', '2016s', '2017s', '2018s', '2019s']

// We need a component that fetches compliance data per coach for the list
function CoachRowCompliance({ coach }: { coach: Coach }) {
  const { certifications } = useCertifications(coach.id)
  const { pvg } = usePVG(coach.id)
  const [onboarding, setOnboarding] = React.useState<{ completed: boolean }[]>([])

  React.useEffect(() => {
    supabase
      .from('onboarding_checklist')
      .select('completed')
      .eq('coach_id', coach.id)
      .then(({ data }) => setOnboarding(data ?? []))
  }, [coach.id])

  const data: CoachComplianceData = {
    coach,
    certifications,
    pvg: pvg ?? undefined,
    onboarding: onboarding.map((o, i) => ({
      id: String(i),
      created_at: '',
      updated_at: '',
      coach_id: coach.id,
      step: i + 1,
      step_name: '',
      completed: o.completed,
    })),
  }

  const status = computeComplianceStatus(data)
  return <ComplianceBadge status={status} />
}

export default function CoachesList() {
  const navigate = useNavigate()
  const { coaches, loading, error } = useCoaches()
  const [teamFilter, setTeamFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return coaches.filter((c) => {
      const matchTeam =
        teamFilter === 'All' || c.team_years.includes(teamFilter)
      const matchSearch =
        search.trim() === '' ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        c.role.toLowerCase().includes(search.toLowerCase())
      return matchTeam && matchSearch
    })
  }, [coaches, teamFilter, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2B4B]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-red-700 text-sm">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaches</h1>
          <p className="text-sm text-gray-500 mt-0.5">{coaches.length} registered coaches</p>
        </div>
        <button
          onClick={() => navigate('/invite')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B2B4B] hover:bg-[#243B5F] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite New Coach
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] focus:border-transparent"
          />
        </div>

        {/* Team filter pills */}
        <div className="flex flex-wrap gap-2">
          {TEAM_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTeamFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                teamFilter === t
                  ? 'bg-[#1B2B4B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Coach
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Teams
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Compliance
                </th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500 text-sm">
                    No coaches found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((coach) => (
                  <tr
                    key={coach.id}
                    onClick={() => navigate(`/coaches/${coach.id}`)}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1B2B4B] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {coach.first_name[0]}{coach.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {coach.first_name} {coach.last_name}
                          </p>
                          <p className="text-xs text-gray-500 sm:hidden">{coach.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-gray-700">{coach.role}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {coach.team_years.map((t) => (
                          <Badge key={t} variant="navy" size="sm">{t}</Badge>
                        ))}
                        {coach.team_years.length === 0 && (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CoachStatusBadge status={coach.status} />
                    </td>
                    <td className="px-4 py-3">
                      <CoachRowCompliance coach={coach} />
                    </td>
                    <td className="px-4 py-3">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
