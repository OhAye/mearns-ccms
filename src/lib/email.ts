import { Coach } from './types'

const isPlaceholder =
  !import.meta.env.VITE_RESEND_API_KEY ||
  import.meta.env.VITE_RESEND_API_KEY === 're_placeholder'

export async function sendWelcomeEmail(coachEmail: string, firstName: string): Promise<void> {
  if (isPlaceholder) {
    console.log('[Email - no-op] sendWelcomeEmail', { coachEmail, firstName })
    return
  }
  // Real implementation would use Resend SDK here
  // const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY)
  // await resend.emails.send({ ... })
}

export async function sendAdminNewRegistrationEmail(
  adminEmail: string,
  coach: Pick<Coach, 'first_name' | 'last_name' | 'email' | 'role'>
): Promise<void> {
  if (isPlaceholder) {
    console.log('[Email - no-op] sendAdminNewRegistrationEmail', { adminEmail, coach })
    return
  }
}

export async function sendExpiryReminder60(
  coachEmail: string,
  firstName: string,
  itemName: string,
  expiryDate: string
): Promise<void> {
  if (isPlaceholder) {
    console.log('[Email - no-op] sendExpiryReminder60', {
      coachEmail,
      firstName,
      itemName,
      expiryDate,
    })
    return
  }
}

export async function sendExpiryReminder30(
  coachEmail: string,
  firstName: string,
  itemName: string,
  expiryDate: string
): Promise<void> {
  if (isPlaceholder) {
    console.log('[Email - no-op] sendExpiryReminder30', {
      coachEmail,
      firstName,
      itemName,
      expiryDate,
    })
    return
  }
}

export async function sendAdminFullyCompliantEmail(
  adminEmail: string,
  coach: Pick<Coach, 'first_name' | 'last_name' | 'email'>
): Promise<void> {
  if (isPlaceholder) {
    console.log('[Email - no-op] sendAdminFullyCompliantEmail', { adminEmail, coach })
    return
  }
}
