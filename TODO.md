# keptcare — TODO

## Launch blockers
- [ ] Supabase Auth URL config (Dashboard → Auth → URL Configuration): set Site URL to `https://keptcare.vercel.app` and add redirect URLs for `/dashboard`, `/accept-invite`, `/reset-password` (+ `http://localhost:3000/**` for dev). Fixes welcome/confirmation emails redirecting to `localhost:3000`.
- [ ] Set real ZAR prices in `PLAN_PRICES_ZAR` (`src/lib/payfast.ts`) — ITN validates paid amounts against these
- [ ] PayFast go-live env swap on Vercel (live merchant id/key/passphrase, `PAYFAST_SANDBOX=false`) — see "Go-live checklist" in `docs/payfast.md`

## Infrastructure
- [ ] Set up custom domain on Vercel (then update `NEXT_PUBLIC_APP_URL` + Supabase auth URLs)

## SMS (Twilio)
- [ ] Add Twilio env vars to Vercel Production (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`) — see `docs/twilio.md`. SID/token are in local `.env`; a sender still needs to be chosen.
- [ ] Wire a "Send SMS" action in the UI (e.g. PatientDetail) to `POST /api/sms/send`

## Done
- [x] Twilio migration applied to local + hosted DB
- [x] PayFast migrations applied to local + hosted DB
- [x] Vercel prod env fixed (Supabase URL/key were empty) + PayFast sandbox creds
- [x] Subscription expiry enforcement (`subscription_period_end` + 3-day grace)
