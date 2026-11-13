# keptcare — TODO

## Launch blockers
- [ ] Supabase Auth URL config (Dashboard → Auth → URL Configuration): set Site URL to `https://keptcare.vercel.app` and add redirect URLs for `/dashboard`, `/accept-invite`, `/reset-password` (+ `http://localhost:3000/**` for dev). Fixes welcome/confirmation emails redirecting to `localhost:3000`.
- [ ] Set real ZAR prices in `PLAN_PRICES_ZAR` (`src/lib/payfast.ts`) — ITN validates paid amounts against these
- [ ] PayFast go-live env swap on Vercel (live merchant id/key/passphrase, `PAYFAST_SANDBOX=false`) — see "Go-live checklist" in `docs/payfast.md`

## Infrastructure
- [ ] Set up custom domain on Vercel (then update `NEXT_PUBLIC_APP_URL` + Supabase auth URLs)

## Messaging (Zernio — SMS, WhatsApp, email)
- [ ] Zernio account setup: API key, SMS number/sender ID, WhatsApp account + approved templates, practice mailbox — see `docs/zernio.md`
- [ ] Add Zernio env vars to Vercel Production (`ZERNIO_API_KEY`, `ZERNIO_SMS_FROM`, `ZERNIO_WHATSAPP_ACCOUNT_ID`, `ZERNIO_EMAIL_ACCOUNT_ID`, `ZERNIO_WEBHOOK_SECRET`)
- [ ] Register `/api/zernio/webhook` in Zernio and confirm the delivery-event payload fields (route assumes `message.id`)
- [ ] Remove Twilio env vars from local `.env` / Vercel (Twilio replaced by Zernio)
- [x] SMS / WhatsApp / Email buttons on PatientDetail → `SendMessageDialog` → `POST /api/messages/send`

## Done
- [x] Twilio migration applied to local + hosted DB
- [x] PayFast migrations applied to local + hosted DB
- [x] Tier-limits migration (`20260912000000`) pushed to hosted DB — it had been missed; `enforce_tier_limits` is now live in production
- [x] `subscription_active` default-false migration (`20260914000000`) applied to hosted DB
- [x] Vercel prod env fixed (Supabase URL/key were empty) + PayFast sandbox creds
- [x] Subscription expiry enforcement (`subscription_period_end` + 3-day grace)
- [x] Mandatory card-capture gate (ProtectedRoute) — no app access without a `payfast_token`; `TrialCardBanner` removed
- [x] Mid-trial upgrade to Growth/Pro bills immediately (cancel trial sub + re-checkout); ITN creation amount check validates checkout tier
- [x] Send SMS action on PatientDetail (now `SendMessageDialog` → `POST /api/messages/send`)
