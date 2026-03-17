# Mearns Football Academy - Coach Compliance Management System (CCMS)

A full-stack web application for managing coach compliance, certifications, PVG disclosures, and onboarding at Mearns Football Academy.

![CCMS Dashboard](https://via.placeholder.com/1200x600/1B2B4B/FFFFFF?text=CCMS+Dashboard+Screenshot)

---

## Tech Stack

| Layer        | Technology                         |
|--------------|------------------------------------|
| Frontend     | React 18 + Vite + TypeScript       |
| Styling      | Tailwind CSS v3                    |
| Routing      | React Router v6                    |
| Database     | Supabase (PostgreSQL)              |
| Auth         | Supabase Auth                      |
| Email        | Resend (transactional)             |
| Edge Functions | Supabase Edge Functions (Deno)   |

---

## Prerequisites

- Node.js 18+
- npm or yarn
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account (optional, for real emails)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/mearns-ccms.git
cd mearns-ccms
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy your Project URL and anon key

### 4. Set environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_RESEND_API_KEY=re_your_key_here   # or re_placeholder to disable
VITE_ADMIN_EMAIL=admin@mearnsfa.com
```

### 5. Run the database schema

In your Supabase project, go to **SQL Editor** and run the full contents of `supabase/schema.sql`. This creates:

- All tables with constraints
- Computed views (`certifications_with_status`, `pvg_records_with_status`)
- Triggers (auto `updated_at`, auto onboarding checklist creation)
- RPC function for coach self-registration
- Row Level Security policies
- Seed data: 15 realistic coaches across all compliance states

### 6. Create an admin user

In **Supabase → Authentication → Users**, click **Add User** and create a user with your admin email and a secure password. This is the login you'll use for the CCMS dashboard.

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with your admin credentials.

---

## How to Invite and Register Coaches

The CCMS uses a token-based invitation flow:

1. **Admin generates invite** — Navigate to **Invite Coach** in the sidebar and click **Generate New Invite Link**. A unique registration URL is created valid for 7 days.

2. **Admin shares link** — Copy the link and send it to the coach directly (email, messaging etc.).

3. **Coach self-registers** — The coach opens the link and completes the registration form (name, email, phone, role, teams). This requires no account.

4. **Admin reviews** — The coach's profile appears with status `pending_review`. Admin reviews and updates to `active` once verified.

Onboarding step 1 is automatically marked complete when the coach submits their registration.

---

## Compliance Logic

Compliance status is computed client-side by `src/lib/compliance.ts` using the following priority order:

### Non-Compliant (highest priority)
- No PVG record, or PVG status is `not_started`
- PVG status is `expired`
- PVG has an expiry date in the past
- Coach has zero certifications
- All certifications have expiry dates in the past

### Action Required
- PVG expiry date is within 60 days (but not yet expired)
- PVG status is `pending`
- Any certification expiry date is within 60 days (but not yet expired)
- Any onboarding step is incomplete

### Compliant
All other cases — active PVG not expiring soon, at least one valid cert, all onboarding steps complete.

---

## Email Setup (Resend)

1. Create an account at [resend.com](https://resend.com)
2. Obtain your API key
3. Update `VITE_RESEND_API_KEY` in `.env.local`
4. Add and verify your sending domain in the Resend dashboard

When `VITE_RESEND_API_KEY` is set to `re_placeholder`, all email functions are no-ops that log to the console. No emails are sent.

Email functions are defined in `src/lib/email.ts`:
- `sendWelcomeEmail` — sent to coach on successful registration
- `sendAdminNewRegistrationEmail` — notifies admin of new registration
- `sendExpiryReminder60` — 60-day expiry warning
- `sendExpiryReminder30` — 30-day expiry warning
- `sendAdminFullyCompliantEmail` — notifies admin when coach becomes fully compliant

---

## Edge Function: check-expiries

The `supabase/functions/check-expiries/index.ts` edge function scans for expiring certifications and PVGs and sends reminder emails. It is designed to run daily.

### Deploy

```bash
supabase functions deploy check-expiries
```

### Schedule (via pg_cron)

In Supabase SQL Editor, enable pg_cron and create a daily schedule:

```sql
SELECT cron.schedule(
  'check-expiries-daily',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/check-expiries',
      headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
    )
  $$
);
```

Or use an external scheduler (GitHub Actions, cron-job.org) to POST to the function URL daily.

---

## Build for Production

```bash
npm run build
```

Output is in `dist/`. Deploy to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # Sidebar, Navbar, Layout wrapper
│   ├── ui/              # Badge, Card, Modal, Table, StatusBadge, Toast
│   ├── dashboard/       # TeamComplianceBar, AlertsPanel
│   └── onboarding/      # OnboardingChecklist
├── pages/               # Login, Dashboard, CoachesList, CoachProfile, etc.
├── hooks/               # useAuth, useCoaches, useCertifications, usePVG
└── lib/                 # supabase client, types, compliance logic, email
```

---

## Licence

MIT © Mearns Football Academy
