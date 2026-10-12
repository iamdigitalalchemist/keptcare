# keptcare — TODO

## Launch blockers
- [ ] Supabase Auth URL config (Dashboard → Auth → URL Configuration): set Site URL to `https://keptcare.vercel.app` and add redirect URLs for `/dashboard`, `/accept-invite`, `/reset-password` (+ `http://localhost:3000/**` for dev). Fixes welcome/confirmation emails redirecting to `localhost:3000`.
- [ ] Set real ZAR prices in `PLAN_PRICES_ZAR` (`src/lib/payfast.ts`) — ITN validates paid amounts against these
- [ ] PayFast go-live env swap on Vercel (live merchant id/key/passphrase, `PAYFAST_SANDBOX=false`) — see "Go-live checklist" in `docs/payfast.md`

## Security criticals (pinned 2026-10-12 — plan agreed, not started)
Client talks to Supabase directly, so RLS/grants are the only enforcement.
- [ ] **Billing self-grant:** `organisations` UPDATE policy lets org admins/managers set `subscription_tier`/`subscription_active`/`subscription_period_end`/`payfast_token` from the browser. Fix: `REVOKE INSERT, UPDATE, DELETE ON organisations FROM authenticated, anon; GRANT UPDATE (name, email, logo_url, phone, website) TO authenticated;` (only columns Settings.tsx writes; admin RPCs + ITN unaffected).
- [ ] **Role escalation:** drop `FOR ALL` write policies on `organisation_members` and `organisation_invitations` (client only uses SECURITY DEFINER RPCs); validate `_role_id` belongs to the org in `create_organisation_invitation` / `add_organisation_member_by_email` / `accept_organisation_invitation`; only `roles.manage` holders may grant `org_admin`; `has_org_permission` must require `role.organisation_id = om.organisation_id`; block `platform.*` keys in `role_permissions`.
- [ ] **`/api/sms/send` unguarded:** require `communications.write`, active access (shared helper with SubscriptionContext/ProtectedRoute), tier channel includes `sms`; per-org daily cap. Open question: block SMS on Starter trial, or give a small allowance?
- [ ] Related: R0 trial setup sets `subscription_period_end = trial_end + 1 month` before any charge → ~6 weeks free if day-14 charge fails. Set it to `trial_ends_at` instead.
- [ ] Verify locally (`supabase start`) by attempting each exploit as manager/admin; `supabase db push` only after sign-off. Check hosted DB for orgs whose `subscription_tier` doesn't match their latest `payfast_payments` row.

## Infrastructure
- [ ] Set up custom domain on Vercel (then update `NEXT_PUBLIC_APP_URL` + Supabase auth URLs)

## SMS (Twilio)
- [ ] Add Twilio env vars to Vercel Production (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`) — see `docs/twilio.md`. SID/token are in local `.env`; a sender still needs to be chosen.
- [x] Wire a "Send SMS" action in the UI (e.g. PatientDetail) to `POST /api/sms/send` — Send SMS button on PatientDetail opens `SendSmsDialog` (free-form or SMS template with live preview, consent/phone gating)

## Done
- [x] Twilio migration applied to local + hosted DB
- [x] PayFast migrations applied to local + hosted DB
- [x] Tier-limits migration (`20260912000000`) pushed to hosted DB — it had been missed; `enforce_tier_limits` is now live in production
- [x] `subscription_active` default-false migration (`20260914000000`) applied to hosted DB
- [x] Vercel prod env fixed (Supabase URL/key were empty) + PayFast sandbox creds
- [x] Subscription expiry enforcement (`subscription_period_end` + 3-day grace)
- [x] Mandatory card-capture gate (ProtectedRoute) — no app access without a `payfast_token`; `TrialCardBanner` removed
- [x] Mid-trial upgrade to Growth/Pro bills immediately (cancel trial sub + re-checkout); ITN creation amount check validates checkout tier
- [x] Send SMS action on PatientDetail (`SendSmsDialog` → `POST /api/sms/send`)
