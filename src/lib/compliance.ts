import { CoachComplianceData, ComplianceStatus } from './types'
import { isAfter, addDays, parseISO } from 'date-fns'

export function computeComplianceStatus(data: CoachComplianceData): ComplianceStatus {
  const today = new Date()
  const in60Days = addDays(today, 60)

  const { certifications, pvg, onboarding } = data

  // Non-Compliant conditions (highest priority)
  if (!pvg || pvg.pvg_status === 'not_started') return 'non_compliant'
  if (pvg.pvg_status === 'expired') return 'non_compliant'
  if (pvg.expiry_date && isAfter(today, parseISO(pvg.expiry_date))) return 'non_compliant'
  if (certifications.length === 0) return 'non_compliant'
  const allCertsExpired = certifications.every(
    (c) => c.expiry_date && isAfter(today, parseISO(c.expiry_date))
  )
  if (allCertsExpired) return 'non_compliant'

  // Action Required conditions
  const pvgExpiringSoon =
    pvg.expiry_date &&
    isAfter(in60Days, parseISO(pvg.expiry_date)) &&
    isAfter(parseISO(pvg.expiry_date), today)
  if (pvgExpiringSoon) return 'action_required'
  if (pvg.pvg_status === 'pending') return 'action_required'

  const certExpiringSoon = certifications.some(
    (c) =>
      c.expiry_date &&
      isAfter(in60Days, parseISO(c.expiry_date)) &&
      isAfter(parseISO(c.expiry_date), today)
  )
  if (certExpiringSoon) return 'action_required'

  const onboardingIncomplete = onboarding.some((s) => !s.completed)
  if (onboardingIncomplete) return 'action_required'

  return 'compliant'
}

export function getComplianceLabel(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant':
      return 'Compliant'
    case 'action_required':
      return 'Action Required'
    case 'non_compliant':
      return 'Non-Compliant'
  }
}

export function getComplianceColor(status: ComplianceStatus): string {
  switch (status) {
    case 'compliant':
      return 'green'
    case 'action_required':
      return 'amber'
    case 'non_compliant':
      return 'red'
  }
}
