import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'navy'
  size?: 'sm' | 'md'
}

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  const variantClasses = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    navy: 'bg-[#1B2B4B] text-white',
  }
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }
  return (
    <span
      className={`inline-flex items-center rounded-md font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  )
}
