import React from 'react'
import { ComplianceStatus } from '../../lib/types'

interface ComplianceBadgeProps {
  status: ComplianceStatus
  className?: string
}

export function ComplianceBadge({ status, className = '' }: ComplianceBadgeProps) {
  const styles: Record<ComplianceStatus, string> = {
    compliant: 'bg-green-100 text-green-800 border border-green-200',
    action_required: 'bg-amber-100 text-amber-800 border border-amber-200',
    non_compliant: 'bg-red-100 text-red-800 border border-red-200',
  }
  const labels: Record<ComplianceStatus, string> = {
    compliant: 'Compliant',
    action_required: 'Action Required',
    non_compliant: 'Non-Compliant',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]} ${className}`}
    >
      {labels[status]}
    </span>
  )
}

interface CoachStatusBadgeProps {
  status: 'pending_review' | 'active' | 'inactive'
  className?: string
}

export function CoachStatusBadge({ status, className = '' }: CoachStatusBadgeProps) {
  const styles = {
    pending_review: 'bg-gray-100 text-gray-700 border border-gray-200',
    active: 'bg-green-100 text-green-800 border border-green-200',
    inactive: 'bg-red-100 text-red-700 border border-red-200',
  }
  const labels = {
    pending_review: 'Pending Review',
    active: 'Active',
    inactive: 'Inactive',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]} ${className}`}
    >
      {labels[status]}
    </span>
  )
}

interface CertStatusBadgeProps {
  status: 'valid' | 'expiring_soon' | 'expired' | undefined
  className?: string
}

export function CertStatusBadge({ status, className = '' }: CertStatusBadgeProps) {
  if (!status) return null
  const styles = {
    valid: 'bg-green-100 text-green-800 border border-green-200',
    expiring_soon: 'bg-amber-100 text-amber-800 border border-amber-200',
    expired: 'bg-red-100 text-red-800 border border-red-200',
  }
  const labels = {
    valid: 'Valid',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]} ${className}`}
    >
      {labels[status]}
    </span>
  )
}

interface PVGStatusBadgeProps {
  status: 'not_started' | 'pending' | 'active' | 'expired'
  className?: string
}

export function PVGStatusBadge({ status, className = '' }: PVGStatusBadgeProps) {
  const styles = {
    not_started: 'bg-gray-100 text-gray-700 border border-gray-200',
    pending: 'bg-amber-100 text-amber-800 border border-amber-200',
    active: 'bg-green-100 text-green-800 border border-green-200',
    expired: 'bg-red-100 text-red-800 border border-red-200',
  }
  const labels = {
    not_started: 'Not Started',
    pending: 'Pending',
    active: 'Active',
    expired: 'Expired',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]} ${className}`}
    >
      {labels[status]}
    </span>
  )
}
