import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PVGRecord } from '../lib/types'

export function usePVG(coachId: string) {
  const [pvg, setPvg] = useState<PVGRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPVG = useCallback(async () => {
    if (!coachId) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('pvg_records_with_status')
      .select('*')
      .eq('coach_id', coachId)
      .maybeSingle()
    if (err) {
      setError(err.message)
    } else {
      setPvg(data)
    }
    setLoading(false)
  }, [coachId])

  useEffect(() => {
    fetchPVG()
  }, [fetchPVG])

  return { pvg, loading, error, refetch: fetchPVG }
}

export async function upsertPVG(
  pvgData: Omit<PVGRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }
) {
  if (pvgData.id) {
    const { id, ...updates } = pvgData
    const { data, error } = await supabase
      .from('pvg_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  } else {
    const { data, error } = await supabase
      .from('pvg_records')
      .insert(pvgData)
      .select()
      .single()
    return { data, error }
  }
}
