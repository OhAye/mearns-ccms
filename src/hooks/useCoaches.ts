import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Coach } from '../lib/types'

export function useCoaches() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCoaches = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('coaches')
      .select('*')
      .order('last_name', { ascending: true })
    if (err) {
      setError(err.message)
    } else {
      setCoaches(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCoaches()
  }, [fetchCoaches])

  return { coaches, loading, error, refetch: fetchCoaches }
}

export function useCoach(id: string) {
  const [coach, setCoach] = useState<Coach | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCoach = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', id)
      .single()
    if (err) {
      setError(err.message)
    } else {
      setCoach(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchCoach()
  }, [fetchCoach])

  return { coach, loading, error, refetch: fetchCoach }
}

export async function updateCoach(
  id: string,
  updates: Partial<Omit<Coach, 'id' | 'created_at' | 'updated_at'>>
) {
  const { data, error } = await supabase
    .from('coaches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteCoach(id: string) {
  const { error } = await supabase.from('coaches').delete().eq('id', id)
  return { error }
}

export async function createInvite(): Promise<{
  data: Coach | null
  error: string | null
}> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data, error } = await supabase
    .from('coaches')
    .insert({
      first_name: 'Pending',
      last_name: 'Invite',
      email: `invite_${Date.now()}@pending.mearnsfa.com`,
      role: 'Assistant Coach',
      team_years: [],
      status: 'pending_review',
      invite_token_expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function revokeInvite(id: string) {
  const { error } = await supabase
    .from('coaches')
    .update({ invite_token_expires_at: new Date(0).toISOString() })
    .eq('id', id)
  return { error }
}
