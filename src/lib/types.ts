export interface Coach {
  id: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  role: string
  team_years: string[]
  joined_date?: string
  status: 'pending_review' | 'active' | 'inactive'
  invite_token?: string
  invite_token_expires_at?: string
  is_admin: boolean
}

export interface Certification {
  id: string
  created_at: string
  updated_at: string
  coach_id: string
  cert_type: string
  issued_date?: string
  expiry_date?: string
  comet_registered: boolean
  notes?: string
  status?: 'valid' | 'expiring_soon' | 'expired' // from view
}

export interface PVGRecord {
  id: string
  created_at: string
  updated_at: string
  coach_id: string
  pvg_status: 'not_started' | 'pending' | 'active' | 'expired'
  application_date?: string
  approval_date?: string
  expiry_date?: string
  pvg_number?: string
  id_verified: boolean
  notes?: string
}

export interface OnboardingStep {
  id: string
  created_at: string
  updated_at: string
  coach_id: string
  step: number
  step_name: string
  completed: boolean
  completed_at?: string
  notes?: string
}

export type ComplianceStatus = 'compliant' | 'action_required' | 'non_compliant'

export interface CoachComplianceData {
  coach: Coach
  certifications: Certification[]
  pvg?: PVGRecord
  onboarding: OnboardingStep[]
}

export const CERT_TYPES = [
  'SFA Level 1',
  'SFA Level 2',
  'UEFA C Licence',
  'Introduction to Coaching 1.1',
  "Children's Coaching Certificate 1.2",
  'SFA Goalkeeping L1',
  'First Aid',
] as const

export const COACH_ROLES = [
  'Head Coach',
  'Assistant Coach',
  'Goalkeeper Coach',
  'Welfare Officer',
] as const

export const TEAM_YEARS = [
  '2014s',
  '2015s',
  '2016s',
  '2017s',
  '2018s',
  '2019s',
] as const

export type CertType = (typeof CERT_TYPES)[number]
export type CoachRole = (typeof COACH_ROLES)[number]
export type TeamYear = (typeof TEAM_YEARS)[number]
