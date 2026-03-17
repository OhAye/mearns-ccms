import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Coach } from '../lib/types'
import { createInvite, revokeInvite } from '../hooks/useCoaches'
import { useToast } from '../components/ui/Toast'
import { format, parseISO, isPast } from 'date-fns'
import { Card } from '../components/ui/Card'

function getInviteStatus(invite: Coach): 'pending' | 'used' | 'expired' {
  // If the coach has been updated to have a real name (not "Pending Invite"), it's been used
  if (invite.first_name !== 'Pending' || invite.last_name !== 'Invite') return 'used'
  if (!invite.invite_token_expires_at) return 'expired'
  if (isPast(parseISO(invite.invite_token_expires_at))) return 'expired'
  return 'pending'
}

export default function Invite() {
  const { addToast } = useToast()
  const [invites, setInvites] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchInvites = useCallback(async () => {
    setLoading(true)
    // Fetch coaches that still have "Pending Invite" name (stub invites)
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('first_name', 'Pending')
      .eq('last_name', 'Invite')
      .not('invite_token', 'is', null)
      .order('created_at', { ascending: false })

    if (!error) setInvites(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const handleGenerate = async () => {
    setGenerating(true)
    const { data, error } = await createInvite()
    setGenerating(false)
    if (error || !data) {
      addToast('Failed to generate invite: ' + (error ?? 'Unknown error'), 'error')
      return
    }
    const link = `${window.location.origin}/register/${data.invite_token}`
    setGeneratedLink(link)
    fetchInvites()
  }

  const handleCopy = async () => {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async (invite: Coach) => {
    setRevoking(invite.id)
    const { error } = await revokeInvite(invite.id)
    if (error) {
      addToast('Failed to revoke invite: ' + error.message, 'error')
    } else {
      addToast('Invite revoked', 'success')
      fetchInvites()
    }
    setRevoking(null)
  }

  const statusStyles = {
    pending: 'bg-green-100 text-green-800',
    used: 'bg-blue-100 text-blue-800',
    expired: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invite Coach</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate a unique registration link to send to a new coach
        </p>
      </div>

      {/* Generate invite card */}
      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Generate Registration Link</h2>
        <p className="text-sm text-gray-600 mb-4">
          Each link is unique and expires after 7 days. Share it directly with the coach via email or
          messaging.
        </p>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B2B4B] hover:bg-[#243B5F] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          {generating ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Generate New Invite Link
            </>
          )}
        </button>

        {generatedLink && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Registration Link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 break-all">
                {generatedLink}
              </code>
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-[#1B2B4B] hover:bg-[#243B5F] text-white'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-2">
              This link expires in 7 days. Send it directly to the coach.
            </p>
          </div>
        )}
      </Card>

      {/* Pending invites table */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Pending Invites</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1B2B4B]" />
          </div>
        ) : invites.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No invites found. Generate one above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const status = getInviteStatus(invite)
                  return (
                    <tr key={invite.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <code className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-0.5">
                          {invite.invite_token?.slice(0, 8)}...
                        </code>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(parseISO(invite.created_at), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {invite.invite_token_expires_at
                          ? format(parseISO(invite.invite_token_expires_at), 'dd MMM yyyy HH:mm')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {status === 'pending' && (
                          <button
                            onClick={() => handleRevoke(invite)}
                            disabled={revoking === invite.id}
                            className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-40"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
