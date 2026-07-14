# PayFast recurring subscriptions

KeptCare uses [PayFast](https://www.payfast.co.za) for monthly recurring plan
billing (ZAR). This document covers setup, the payment flow, and how to test in
the sandbox.

## Flow

1. An org admin clicks a plan on `/pricing`.
2. The browser calls `POST /api/payfast/checkout` (with the Supabase access token
   in the `Authorization` header). The route builds a **signed** recurring
   subscription request and returns `{ url, fields }`.
3. The browser auto-submits a hidden form to PayFast's hosted checkout.
4. PayFast processes the payment and calls our ITN webhook
   `POST /api/payfast/notify` server-to-server — for the first charge and every
   monthly renewal.
5. The webhook validates the ITN (four checks below) and, on `COMPLETE`, flips
   `organisations.subscription_active`, `subscription_tier`, `subscription_period_end`
   and stores the recurring `payfast_token`.
6. The browser is redirected to `/pricing/success` (or `/pricing/cancelled`).

## The four ITN checks (all must pass)

The webhook never trusts the payload alone:

1. **Signature** — MD5 over the posted fields + passphrase.
2. **Source IP** — must resolve to a known PayFast host.
3. **Server postback** — we POST the payload back to PayFast's `/eng/query/validate`
   and require `VALID`.
4. **Amount** — `amount_gross` must equal the tier's price to the cent.

Idempotency is enforced by a unique index on `pf_payment_id`, so retried ITNs
apply once.

## Prices — ⚠️ placeholders

`src/lib/payfast.ts` `PLAN_PRICES_ZAR` currently holds **placeholder** amounts
(R79 / R149) mirroring the GBP numbers on the pricing page. PayFast is ZAR-only.
Replace these with real ZAR prices before going live — the webhook validates the
paid amount against them.

Note: the pricing page still *displays* `£`. Update the copy in
`src/screens/Pricing.tsx` when final ZAR prices are set.

## Environment

See `.env.example`. Required: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`,
`PAYFAST_PASSPHRASE`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, and
`PAYFAST_SANDBOX` (defaults to sandbox; set to `false` only in production).

## Sandbox testing

1. Create a sandbox merchant at <https://sandbox.payfast.co.za> and set
   `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE`.
2. Apply the migration: `supabase db push` (or run
   `supabase/migrations/20260712120000_payfast_billing.sql`).
3. `NEXT_PUBLIC_APP_URL` must be publicly reachable so PayFast can call the ITN.
   For local dev, tunnel with e.g. `ngrok http 3000` and set the tunnel URL.
4. `npm run dev`, sign in as an org admin, go to `/pricing`, pick Growth or Pro.
5. Complete the sandbox payment. PayFast then hits `/api/payfast/notify`.
6. Confirm in Supabase: `organisations.subscription_active = true`, the correct
   `subscription_tier`, and a row in `payfast_payments`.

## Cancelling

`POST /api/payfast/cancel` cancels the PayFast subscription token via the
management API. Access remains until `subscription_period_end`; only future
charges stop.
