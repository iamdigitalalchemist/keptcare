# KeptCare

Patient CRM for healthcare practices. Next.js App Router + Supabase, payments via PayFast (ZAR).

## Billing model

- **Tiers (ZAR/month):** Starter R3,500 · Growth R5,000 · Pro R7,000. Prices live in `src/lib/payfast.ts` (`PLAN_PRICES_ZAR`) — the public home page and dashboard pricing read from these values.
- **Limits** (patients / automations / seats) live in `src/lib/limits.ts` (`TIER_LIMITS`) and are mirrored by the `enforce_tier_limits()` trigger in `supabase/migrations/20260912000000_tier_limits.sql`. Keep the two in sync.
- **Trial:** applies to the **Starter plan only**. Card captured at signup, R0.00 charged immediately (`amount=0`, `recurring_amount=<plan>`); the ITN webhook (`app/api/payfast/notify`) sets `next_run = trial_ends_at` via the PayFast API so the first full charge lands on day 14 and recurs monthly on that date. Choosing Growth/Pro during the trial bills the full price immediately (no free days).
- **Upgrades:** immediate feature switch; PayFast amount changes via `PUT /subscriptions/{token}` and applies at the next billing date (PayFast has no proration).
- **Downgrades:** `pending_tier` is set; features switch at the period end when the renewal ITN applies it and pauses excess automations (`pause_excess_automations`). Over-limit orgs enter grace: nothing is deleted, additions are frozen.
- **Cancel:** `app/api/payfast/cancel` → `PUT /subscriptions/{token}/cancel`; access continues until `subscription_period_end`.

## PayFast env vars

```
PAYFAST_MERCHANT_ID
PAYFAST_MERCHANT_KEY
PAYFAST_PASSPHRASE      # optional but recommended
PAYFAST_SANDBOX         # defaults to true; set "false" for live
NEXT_PUBLIC_APP_URL     # used for return/cancel/notify URLs
```

Test cards and sandbox behaviour: https://developers.payfast.co.za/docs#sandbox
API calls (amount in **cents**, `next_run` as `YYYY-MM-DD`): https://developers.payfast.co.za/api-docs/subscriptions
