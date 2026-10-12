# Billing — PayFast recurring subscriptions

KeptCare bills monthly in ZAR via [PayFast](https://www.payfast.co.za) recurring
subscriptions. This document is the reference for the billing model, every
flow, and the enforcement rules. Keep it in sync with
`src/lib/payfast.ts` (prices), `src/lib/limits.ts` (limits) and
`supabase/migrations/20260912000000_tier_limits.sql` (DB enforcement).

## Model

- **Tiers (ZAR/month):** Starter R3,500 · Growth R5,000 · Pro R7,000. Source of
  truth: `PLAN_PRICES_ZAR` in `src/lib/payfast.ts`. The public home page,
  `/pricing`, and the ITN amount check all read these values.
- **Limits** (patients / automations / seats): Starter 200/2/1 · Growth
  1000/10/3 · Pro unlimited. Mirrored in `TIER_LIMITS` (client) and
  `tier_limit()` (DB trigger) — keep in sync.
- **Trial:** 14 days, **Starter only**, **card required before access**. R0.00
  charged at capture; the first real charge lands on the trial end date and
  recurs monthly on that date. There is no card-free trial — an org without a
  card on file is held at the card-capture gate (below) instead of the
  dashboard.
- **Growth/Pro:** never any free days — always billed in full from day one,
  including mid-trial upgrades.

### Organisation billing state (`organisations` columns)

| Column | Set by | Meaning |
| --- | --- | --- |
| `trial_ends_at` | DB default at org creation (`now() + 14 days`) | End of the free trial |
| `subscription_tier` | ITN / `/api/payfast/change` | Tier features run on **now** |
| `pending_tier` | `/api/payfast/change` (downgrades) | Tier the org switches to at the next billing date |
| `subscription_period_end` | ITN (creation + each renewal) | Paid access runs until this timestamp |
| `subscription_active` | ITN | Last known payment state |
| `payfast_token` | ITN (creation) / cleared by cancel flows | PayFast subscription token; `null` = no live subscription |

Access rule (client, `SubscriptionContext`): active if
`subscription_active && subscription_period_end + 3-day grace > now` — a NULL
period end **never** counts as paid access (it means the org has never
successfully paid; new org rows default `subscription_active` to FALSE) — or
the trial is still running. Everything PayFast-related is driven by the ITN
webhook — `/api/payfast/notify` is the single writer of billing state.

## Flows

### 1. Signup → trial card capture (happy path)

1. `Auth.tsx` signs up; `handle_new_user` creates the org synchronously
   (trial starts now, ends day 14).
2. With a session (email confirmation off), the browser immediately calls
   `POST /api/payfast/checkout` for **starter**.
3. Checkout builds a signed recurring-subscription request:
   `amount = 0.00`, `recurring_amount = 3500.00`, `frequency = 3` (monthly),
   `cycles = 0` (indefinite), `custom_str1 = orgId`, `custom_str2 = tier`.
   The browser auto-submits it to PayFast's hosted page — card details never
   touch our servers.
4. PayFast charges R0.00 and hits the ITN webhook (`COMPLETE`, `amount_gross
   ≈ 0`, no existing token → creation).
5. The ITN marks the org active, sets `subscription_period_end =
   trial_ends_at + 1 month` (bridging trial → paid seamlessly), stores the
   token, and calls PayFast's subscription API
   (`PATCH /subscriptions/{token}/update` with `run_date = trial_ends_at`) so
   the **first real charge lands on day 14** and recurs monthly on that date.
6. Browser lands on `/pricing/success`.

If email confirmation is on there is no session at signup: after confirming
their email the user hits the **card-capture gate** (below) before the
dashboard opens — the checkout is deferred, never skipped. Same if the user
abandons the PayFast page mid-signup: the gate catches them on the next visit.

### The card-capture gate (always-on)

`ProtectedRoute` enforces: an org with **no `payfast_token`** gets no app
access (any page except `/pricing`, where the card gets captured) until the
org admin completes checkout. This applies **during the trial too** — the
trial is card-first, not card-later. Non-admin members see a "waiting for the
organisation admin to set up billing" message.

Two exceptions:

- An org that **paid and later cancelled** keeps tokenless access for what it
  already paid (`subscription_period_end` + 3-day grace, mirroring
  `SubscriptionContext`); the gate only catches them once that runs out.
- Platform admins are never gated.

On the gate screen the admin can either start the R0 Starter checkout directly
("Add card — R0 today" while the trial is running; "Subscribe with card"
after it lapsed, which bills immediately) or jump to `/pricing` to pick a
plan.

### 2. Subscribing during the trial without a card

Not possible — the gate above means every trial org has a card on file. On
`/pricing`, orgs with no `payfast_token` always run hosted checkout (only
reachable if the token was cleared, e.g. after the trial subscription was
cancelled for a mid-trial move to a paid tier):

- **Starter:** `amount = 0.00` (trial still running) — same as flow 1.
- **Growth/Pro:** `amount = recurring_amount = full price`, billed today.
  The ITN treats this as a creation billing the **checkout tier** (the DB row
  may still say `starter`), validates the full price, and activates on that
  tier with `subscription_period_end = now + 1 month`.

### 3. Mid-trial move to Growth/Pro **with** a card on file

This is the "no free days on paid tiers" path. A trial user who captured
their card has a token whose next run date is the trial end date — a plain
amount change would take effect then, handing out free days. So
`POST /api/payfast/change` instead:

1. Cancels the R0 trial subscription at the gateway
   (`PUT /subscriptions/{token}/cancel`; a 404 counts as success so retries
   converge).
2. Clears `payfast_token`/`pending_tier` in the DB.
3. Returns **409**, which the pricing page handles by launching a fresh
   hosted checkout → full price charged immediately, monthly from today.

(The same 409-without-cancel response covers "no subscription on file — use
checkout".)

### 4. Upgrade (paid subscription → higher tier)

`POST /api/payfast/change`:

1. `PATCH /subscriptions/{token}/update` with the new `amount` (cents) — PayFast
   applies it at the next scheduled run (**no proration**; that's PayFast's
   model, and matches the pricing copy).
2. `subscription_tier` updates **immediately** (features switch now),
   `pending_tier` cleared.

### 5. Downgrade

1. Same PayFast amount `PATCH` (bills the lower price from the next run).
2. `pending_tier` is set; **features stay on the current tier** until the
   renewal ITN applies it.
3. That ITN flips `subscription_tier`, clears `pending_tier`, extends the
   period one month from the previous period end, and calls
   `pause_excess_automations(org, new_tier)` — the newest active automation
   rules over the new cap are paused (never deleted).
4. The pricing page shows a downgrade confirmation first, computed from live
   usage (patients / active automations / seats), and states exactly what
   grace will restrict.

**Grace model:** over-limit orgs keep everything they have — nothing is
deleted. While at/over the pending tier's cap, *additions* are frozen by the
`enforce_tier_limits()` trigger (patients, automation_rules,
organisation_members) and by client-side `limitViolation` checks.

### 6. Monthly renewal

Each renewal ITN (`COMPLETE`): extends `subscription_period_end` one month
from the **previous period end** (stable billing anchor), and applies a
pending downgrade if one is scheduled (see flow 5).

The renewal amount is validated against `pending_tier ?? subscription_tier` —
not the tier stamped at checkout — because that's what the subscription is
scheduled to bill.

### 7. Cancel

`POST /api/payfast/cancel` → `PUT /subscriptions/{token}/cancel` at the
gateway, token cleared locally. Access continues until
`subscription_period_end`, then lapses (with the 3-day grace).

## ITN reference (`POST /api/payfast/notify`)

Every notification passes **four checks** before it can change state:

1. **Signature** — MD5 over **every** posted field in received order (blank
   fields included, untrimmed) + passphrase, timing-safe compare.
2. **Source IP** — must resolve to a known PayFast host (cached DNS, 10 min TTL).
3. **Server postback** — payload POSTed back to PayFast `/eng/query/validate`
   must return `VALID`.
4. **Amount** — on `COMPLETE`, `amount_gross` must match the expected tier
   price to the cent: checkout tier for creations, `pending_tier ??
   subscription_tier` for renewals. The R0.00 acceptance applies to Starter
   creations only.

The webhook **always returns 200**; failures are logged, never surfaced.
Idempotency: a partial unique index on `pf_payment_id` makes retried ITNs
apply once (unique violation = already processed).

| payment_status | Effect |
| --- | --- |
| `COMPLETE` + no token | **Creation:** activate org, set `subscription_tier` = checkout tier, `subscription_period_end` = (trial end + 1 month) for the R0 Starter trial setup, else now + 1 month; store token; anchor `run_date` for trial setups |
| `COMPLETE` + token | **Renewal:** extend `subscription_period_end` +1 month from the previous end; apply `pending_tier` if set (with `pause_excess_automations`) |
| `CANCELLED` | Clear `payfast_token`; access continues until `subscription_period_end`, then lapses with 3-day grace |
| anything else (`FAILED`, `PENDING`, …) | Recorded in `payfast_payments` audit log only; a failed renewal simply lets the period lapse |

## Signatures (three different rules)

PayFast uses a different MD5 recipe per surface. Mixing them up produces
"signature mismatch" errors even with correct credentials.

| Surface | Field order | Blank values | Passphrase |
| --- | --- | --- | --- |
| Checkout form (`buildSignature`) | PayFast's **documented attribute order** (`CHECKOUT_FIELD_ORDER`), not post order | Skipped; values trimmed | Appended last; **required** for subscriptions |
| ITN (`validSignature`) | Order received, up to `signature` | **Included** | Appended last |
| Subscription API (`buildApiSignature`) | Alphabetical over headers (`merchant-id`, `version`, `timestamp`) + body fields + `passphrase` | n/a | Sorted in as a field |

All three encode like PHP `urlencode` (spaces → `+`, uppercase hex, `~ ! ' ( ) *`
encoded). The passphrase must match the one set on the **same** PayFast
account (sandbox and live have separate passphrases), and `PAYFAST_SANDBOX`
must match which account the merchant id/key belong to.

## Audit log

`payfast_payments` records every ITN (org, payment ids, token, tier, gross,
status, raw payload). RLS-locked (service role only). The
`pf_payment_id` unique index doubles as the idempotency gate.

## Environment

See `.env.example`. Required: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`,
`PAYFAST_PASSPHRASE` (strongly recommended), `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_APP_URL`, and `PAYFAST_SANDBOX` (defaults to sandbox; set to
`false` only in production).

## Sandbox testing

1. Create a sandbox merchant at <https://sandbox.payfast.co.za> and set
   `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE`.
2. Migrations must be applied (see below — `20260712120000_payfast_billing.sql`
   and `20260912000000_tier_limits.sql`).
3. `NEXT_PUBLIC_APP_URL` must be publicly reachable so PayFast can call the
   ITN. For local dev, tunnel with e.g. `ngrok http 3000` and set the tunnel URL.
4. `npm run dev`, sign in as an org admin, go to `/pricing`, pick a plan.
5. Complete the sandbox payment. PayFast then hits `/api/payfast/notify`.
6. Confirm in Supabase: `organisations.subscription_active = true`, the correct
   `subscription_tier`, and a row in `payfast_payments`.

Test cards and sandbox behaviour: <https://developers.payfast.co.za/docs#sandbox>.
Subscription API reference (amounts in **cents**, `run_date` as `YYYY-MM-DD`):
<https://developers.payfast.co.za/api-docs/subscriptions>.

## Go-live checklist (sandbox → live)

The code needs NO changes to launch — it's an environment swap on Vercel
(Production), followed by a redeploy:

1. `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` — live values from
   my.payfast.io → Settings → Developer Settings.
2. `PAYFAST_PASSPHRASE` — must match the passphrase set on the LIVE account.
3. `PAYFAST_SANDBOX=false` — switches checkout, server-confirmation and the
   subscription API (`testing=true` param) to live.
4. Redeploy (env changes only apply to new deployments).

Before flipping the switch, also:

- **Confirm real prices**: `PLAN_PRICES_ZAR` currently holds R3,500 / R5,000 /
  R7,000. If these aren't the final prices, change them in `src/lib/payfast.ts`
  (and the pricing page copy) — the ITN validates paid amounts against them to
  the cent.
- **Custom domain**: update `NEXT_PUBLIC_APP_URL` (return/cancel/notify URLs
  derive from it) and the Supabase Auth URL configuration.
- The live PayFast account must be verified (FICA) and have subscriptions
  enabled, or checkout will be rejected.

## Migrations

No new migrations are needed for the current billing feature set — everything
below already exists and (per the project TODO) has been applied to both the
local and hosted databases:

- `20260521094500_organisation_auth_tenancy.sql` — `trial_ends_at` (default
  `now() + 14 days`) and org creation on signup.
- `20260712120000_payfast_billing.sql` — `payfast_token`,
  `subscription_period_end`, `pending_tier` on `organisations`;
  `payfast_payments` audit table with the idempotency index.
- `20260912000000_tier_limits.sql` — `tier_limit()`, `enforce_tier_limits()`
  insert gate (patients / automations / seats), `pause_excess_automations()`.
- `20260914000000_subscription_active_default_false.sql` —
  `subscription_active` defaults to FALSE for new orgs (the trial carries
  initial access; the old TRUE default made fresh orgs look like lifetime paid
  subscribers), and `organisation_subscription_state()` treats a NULL
  `subscription_period_end` as "never paid", not "active".

If you change tier limits, edit **both** `src/lib/limits.ts` and
`tier_limit()` in `20260912000000_tier_limits.sql` (a new migration with
`CREATE OR REPLACE FUNCTION` for a hosted DB). If you ever add billing
columns, add them via a new migration — never edit an applied one.
