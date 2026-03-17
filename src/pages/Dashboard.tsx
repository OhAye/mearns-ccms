import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Coach, Certification, PVGRecord, OnboardingStep, CoachComplianceData, ComplianceStatus } from '../lib/types'
import { computeComplianceStatus } from '../lib/compliance'
import { StatCard, Card } from '../components/ui/Card'
import { TeamComplianceBar } from '../components/dashboard/TeamComplianceBar'
import { AlertsPanel } from '../components/dashboard/AlertsPanel'

const TEAMS = ['2014s', '2015s', '2016s', '2017s', '2018s', '2019s']

export default function Dashboard() {
  const [coachData, setCoachData] = useState<CoachComplianceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)

    const [coachRes, certRes, pvgRes, onboardRes] = await Promise.all([
      supabase.from('coaches').select('*').order('last_name'),
      supabase.from('certifications_with_status').select('*'),
      supabase.from('pvg_records_with_status').select('*'),
      supabase.from('onboarding_checklist').select('*'),
    ])

    if (coachRes.error) { setError(coachRes.error.message); setLoading(false); return }
    if (certRes.error) { setError(certRes.error.message); setLoading(false); return }
    if (pvgRes.error) { setError(pvgRes.error.message); setLoading(false); return }
    if (onboardRes.error) { setError(onboardRes.error.message); setLoading(false); return }

    const coaches: Coach[] = coachRes.data ?? []
    const certs: Certification[] = certRes.data ?? []
    const pvgs: PVGRecord[] = pvgRes.data ?? []
    const steps: OnboardingStep[] = onboardRes.data ?? []

    const data: CoachComplianceData[] = coaches.map((coach) => ({
      coach,
      certifications: certs.filter((c) => c.coach_id === coach.id),
      pvg: pvgs.find((p) => p.coach_id === coach.id),
      onboarding: steps.filter((s) => s.coach_id === coach.id),
    }))

    setCoachData(data)
    setLoading(false)
  }

  const counts: Record<ComplianceStatus, number> = {
    compliant: 0,
    action_required: 0,
    non_compliant: 0,
  }
  coachData.forEach((d) => {
    counts[computeComplianceStatus(d)]++
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2B4B]" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-red-700 text-sm font-medium">Error loading data: {error}</p>
        <button onClick={fetchAll} className="mt-2 text-sm text-red-600 underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of coach compliance across Mearns Football Academy
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Coaches"
          value={coachData.length}
          color="navy"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="Fully Compliant"
          value={counts.compliant}
          color="green"
          subtitle={coachData.length > 0 ? `${Math.round((counts.compliant / coachData.length) * 100)}% of coaches` : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Action Required"
          value={counts.action_required}
          color="amber"
          subtitle={coachData.length > 0 ? `${Math.round((counts.action_required / coachData.length) * 100)}% of coaches` : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          title="Non-Compliant"
          value={counts.non_compliant}
          color="red"
          subtitle={coachData.length > 0 ? `${Math.round((counts.non_compliant / coachData.length) * 100)}% of coaches` : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Pending Review */}
      {coachData.filter(d => d.coach.status === 'pending_review' && !(d.coach.first_name === 'Pending' && d.coach.last_name === 'Invite')).length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Pending Review</h2>
            <span className="text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5">
              {coachData.filter(d => d.coach.status === 'pending_review' && !(d.coach.first_name === 'Pending' && d.coach.last_name === 'Invite')).length} awaiting approval
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {coachData
              .filter(d => d.coach.status === 'pending_review' && !(d.coach.first_name === 'Pending' && d.coach.last_name === 'Invite'))
              .map(({ coach }) => (
                <Link
                  key={coach.id}
                  to={`/coaches/${coach.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1B2B4B] flex items-center justify-center text-white text-xs font-semibold">
                      {coach.first_name[0]}{coach.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{coach.first_name} {coach.last_name}</p>
                      <p className="text-xs text-gray-500">{coach.role} · {coach.team_years.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      Registered {coach.created_at ? new Date(coach.created_at).toLocaleDateString('en-GB') : '—'}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
          </div>
        </Card>
      )}

      {/* Team breakdown + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team compliance */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Team Compliance Breakdown</h2>
          <div className="space-y-4">
            {TEAMS.map((team) => (
              <TeamComplianceBar key={team} team={team} coachData={coachData} />
            ))}
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-xs text-gray-500">Action Required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-xs text-gray-500">Non-Compliant</span>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Compliance Alerts</h2>
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              Sorted by urgency
            </span>
          </div>
          <AlertsPanel coachData={coachData} />
        </Card>
      </div>
    </div>
  )
}
