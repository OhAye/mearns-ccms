/**
 * Supabase Edge Function: check-expiries
 *
 * Queries certifications_with_status and pvg_records_with_status for
 * items that are expiring soon or have expired, then sends email reminders.
 *
 * Deployment:
 *   supabase functions deploy check-expiries
 *
 * Scheduling:
 *   This function should be triggered daily via:
 *   - Supabase's pg_cron extension:
 *       SELECT cron.schedule('check-expiries', '0 8 * * *', $$
 *         SELECT net.http_post(
 *           url := 'https://<project-ref>.supabase.co/functions/v1/check-expiries',
 *           headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
 *         )
 *       $$);
 *   - Or an external scheduler (GitHub Actions, cron-job.org, etc.)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? 'admin@mearnsfa.com'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CertWithStatus {
  id: string
  coach_id: string
  cert_type: string
  expiry_date: string | null
  status: 'valid' | 'expiring_soon' | 'expired'
}

interface PVGWithStatus {
  id: string
  coach_id: string
  pvg_status: string
  expiry_date: string | null
}

interface Coach {
  id: string
  first_name: string
  last_name: string
  email: string
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resendApiKey || resendApiKey === 're_placeholder') {
    console.log(`[Email no-op] To: ${to} | Subject: ${subject}`)
    return true
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mearns FA CCMS <noreply@mearnsfa.com>',
        to: [to],
        subject,
        html,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}

Deno.serve(async (_req: Request) => {
  const emailsSent: string[] = []

  try {
    // Fetch coaches map
    const { data: coachesData, error: coachesError } = await supabase
      .from('coaches')
      .select('id, first_name, last_name, email')

    if (coachesError) throw coachesError

    const coachMap: Record<string, Coach> = {}
    for (const coach of (coachesData ?? []) as Coach[]) {
      coachMap[coach.id] = coach
    }

    // === Certifications expiring soon ===
    const { data: certsData, error: certsError } = await supabase
      .from('certifications_with_status')
      .select('id, coach_id, cert_type, expiry_date, status')
      .eq('status', 'expiring_soon')

    if (certsError) throw certsError

    for (const cert of (certsData ?? []) as CertWithStatus[]) {
      const coach = coachMap[cert.coach_id]
      if (!coach || !cert.expiry_date) continue

      const daysUntilExpiry = Math.ceil(
        (new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      const subject = `Action Required: ${cert.cert_type} expiring in ${daysUntilExpiry} days`
      const html = `
        <p>Hi ${coach.first_name},</p>
        <p>Your <strong>${cert.cert_type}</strong> certification is due to expire on <strong>${cert.expiry_date}</strong> (${daysUntilExpiry} days).</p>
        <p>Please ensure this is renewed before the expiry date to maintain your compliance status with Mearns Football Academy.</p>
        <p>If you have already renewed, please contact your administrator to update your records.</p>
        <p>Regards,<br/>Mearns Football Academy</p>
      `

      const ok = await sendEmail(coach.email, subject, html)
      if (ok) emailsSent.push(`cert-reminder:${coach.email}:${cert.cert_type}`)

      // Also notify admin if < 30 days
      if (daysUntilExpiry <= 30) {
        const adminSubject = `[CCMS Alert] ${coach.first_name} ${coach.last_name} - ${cert.cert_type} expiring in ${daysUntilExpiry} days`
        const adminHtml = `
          <p>Coach <strong>${coach.first_name} ${coach.last_name}</strong> (${coach.email}) has a certification expiring soon:</p>
          <ul>
            <li>Type: ${cert.cert_type}</li>
            <li>Expiry: ${cert.expiry_date}</li>
            <li>Days remaining: ${daysUntilExpiry}</li>
          </ul>
        `
        await sendEmail(adminEmail, adminSubject, adminHtml)
      }
    }

    // === PVG records expiring soon ===
    const { data: pvgData, error: pvgError } = await supabase
      .from('pvg_records_with_status')
      .select('id, coach_id, pvg_status, expiry_date')
      .eq('pvg_status', 'active')
      .not('expiry_date', 'is', null)

    if (pvgError) throw pvgError

    const today = new Date()

    for (const pvg of (pvgData ?? []) as PVGWithStatus[]) {
      const coach = coachMap[pvg.coach_id]
      if (!coach || !pvg.expiry_date) continue

      const expiryDate = new Date(pvg.expiry_date)
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilExpiry > 60 || daysUntilExpiry < 0) continue

      const subject = `Action Required: PVG expiring in ${daysUntilExpiry} days`
      const html = `
        <p>Hi ${coach.first_name},</p>
        <p>Your <strong>PVG disclosure</strong> is due to expire on <strong>${pvg.expiry_date}</strong> (${daysUntilExpiry} days).</p>
        <p>Please contact the club administrator to arrange a PVG renewal. You must maintain an active PVG to continue coaching at Mearns Football Academy.</p>
        <p>Regards,<br/>Mearns Football Academy</p>
      `

      const ok = await sendEmail(coach.email, subject, html)
      if (ok) emailsSent.push(`pvg-reminder:${coach.email}`)

      if (daysUntilExpiry <= 30) {
        const adminSubject = `[CCMS Alert] ${coach.first_name} ${coach.last_name} - PVG expiring in ${daysUntilExpiry} days`
        const adminHtml = `
          <p>Coach <strong>${coach.first_name} ${coach.last_name}</strong> (${coach.email}) has a PVG expiring soon:</p>
          <ul>
            <li>Expiry: ${pvg.expiry_date}</li>
            <li>Days remaining: ${daysUntilExpiry}</li>
          </ul>
        `
        await sendEmail(adminEmail, adminSubject, adminHtml)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        details: emailsSent,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('check-expiries error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
