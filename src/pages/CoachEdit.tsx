import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCoach, updateCoach } from '../hooks/useCoaches'
import { Coach, COACH_ROLES, TEAM_YEARS } from '../lib/types'
import { useToast } from '../components/ui/Toast'

export default function CoachEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { coach, loading, error } = useCoach(id!)

  const [form, setForm] = useState<Partial<Coach>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (coach) {
      setForm({
        first_name: coach.first_name,
        last_name: coach.last_name,
        email: coach.email,
        phone: coach.phone ?? '',
        role: coach.role,
        team_years: coach.team_years,
        joined_date: coach.joined_date ?? '',
        status: coach.status,
        is_admin: coach.is_admin,
      })
    }
  }, [coach])

  const handleTeamToggle = (team: string) => {
    const current = form.team_years ?? []
    const updated = current.includes(team)
      ? current.filter((t) => t !== team)
      : [...current, team]
    setForm({ ...form, team_years: updated })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)

    const { error: saveError } = await updateCoach(id, {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || undefined,
      role: form.role,
      team_years: form.team_years,
      joined_date: form.joined_date || undefined,
      status: form.status,
      is_admin: form.is_admin,
    })

    setSaving(false)

    if (saveError) {
      addToast('Failed to save: ' + saveError.message, 'error')
    } else {
      addToast('Coach profile updated successfully', 'success')
      navigate(`/coaches/${id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2B4B]" />
      </div>
    )
  }
  if (error || !coach) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-red-700 text-sm">{error ?? 'Coach not found'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(`/coaches/${id}`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Profile
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Coach</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update {coach.first_name} {coach.last_name}'s details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Name row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
            <input
              type="text"
              required
              value={form.first_name ?? ''}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
            <input
              type="text"
              required
              value={form.last_name ?? ''}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] focus:border-transparent"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
          <input
            type="email"
            required
            value={form.email ?? ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] focus:border-transparent"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input
            type="tel"
            value={form.phone ?? ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+44 7700 000000"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] focus:border-transparent"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
          <select
            required
            value={form.role ?? ''}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] focus:border-transparent"
          >
            {COACH_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Teams */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Teams</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {TEAM_YEARS.map((t) => {
              const checked = (form.team_years ?? []).includes(t)
              return (
                <label
                  key={t}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${
                    checked
                      ? 'bg-[#1B2B4B] text-white border-[#1B2B4B]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => handleTeamToggle(t)}
                  />
                  {t}
                </label>
              )
            })}
          </div>
        </div>

        {/* Joined date + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Joined Date</label>
            <input
              type="date"
              value={form.joined_date ?? ''}
              onChange={(e) => setForm({ ...form, joined_date: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={form.status ?? 'pending_review'}
              onChange={(e) => setForm({ ...form, status: e.target.value as Coach['status'] })}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] focus:border-transparent"
            >
              <option value="pending_review">Pending Review</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Admin toggle */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="is_admin"
            checked={form.is_admin ?? false}
            onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
            className="rounded border-gray-300 text-[#1B2B4B]"
          />
          <label htmlFor="is_admin" className="text-sm text-gray-700">
            <span className="font-medium">Admin access</span>
            <span className="text-gray-500 ml-1">— can access the CCMS dashboard</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/coaches/${id}`)}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-[#1B2B4B] hover:bg-[#243B5F] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
