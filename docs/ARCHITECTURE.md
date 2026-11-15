# KeptCare architecture

KeptCare is a multi-tenant patient CRM for South African healthcare practices.
Practices store patients and appointments, define retention automations,
campaigns, loyalty and segments, and pay a monthly subscription through
PayFast (ZAR). SMS, WhatsApp and email go out through Sendexa.

See also: [`payfast.md`](./payfast.md) (billing flows, go-live checklist) and
[`sendexa.md`](./sendexa.md) (SMS, WhatsApp and email setup).

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router, React 18, TypeScript |
| UI | Tailwind 3 and shadcn/ui (`src/components/ui`), lucide icons, recharts, framer-motion |
| Data | Supabase (Postgres, Auth, RLS) via `@supabase/supabase-js`, TanStack Query on the client |
| Payments | PayFast hosted checkout and subscription API (`src/lib/payfast*.ts`) |
| Messaging | Sendexa REST API (SMS, WhatsApp, email) called directly with `fetch` (`src/lib/sendexa.ts`) |
| Tests | Vitest and jsdom (`src/lib/*.test.ts`). Playwright is configured, but there are no specs yet |
| Hosting | Vercel (`www.kept-care.co.za`) |

## Directory layout

```
app/                      Next.js routes (thin wrappers that render src/screens/*)
  (dashboard)/            Authenticated app; layout wraps ProtectedRoute + AppLayout
  api/payfast/*           checkout, change, cancel, notify (ITN webhook)
  api/messages/send       send SMS / WhatsApp / email (authed)
  api/sendexa/webhook     Sendexa delivery webhook
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
    sendexa.ts            Send SMS / WhatsApp / email, webhook signature
    access.ts             Subscription access + per-channel send rules (client and server)
    twilio.ts             Legacy; only normalizePhone is still used
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
  - message send (SMS, WhatsApp, email)
  - the PayFast and Sendexa webhooks, which verify their own signatures

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

`patients`, `appointments`, `message_templates`, `communication_logs` (message
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
| One-off SMS / WhatsApp / email from patient detail | Working via Sendexa (needs `SENDEXA_*` env). Channel must be in the tier; SMS and WhatsApp need paid access (never the trial), email works in the trial; requires `communications.write`; 500 messages per org per 24h |
| Automations, campaigns | **Stored only.** Nothing runs them yet: no cron or worker, and `patients_affected`/`last_triggered` are just data |
| WhatsApp templates, delivery webhook payload | Built against Sendexa's docs; confirm with a real send (see `sendexa.md`) |
| Loyalty, referrals, segments, alerts | CRUD and display. Points and alerts are not computed automatically |

## Environment variables

This is the source of truth for environment variables. Vercel shows variables marked
**Sensitive** as `*****`, and `vercel env pull` returns them empty, so nobody can read them
back from Vercel. If a value is lost, get it again from the source in the table.

**Names only. Never put values in this file.**

| Variable | Used by | Environments | Sensitive | Where the value comes from |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server Supabase clients | Production, Preview, Development | No (public) | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client | Production, Preview, Development | No (public) | Supabase → Project Settings → API Keys → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client (`src/integrations/supabase/admin.ts`) — bypasses RLS | Production, Preview, Development | **Yes** | Supabase → Project Settings → API Keys → Secret key (`sb_secret_…`) or legacy `service_role` |
| `NEXT_PUBLIC_APP_URL` | PayFast return / cancel / notify URLs | Production, Preview, Development | No (public) | The site's public URL, e.g. `https://www.kept-care.co.za`. Baked in at build time: redeploy after changing it |
| `PAYFAST_MERCHANT_ID` | PayFast checkout, cancel, API calls | Production, Preview, Development | No (public) | PayFast dashboard → Settings → Developer settings |
| `PAYFAST_MERCHANT_KEY` | PayFast checkout | Production, Preview, Development | **Yes** | PayFast dashboard → Settings → Developer settings |
| `PAYFAST_PASSPHRASE` | Signing PayFast requests, verifying ITNs | Production, Preview, Development | **Yes** | PayFast dashboard → Settings → Developer settings (set it there first) |
| `PAYFAST_SANDBOX` | Switches PayFast between sandbox and live | Production, Preview, Development | No | `true` for sandbox, `false` for live. Production goes live via issue #7 |
| `SENDEXA_API_TOKEN` | All Sendexa sends (`src/lib/sendexa.ts`) | Production, Preview, Development | **Yes** | Sendexa dashboard → Settings → API Keys → Copy Token (already Base64, don't re-encode) |
| `SENDEXA_SMS_FROM` | SMS sender | Production, Preview, Development | No | Sendexa dashboard → Sender ID (must be approved) |
| `SENDEXA_EMAIL_FROM` | Email sender address | Production, Preview, Development | No | An address on a domain verified in Sendexa, e.g. `hello@kept-care.co.za` |
| `SENDEXA_WHATSAPP_LANGUAGE` | WhatsApp template language (optional, default `en`) | Production, Preview, Development | No | Language code of your approved templates |
| `SENDEXA_WEBHOOK_SECRET` | Verifying `/api/sendexa/webhook` | Production (and Preview if it has a webhook) | **Yes** | Sendexa dashboard → Settings → Webhooks → Generate Secret |

Only five values are true secrets and stay Sensitive: `SUPABASE_SERVICE_ROLE_KEY`,
`PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `SENDEXA_API_TOKEN` and `SENDEXA_WEBHOOK_SECRET`.
Everything else is public or harmless, so keep it as a plain variable that can be read back.

### To remove

| Variable | Why |
| --- | --- |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_FROM_NUMBER` | Twilio was replaced by Sendexa. Nothing sends through Twilio any more; delete them from Vercel if they were added. |

### Local development

- `.env.local` holds local values and is git-ignored. It needs at least the Supabase variables;
  add the PayFast and Sendexa ones to test checkout or messaging.
- Add a Vercel **Development** environment pointing at a dev Supabase project, so
  `vercel env pull .env.local` works (Sensitive isn't allowed in Development, so values pull).
- The local dev server started from Claude Code sets `NODE_OPTIONS=--use-system-ca`
  (`.claude/launch.json`) so Node trusts the Windows certificate store. Running `npm run dev`
  yourself behind HTTPS inspection needs the same: `$env:NODE_OPTIONS="--use-system-ca"`.

## Commands

```
npm run dev      # next dev on :3000
npm run build
npm test         # vitest
npm run lint
npx supabase db push   # apply migrations to the linked project
```
