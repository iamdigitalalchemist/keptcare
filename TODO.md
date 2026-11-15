# keptcare — TODO

## Launch blockers
- [ ] Supabase Auth URL config (Dashboard → Auth → URL Configuration): set Site URL to `https://www.kept-care.co.za` (issue #2) and add redirect URLs for `/dashboard`, `/accept-invite`, `/reset-password` (+ `http://localhost:3000/**` for dev). Fixes welcome/confirmation emails redirecting to `localhost:3000`.
- [ ] Set real ZAR prices in `PLAN_PRICES_ZAR` (`src/lib/payfast.ts`) — ITN validates paid amounts against these
- [ ] PayFast go-live env swap on Vercel (live merchant id/key/passphrase, `PAYFAST_SANDBOX=false`) — see "Go-live checklist" in `docs/payfast.md`

## Security criticals (fixed on branch `fix/security-criticals`, 2026-10-12)
- [x] Migration `20261012000000_security_hardening.sql` applied to prod (2026-10-12) and verified (grants, policies, functions, triggers; platform admins intact)
- [ ] Merge `fix/security-criticals` (includes `fix/payfast-signatures`) to `main` after a sandbox checkout passes on the preview
- [x] Platform-admin self-grant via user metadata → app metadata only
- [x] Billing columns not writable from the browser (column grants)
- [x] Manager → admin escalation (members/invitations read-only from browser, role checks in RPCs, same-org roles only, no platform.* perms)
- [x] Tier caps also enforced on re-activation (automations, members)
- [x] `/api/messages/send` (was `/api/sms/send`): `communications.write`, channel must be in the tier, SMS/WhatsApp paid only (no trial), 500/24h cap; UI buttons gated
- [x] ITN: trial setup period end = trial end; superseded-token ITNs (incl. CANCELLED) recorded but not applied
- [x] Checkout 409 when a subscription exists; plan change compares against the active tier (downgrade cancel supported)
- [ ] Legacy prod rows: the 4 test orgs have `subscription_active = true` with no payment (old default). Harmless (no period end ⇒ no paid access) but worth resetting to false.

## Infrastructure
- [ ] Set up custom domain on Vercel (then update `NEXT_PUBLIC_APP_URL` + Supabase auth URLs)

## Messaging (Sendexa — SMS, WhatsApp, email)
- [ ] Sendexa account setup: API token, approved SMS sender ID, WhatsApp number + approved templates, verified email domain — see `docs/sendexa.md`
- [ ] Confirm Sendexa delivers to South African (+27) numbers — docs examples are all Ghana (+233)
- [ ] Add Sendexa env vars to Vercel Production (`SENDEXA_API_TOKEN`, `SENDEXA_SMS_FROM`, `SENDEXA_EMAIL_FROM`, `SENDEXA_WEBHOOK_SECRET`)
- [ ] Register `/api/sendexa/webhook` in Sendexa and confirm the delivery-event payload (route accepts `{ messageId, status }` or `{ event, data: { messageId } }`)
- [ ] Confirm the WhatsApp template request shape with a real send (assumed Meta Cloud API format)
- [ ] Remove Twilio env vars from Vercel if any were added (Twilio replaced)
