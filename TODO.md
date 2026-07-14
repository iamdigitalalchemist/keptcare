# keptcare — TODO

## Infrastructure
- [ ] Set up custom domain on Vercel
- [ ] Update Supabase auth redirect URLs to custom domain (currently pointing to Vercel preview URL)

## Auth
- [ ] Fix welcome email redirect URL (currently redirects to `localhost:3000`)

## SMS (Twilio)
- [ ] Add Twilio env vars to Vercel + `.env.local` (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`) — see `docs/twilio.md`
- [ ] Apply migration `20260714100000_twilio_sms.sql` to the linked Supabase project (`supabase db push`)
- [ ] Wire a "Send SMS" action in the UI (e.g. PatientDetail) to `POST /api/sms/send`
