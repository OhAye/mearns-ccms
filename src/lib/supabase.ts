import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://ivngpdtjmjszdwxeqjho.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bmdwZHRqbWpzemR3eGVxamhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTY3OTUsImV4cCI6MjA4OTMzMjc5NX0.WsZs6Vn_6HKKNMNlXiCCyvz0GMZzXv0d77t38rSvt2Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
