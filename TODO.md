# keptcare — TODO

## Launch blockers
- [ ] Supabase Auth URL config (Dashboard → Auth → URL Configuration): set Site URL to `https://keptcare.vercel.app` and add redirect URLs for `/dashboard`, `/accept-invite`, `/reset-password` (+ `http://localhost:3000/**` for dev). Fixes welcome/confirmation emails redirecting to `localhost:3000`.
- [ ] Set real ZAR prices in `PLAN_PRICES_ZAR` (`src/lib/payfast.ts`) — ITN validates paid amounts against these
- [ ] PayFast go-live env swap on Vercel (live merchant id/key/passphrase, `PAYFAST_SANDBOX=false`) — see "Go-live checklist" in `docs/payfast.md`

## Infrastructure
- [ ] Set up custom domain on Vercel (then update `NEXT_PUBLIC_APP_URL` + Supabase auth URLs)

## Messaging (Sendexa — SMS, WhatsApp, email)
- [ ] Sendexa account setup: API token, approved SMS sender ID, WhatsApp number + approved templates, verified email domain — see `docs/sendexa.md`
- [ ] Confirm Sendexa delivers to South African (+27) numbers — docs examples are all Ghana (+233)
- [ ] Add Sendexa env vars to Vercel Production (`SENDEXA_API_TOKEN`, `SENDEXA_SMS_FROM`, `SENDEXA_EMAIL_FROM`, `SENDEXA_WEBHOOK_SECRET`)
- [ ] Register `/api/sendexa/webhook` in Sendexa and confirm the delivery-event payload (route accepts `{ messageId, status }` or `{ event, data: { messageId } }`)
- [ ] Confirm the WhatsApp template request shape with a real send (assumed Meta Cloud API format)
- [ ] Remove Twilio env vars from Vercel if any were added (Twilio replaced)
