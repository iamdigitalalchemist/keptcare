# KeptCare architecture

KeptCare is a multi-tenant patient CRM for South African healthcare practices.
Practices store patients and appointments, define retention automations,
campaigns, loyalty and segments, and pay a monthly subscription through
PayFast (ZAR). SMS goes out through Twilio.

See also: [`payfast.md`](./payfast.md) (billing flows, go-live checklist) and
[`twilio.md`](./twilio.md) (SMS setup).

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router, React 18, TypeScript |
| UI | Tailwind 3 and shadcn/ui (`src/components/ui`), lucide icons, recharts, framer-motion |
| Data | Supabase (Postgres, Auth, RLS) via `@supabase/supabase-js`, TanStack Query on the client |
| Payments | PayFast hosted checkout and subscription API (`src/lib/payfast*.ts`) |
| SMS | Twilio REST API called directly with `fetch` (`src/lib/twilio.ts`) |
| Tests | Vitest and jsdom (`src/lib/*.test.ts`). Playwright is configured, but there are no specs yet |
| Hosting | Vercel (`keptcare.vercel.app`) |

## Directory layout

```
app/                      Next.js routes (thin wrappers that render src/screens/*)
  (dashboard)/            Authenticated app; layout wraps ProtectedRoute + AppLayout
  api/payfast/*           checkout, change, cancel, notify (ITN webhook)
  api/sms/*               send (authed), status (Twilio webhook)
  api/debug-env           Echoes some env vars (remove before launch)
  auth, accept-invite, reset-password, terms, page.tsx (marketing home)
src/
  screens/                Page components (one per route)
  components/             App components and dialogs; ui/ = shadcn primitives
  contexts/               AuthContext (Supabase session), SubscriptionContext (org, role, tier, access)
  lib/
    practice-data.ts      Loads all org data in one query batch and holds every mutation (TanStack Query)
    payfast.ts            Prices, signatures, ITN validation helpers
    payfast-api.ts        Subscription API client (next_run, amount, cancel)
    limits.ts             Tier limits (mirrors the enforce_tier_limits() SQL trigger)
    twilio.ts             Send, E.164 normalisation, webhook signature
    api-auth.ts           Bearer token -> { userId, organisationId, isOrgAdmin } for API routes
  integrations/supabase/  client.ts (browser, anon key), admin.ts (service role, server-only), types.ts
supabase/migrations/      Schema, RLS, RPCs, triggers (source of truth for the DB)
```

## Request and data flow

- **Rendering:** every screen is a client component. Routes in `app/` only
  import from `src/screens`. No Server Components or Server Actions fetch data.
- **Reads and writes:** the browser talks to Supabase directly with the
  publishable key. Row Level Security is the only thing between users and
  other tenants' data. `usePracticeData()` fetches every table for the org up
  front (11 parallel selects) and computes dashboard stats on the client.
- **Trusted operations** go through `app/api/*`. These routes verify the
  caller's Supabase access token (`getAuthedOrg`) and then use the
  service-role client:
  - PayFast checkout, change, cancel
  - SMS send
  - the PayFast and Twilio webhooks, which verify their own signatures

## Tenancy and authorization

- `organisations` is the tenant. A user has at most one **active**
  `organisation_members` row (enforced by a partial unique index).
- Signup runs the `handle_new_user()` trigger, which creates the profile, the
  org, the four built-in roles, and an `org_admin` membership. Invited signups
  (`signup_mode=invited`) skip org creation and join through
  `accept_organisation_invitation(token)`. Invite tokens are stored as SHA-256
  hashes.
- **RBAC:** each org has its own `organisation_roles`. Permissions are linked
  to roles through `role_permissions`. RLS policies call
  `has_org_permission(org_id, 'patients.read')` and similar helpers. Built-in
  roles:
  - `org_admin`: everything except `platform.*`
  - `manager`: operations, users, and org settings, but no billing or roles
  - `staff`
  - `viewer`
- **Platform admins** (`platform_admins` table, or `is_super_admin: "true"`
  in a user's **app** metadata, which only the service role can set) pass
  every `has_org_permission` check and get the `/admin` screens. User
  metadata is user-writable and never grants privileges.
- **Write paths:** the browser may only update an org's practice details
  (`name`, `email`, `logo_url`, `phone`, `website`, via column grants).
  Billing columns are written only by the ITN (service role) and the
  platform-admin RPCs. Memberships and invitations are read-only from the
  browser; all changes go through SECURITY DEFINER RPCs, which check that a
  role belongs to the org and that only org admins hand out `org_admin`.
  Permission checks only honour a role from the member's own org.
- `get_current_auth_context()` returns the profile, org, membership, role,
  permissions, and platform-admin flag in a single RPC. It feeds
  `SubscriptionContext`.

## Billing and access

- **Tiers and prices:** `PLAN_PRICES_ZAR` holds Starter R3,500, Growth R5,000,
  and Pro R7,000. Limits live in `TIER_LIMITS` and in the
  `tier_limit()`/`enforce_tier_limits()` SQL. Both copies must stay in sync.
- **Access rules** (`src/lib/access.ts`, shared by `SubscriptionContext`,
  `ProtectedRoute`, and server routes):
  - **Card gate:** the user must have a `payfast_token`, or paid access that
    hasn't run out.
  - **Subscription gate:** the trial must still be running, or
    `subscription_active` must be true and `subscription_period_end` plus 3
    days must be in the future.
  - **Feature gate:** `FeatureGate` / `canAccess()` check
    `TIER_FEATURES[tier]`.
- **ITN webhook** (`/api/payfast/notify`):
  1. Runs 4 checks: signature, source IP, server postback, and amount.
  2. Inserts into `payfast_payments` (a unique `pf_payment_id` makes this
     idempotent).
  3. Activates the subscription or extends it by a month, applies
     `pending_tier`, and pauses excess automations.
- Full flows are in [`payfast.md`](./payfast.md).

## Data model (main tables)

`patients`, `appointments`, `message_templates`, `communication_logs` (SMS
rows carry `provider_message_sid` and delivery `status`), `automation_rules`,
`campaigns`, `alerts`, `loyalty_rewards`, `loyalty_members`,
`loyalty_member_rewards`, `referral_records`, `patient_segments`. Each table
has an `organisation_id`, is covered by RLS keyed on `*.read` / `*.write`
permissions, and has an `updated_at` trigger.

## What is real vs. stored-only

| Feature | Status |
|---|---|
| Patients, appointments, CSV import | Working CRUD |
| Roles, invites, org settings | Working. Invite links are copied to the clipboard, not emailed |
| Billing (PayFast) | Working in sandbox |
| One-off SMS from patient detail | Working (needs Twilio env in prod). Paid Growth/Pro only (never Starter or the trial), requires `communications.write`, 500 per org per 24h |
| Automations, campaigns | **Stored only.** Nothing runs them yet: no cron or worker, and `patients_affected`/`last_triggered` are just data |
| Email, WhatsApp channels | Not implemented (no provider) |
| Loyalty, referrals, segments, alerts | CRUD and display. Points and alerts are not computed automatically |

## Environment

See `.env.example`. The server needs `SUPABASE_SERVICE_ROLE_KEY`, the
`PAYFAST_*` vars, the `TWILIO_*` vars, and `NEXT_PUBLIC_APP_URL`. These URLs
are built from `NEXT_PUBLIC_APP_URL`, so it must exactly match the deployed
origin:
- PayFast `return_url`, `cancel_url`, and `notify_url`
- the Twilio status-callback URL, which is also part of Twilio's signature

## Commands

```
npm run dev      # next dev on :3000
npm run build
npm test         # vitest
npm run lint
npx supabase db push   # apply migrations to the linked project
```
