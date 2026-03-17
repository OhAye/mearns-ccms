import React, { useState } from 'react'
import { OnboardingStep } from '../../lib/types'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { format, parseISO } from 'date-fns'

interface OnboardingChecklistProps {
  steps: OnboardingStep[]
  onUpdate: () => void
}

export function OnboardingChecklist({ steps, onUpdate }: OnboardingChecklistProps) {
  const { addToast } = useToast()
  const [updating, setUpdating] = useState<string | null>(null)

  const sorted = [...steps].sort((a, b) => a.step - b.step)
  const completedCount = steps.filter((s) => s.completed).length
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  const handleToggle = async (step: OnboardingStep) => {
    setUpdating(step.id)
    const newCompleted = !step.completed
    const { error } = await supabase
      .from('onboarding_checklist')
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', step.id)

    if (error) {
      addToast('Failed to update step: ' + error.message, 'error')
    } else {
      addToast(
        newCompleted ? `Step ${step.step} marked complete` : `Step ${step.step} marked incomplete`,
        'success'
      )
      onUpdate()
    }
    setUpdating(null)
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-600">
            {completedCount} of {steps.length} steps completed
          </span>
          <span className="text-sm font-semibold text-[#1B2B4B]">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#1B2B4B] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <ol className="space-y-2">
        {sorted.map((step) => (
          <li
            key={step.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              step.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <button
              onClick={() => handleToggle(step)}
              disabled={updating === step.id}
              className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                step.completed
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-300 hover:border-[#1B2B4B]'
              } ${updating === step.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label={step.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {updating === step.id ? (
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : step.completed ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm font-medium ${
                    step.completed ? 'text-green-800 line-through' : 'text-gray-800'
                  }`}
                >
                  <span className="text-gray-400 font-normal mr-1">{step.step}.</span>
                  {step.step_name}
                </p>
              </div>
              {step.completed && step.completed_at && (
                <p className="text-xs text-green-600 mt-0.5">
                  Completed {format(parseISO(step.completed_at), 'dd MMM yyyy HH:mm')}
                </p>
              )}
              {step.notes && (
                <p className="text-xs text-gray-500 mt-0.5">{step.notes}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
