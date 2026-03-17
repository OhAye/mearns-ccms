import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCoach, deleteCoach } from '../hooks/useCoaches'
import { useCertifications, addCertification, updateCertification, deleteCertification } from '../hooks/useCertifications'
import { usePVG, upsertPVG } from '../hooks/usePVG'
import { supabase } from '../lib/supabase'
import { OnboardingStep, Certification, PVGRecord, CoachComplianceData, CERT_TYPES } from '../lib/types'
import { computeComplianceStatus } from '../lib/compliance'
import { ComplianceBadge, CoachStatusBadge, CertStatusBadge, PVGStatusBadge } from '../components/ui/StatusBadge'
import { OnboardingChecklist } from '../components/onboarding/OnboardingChecklist'
import { Modal } from '../components/ui/Modal'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { format, parseISO } from 'date-fns'

function fmt(dateStr?: string) {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'dd MMM yyyy') } catch { return dateStr }
}

export default function CoachProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const { coach, loading: coachLoading, error: coachError, refetch: refetchCoach } = useCoach(id!)
  const { certifications, loading: certLoading, refetch: refetchCerts } = useCertifications(id!)
  const { pvg, loading: pvgLoading, refetch: refetchPVG } = usePVG(id!)
  const [onboarding, setOnboarding] = useState<OnboardingStep[]>([])

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [certModalOpen, setCertModalOpen] = useState(false)
  const [pvgModalOpen, setPVGModalOpen] = useState(false)
  const [editingCert, setEditingCert] = useState<Certification | null>(null)
  const [pvgNumberRevealed, setPvgNumberRevealed] = useState(false)
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null)

  // Cert form state
  const [certForm, setCertForm] = useState({
    cert_type: CERT_TYPES[0] as string,
    issued_date: '',
    expiry_date: '',
    comet_registered: false,
    notes: '',
  })

  // PVG form state
  const [pvgForm, setPvgForm] = useState({
    pvg_status: 'not_started' as PVGRecord['pvg_status'],
    application_date: '',
    approval_date: '',
    expiry_date: '',
    pvg_number: '',
    id_verified: false,
    notes: '',
  })

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('onboarding_checklist')
      .select('*')
      .eq('coach_id', id)
      .order('step')
      .then(({ data }) => setOnboarding(data ?? []))
  }, [id])

  useEffect(() => {
    if (pvg) {
      setPvgForm({
        pvg_status: pvg.pvg_status,
        application_date: pvg.application_date ?? '',
        approval_date: pvg.approval_date ?? '',
        expiry_date: pvg.expiry_date ?? '',
        pvg_number: pvg.pvg_number ?? '',
        id_verified: pvg.id_verified,
        notes: pvg.notes ?? '',
      })
    }
  }, [pvg])

  const refetchOnboarding = async () => {
    if (!id) return
    const { data } = await supabase
      .from('onboarding_checklist')
      .select('*')
      .eq('coach_id', id)
      .order('step')
    setOnboarding(data ?? [])
  }

  const complianceData: CoachComplianceData | null = coach
    ? { coach, certifications, pvg: pvg ?? undefined, onboarding }
    : null

  const handleDelete = async () => {
    if (!id) return
    const { error } = await deleteCoach(id)
    if (error) {
      addToast('Failed to delete coach: ' + error.message, 'error')
    } else {
      addToast('Coach deleted successfully', 'success')
      navigate('/coaches')
    }
  }

  const openAddCert = () => {
    setEditingCert(null)
    setCertForm({ cert_type: CERT_TYPES[0], issued_date: '', expiry_date: '', comet_registered: false, notes: '' })
    setCertModalOpen(true)
  }

  const openEditCert = (cert: Certification) => {
    setEditingCert(cert)
    setCertForm({
      cert_type: cert.cert_type,
      issued_date: cert.issued_date ?? '',
      expiry_date: cert.expiry_date ?? '',
      comet_registered: cert.comet_registered,
      notes: cert.notes ?? '',
    })
    setCertModalOpen(true)
  }

  const handleSaveCert = async () => {
    if (!id) return
    setSaving(true)
    const payload = {
      coach_id: id,
      cert_type: certForm.cert_type,
      issued_date: certForm.issued_date || undefined,
      expiry_date: certForm.expiry_date || undefined,
      comet_registered: certForm.comet_registered,
      notes: certForm.notes || undefined,
    }
    let error
    if (editingCert) {
      ;({ error } = await updateCertification(editingCert.id, payload))
    } else {
      ;({ error } = await addCertification(payload as Omit<Certification, 'id' | 'created_at' | 'updated_at' | 'status'>))
    }
    setSaving(false)
    if (error) {
      addToast('Failed to save: ' + error.message, 'error')
    } else {
      addToast(editingCert ? 'Certification updated' : 'Certification added', 'success')
      setCertModalOpen(false)
      refetchCerts()
    }
  }

  const handleDeleteCert = async (certId: string) => {
    setDeletingCertId(certId)
    const { error } = await deleteCertification(certId)
    if (error) {
      addToast('Failed to delete: ' + error.message, 'error')
    } else {
      addToast('Certification deleted', 'success')
      refetchCerts()
    }
    setDeletingCertId(null)
  }

  const handleSavePVG = async () => {
    if (!id) return
    setSaving(true)
    const payload = {
      coach_id: id,
      pvg_status: pvgForm.pvg_status,
      application_date: pvgForm.application_date || undefined,
      approval_date: pvgForm.approval_date || undefined,
      expiry_date: pvgForm.expiry_date || undefined,
      pvg_number: pvgForm.pvg_number || undefined,
      id_verified: pvgForm.id_verified,
      notes: pvgForm.notes || undefined,
    }
    const { error } = await upsertPVG(pvg ? { ...payload, id: pvg.id } : payload)
    setSaving(false)
    if (error) {
      addToast('Failed to save PVG: ' + error.message, 'error')
    } else {
      addToast('PVG record saved', 'success')
      setPVGModalOpen(false)
      refetchPVG()
    }
  }

  if (coachLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2B4B]" />
      </div>
    )
  }
  if (coachError || !coach) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-red-700 text-sm">{coachError ?? 'Coach not found'}</p>
      </div>
    )
  }

  const maskedPvgNumber = pvg?.pvg_number
    ? '••••••' + pvg.pvg_number.slice(-4)
    : null

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/coaches')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Coaches
      </button>

      {/* Profile header */}
      <div className="bg-[#1B2B4B] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center text-xl font-bold">
              {coach.first_name[0]}{coach.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{coach.first_name} {coach.last_name}</h1>
              <p className="text-white/70 text-sm mt-0.5">{coach.role}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {coach.team_years.map((t) => (
                  <span key={t} className="text-xs bg-white/15 text-white/90 rounded-full px-2 py-0.5">{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            {complianceData && (
              <ComplianceBadge status={computeComplianceStatus(complianceData)} className="text-sm" />
            )}
            <CoachStatusBadge status={coach.status} />
            <button
              onClick={() => navigate(`/coaches/${id}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-sm rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: details + onboarding */}
        <div className="lg:col-span-1 space-y-6">
          {/* Personal details */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                <dd className="text-sm text-gray-900 mt-0.5">{coach.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
                <dd className="text-sm text-gray-900 mt-0.5">{coach.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</dt>
                <dd className="text-sm text-gray-900 mt-0.5">{fmt(coach.joined_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</dt>
                <dd className="text-sm text-gray-900 mt-0.5">{coach.role}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teams</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1">
                  {coach.team_years.length > 0
                    ? coach.team_years.map((t) => <Badge key={t} variant="navy" size="sm">{t}</Badge>)
                    : <span className="text-sm text-gray-400">—</span>}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Onboarding */}
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Onboarding Checklist</h2>
            <OnboardingChecklist steps={onboarding} onUpdate={refetchOnboarding} />
          </Card>
        </div>

        {/* Right col: certs + PVG */}
        <div className="lg:col-span-2 space-y-6">
          {/* SFA Certificates */}
          <Card padding={false}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">SFA Certifications</h2>
              <button
                onClick={openAddCert}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2B4B] hover:bg-[#243B5F] text-white text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Cert
              </button>
            </div>
            {certLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1B2B4B]" />
              </div>
            ) : certifications.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-500">No certifications recorded.</p>
                <button onClick={openAddCert} className="mt-2 text-sm text-[#1B2B4B] underline">
                  Add first certification
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Issued</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">COMET</th>
                      <th className="px-4 py-2.5 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {certifications.map((cert) => (
                      <tr key={cert.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-gray-800">{cert.cert_type}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fmt(cert.issued_date)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmt(cert.expiry_date)}</td>
                        <td className="px-4 py-3">
                          <CertStatusBadge status={cert.status} />
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {cert.comet_registered ? (
                            <span className="text-green-600 text-xs font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-400 text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditCert(cert)}
                              className="p-1 text-gray-400 hover:text-[#1B2B4B] rounded transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCert(cert.id)}
                              disabled={deletingCertId === cert.id}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-40"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* PVG */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">PVG Record</h2>
              <button
                onClick={() => setPVGModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2B4B] hover:bg-[#243B5F] text-white text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {pvg ? 'Edit PVG' : 'Add PVG'}
              </button>
            </div>
            {pvgLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1B2B4B]" />
              </div>
            ) : !pvg ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">No PVG record on file.</p>
                <button onClick={() => setPVGModalOpen(true)} className="mt-2 text-sm text-[#1B2B4B] underline">
                  Add PVG record
                </button>
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</dt>
                  <dd className="mt-1"><PVGStatusBadge status={pvg.pvg_status} /></dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">PVG Number</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-gray-900 font-mono">
                      {maskedPvgNumber
                        ? pvgNumberRevealed
                          ? pvg.pvg_number
                          : maskedPvgNumber
                        : '—'}
                    </span>
                    {maskedPvgNumber && (
                      <button
                        onClick={() => setPvgNumberRevealed(!pvgNumberRevealed)}
                        className="text-xs text-[#1B2B4B] underline"
                      >
                        {pvgNumberRevealed ? 'Hide' : 'Reveal'}
                      </button>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Application Date</dt>
                  <dd className="text-sm text-gray-900 mt-1">{fmt(pvg.application_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approval Date</dt>
                  <dd className="text-sm text-gray-900 mt-1">{fmt(pvg.approval_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expiry Date</dt>
                  <dd className="text-sm text-gray-900 mt-1">{fmt(pvg.expiry_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID Verified</dt>
                  <dd className="mt-1">
                    <span className={`text-sm font-medium ${pvg.id_verified ? 'text-green-700' : 'text-gray-400'}`}>
                      {pvg.id_verified ? 'Yes' : 'No'}
                    </span>
                  </dd>
                </div>
                {pvg.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</dt>
                    <dd className="text-sm text-gray-700 mt-1">{pvg.notes}</dd>
                  </div>
                )}
              </dl>
            )}
          </Card>

          {/* Danger zone */}
          <Card className="border-red-200">
            <h2 className="text-base font-semibold text-red-700 mb-2">Danger Zone</h2>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete this coach and all associated records. This action cannot be undone.
            </p>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Delete Coach
            </button>
          </Card>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Coach" size="sm">
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <strong>{coach.first_name} {coach.last_name}</strong>?
          This will permanently remove all their certifications, PVG records, and onboarding data.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteModalOpen(false)}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* Cert modal */}
      <Modal
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        title={editingCert ? 'Edit Certification' : 'Add Certification'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certification Type</label>
            <select
              value={certForm.cert_type}
              onChange={(e) => setCertForm({ ...certForm, cert_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]"
            >
              {CERT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
              <input
                type="date"
                value={certForm.issued_date}
                onChange={(e) => setCertForm({ ...certForm, issued_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={certForm.expiry_date}
                onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="comet_registered"
              checked={certForm.comet_registered}
              onChange={(e) => setCertForm({ ...certForm, comet_registered: e.target.checked })}
              className="rounded border-gray-300 text-[#1B2B4B]"
            />
            <label htmlFor="comet_registered" className="text-sm text-gray-700">COMET Registered</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={certForm.notes}
              onChange={(e) => setCertForm({ ...certForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setCertModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCert}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#1B2B4B] hover:bg-[#243B5F] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* PVG modal */}
      <Modal
        open={pvgModalOpen}
        onClose={() => setPVGModalOpen(false)}
        title={pvg ? 'Edit PVG Record' : 'Add PVG Record'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PVG Status</label>
            <select
              value={pvgForm.pvg_status}
              onChange={(e) => setPvgForm({ ...pvgForm, pvg_status: e.target.value as PVGRecord['pvg_status'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]"
            >
              <option value="not_started">Not Started</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
              <input
                type="date"
                value={pvgForm.application_date}
                onChange={(e) => setPvgForm({ ...pvgForm, application_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
              <input
                type="date"
                value={pvgForm.approval_date}
                onChange={(e) => setPvgForm({ ...pvgForm, approval_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={pvgForm.expiry_date}
                onChange={(e) => setPvgForm({ ...pvgForm, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PVG Number</label>
            <input
              type="text"
              value={pvgForm.pvg_number}
              onChange={(e) => setPvgForm({ ...pvgForm, pvg_number: e.target.value })}
              placeholder="Enter PVG reference number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="id_verified"
              checked={pvgForm.id_verified}
              onChange={(e) => setPvgForm({ ...pvgForm, id_verified: e.target.checked })}
              className="rounded border-gray-300 text-[#1B2B4B]"
            />
            <label htmlFor="id_verified" className="text-sm text-gray-700">ID Verified</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={pvgForm.notes}
              onChange={(e) => setPvgForm({ ...pvgForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setPVGModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePVG}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#1B2B4B] hover:bg-[#243B5F] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
