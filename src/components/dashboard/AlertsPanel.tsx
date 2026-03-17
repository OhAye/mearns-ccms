import React from 'react'
import { Link } from 'react-router-dom'
import { CoachComplianceData } from '../../lib/types'
import { isAfter, addDays, parseISO, format } from 'date-fns'

interface Alert {
  coachId: string
  coachName: string
  message: string
  urgency: 'critical' | 'warning'
}

interface AlertsPanelProps {
  coachData: CoachComplianceData[]
}

export function AlertsPanel({ coachData }: AlertsPanelProps) {
  const today = new Date()
  const in30 = addDays(today, 30)
  const in60 = addDays(today, 60)

  const alerts: Alert[] = []

  coachData.forEach(({ coach, certifications, pvg }) => {
    const name = `${coach.first_name} ${coach.last_name}`

    // PVG alerts
    if (pvg) {
      if (pvg.pvg_status === 'expired' || (pvg.expiry_date && isAfter(today, parseISO(pvg.expiry_date)))) {
        alerts.push({
          coachId: coach.id,
          coachName: name,
          message: 'PVG has expired',
          urgency: 'critical',
        })
      } else if (pvg.expiry_date && isAfter(in30, parseISO(pvg.expiry_date))) {
        alerts.push({
          coachId: coach.id,
          coachName: name,
          message: `PVG expiring ${format(parseISO(pvg.expiry_date), 'dd MMM yyyy')} (< 30 days)`,
          urgency: 'critical',
        })
      } else if (pvg.expiry_date && isAfter(in60, parseISO(pvg.expiry_date))) {
        alerts.push({
          coachId: coach.id,
          coachName: name,
          message: `PVG expiring ${format(parseISO(pvg.expiry_date), 'dd MMM yyyy')} (< 60 days)`,
          urgency: 'warning',
        })
      } else if (pvg.pvg_status === 'pending') {
        alerts.push({
          coachId: coach.id,
          coachName: name,
          message: 'PVG application pending',
          urgency: 'warning',
        })
      }
    } else {
      alerts.push({
        coachId: coach.id,
        coachName: name,
        message: 'No PVG record on file',
        urgency: 'critical',
      })
    }

    // Cert alerts
    certifications.forEach((cert) => {
      if (cert.expiry_date) {
        if (isAfter(today, parseISO(cert.expiry_date))) {
          alerts.push({
            coachId: coach.id,
            coachName: name,
            message: `${cert.cert_type} has expired`,
            urgency: 'critical',
          })
        } else if (isAfter(in30, parseISO(cert.expiry_date))) {
          alerts.push({
            coachId: coach.id,
            coachName: name,
            message: `${cert.cert_type} expiring ${format(parseISO(cert.expiry_date), 'dd MMM yyyy')} (< 30 days)`,
            urgency: 'critical',
          })
        } else if (isAfter(in60, parseISO(cert.expiry_date))) {
          alerts.push({
            coachId: coach.id,
            coachName: name,
            message: `${cert.cert_type} expiring ${format(parseISO(cert.expiry_date), 'dd MMM yyyy')} (< 60 days)`,
            urgency: 'warning',
          })
        }
      }
    })
  })

  // Sort: critical first
  alerts.sort((a, b) => {
    if (a.urgency === b.urgency) return a.coachName.localeCompare(b.coachName)
    return a.urgency === 'critical' ? -1 : 1
  })

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No active alerts</p>
        <p className="text-xs text-gray-400 mt-1">All coaches are up to date</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {alerts.map((alert, i) => (
        <Link
          key={i}
          to={`/coaches/${alert.coachId}`}
          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
          style={{
            borderColor: alert.urgency === 'critical' ? '#fca5a5' : '#fcd34d',
            backgroundColor: alert.urgency === 'critical' ? '#fff5f5' : '#fffbeb',
          }}
        >
          <div
            className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
              alert.urgency === 'critical' ? 'bg-red-500' : 'bg-amber-400'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 group-hover:text-[#1B2B4B]">
              {alert.coachName}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
          </div>
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-[#1B2B4B]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ))}
    </div>
  )
}
