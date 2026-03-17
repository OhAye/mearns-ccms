import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Certification } from '../lib/types'

export function useCertifications(coachId: string) {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCertifications = useCallback(async () => {
    if (!coachId) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('certifications_with_status')
      .select('*')
      .eq('coach_id', coachId)
      .order('expiry_date', { ascending: true })
    if (err) {
      setError(err.message)
    } else {
      setCertifications(data ?? [])
    }
    setLoading(false)
  }, [coachId])

  useEffect(() => {
    fetchCertifications()
  }, [fetchCertifications])

  return { certifications, loading, error, refetch: fetchCertifications }
}

export async function addCertification(
  cert: Omit<Certification, 'id' | 'created_at' | 'updated_at' | 'status'>
) {
  const { data, error } = await supabase
    .from('certifications')
    .insert(cert)
    .select()
    .single()
  return { data, error }
}

export async function updateCertification(
  id: string,
  updates: Partial<Omit<Certification, 'id' | 'created_at' | 'updated_at' | 'status'>>
) {
  const { data, error } = await supabase
    .from('certifications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteCertification(id: string) {
  const { error } = await supabase.from('certifications').delete().eq('id', id)
  return { error }
}
