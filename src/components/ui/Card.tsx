import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${padding ? 'p-6' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number | string
  icon?: React.ReactNode
  color?: 'navy' | 'green' | 'amber' | 'red' | 'gray'
  subtitle?: string
}

export function StatCard({ title, value, icon, color = 'navy', subtitle }: StatCardProps) {
  const colorClasses = {
    navy: 'bg-[#1B2B4B] text-white',
    green: 'bg-green-50 text-green-900',
    amber: 'bg-amber-50 text-amber-900',
    red: 'bg-red-50 text-red-900',
    gray: 'bg-gray-50 text-gray-900',
  }
  const iconColorClasses = {
    navy: 'bg-white/10 text-white',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-200 text-gray-600',
  }

  return (
    <div className={`rounded-xl p-4 sm:p-6 ${colorClasses[color]} shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs sm:text-sm font-medium opacity-80 mb-1`}>{title}</p>
          <p className="text-2xl sm:text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-xs mt-1 opacity-60 hidden sm:block">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-1.5 sm:p-2 rounded-lg ${iconColorClasses[color]}`}>{icon}</div>
        )}
      </div>
    </div>
  )
}
