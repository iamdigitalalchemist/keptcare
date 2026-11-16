# KeptCare P0 launch blockers: status and next steps

> As of 16 November 2026. All code changes are on the local `dev` branch only. **Nothing has been pushed to GitHub or deployed.** The live site is unchanged.

## Summary

| Issue | Code work (done) | Still to do (you) |
| --- | --- | --- |
| #1 Auth emails from own domain | Branded templates for signup, reset password, magic link, change email and invite in `supabase/templates/` | Verify the Sendexa domain, then set up SMTP and paste the templates in Supabase |
| #2 Domain www.kept-care.co.za | No code hard-codes the old domain. Fixed Terms page contact emails (`keptcare.co.za` had no mail server) | Set `NEXT_PUBLIC_APP_URL` in Vercel and the auth URLs in Supabase, then redeploy |
| #3 Merge security branch | Already merged into `main` by Mish. Merged `main` into `dev` and resolved 3 conflicts | Push `dev` and open a PR into `main` when ready |
| #4 Pre-launch cleanup | SQL script to switch off legacy test orgs. `/api/debug-env` kept until #2 is verified | Run the SQL, turn on error monitoring, delete debug-env after #2 |
| #5 Env var docs | Full variable table in `docs/ARCHITECTURE.md` | Update the variables in Vercel |
| #6 Twilio | Not needed: Sendexa replaced Twilio | Close the issue |
| #7 PayFast go-live | Nothing in code | Live credentials and a real-card test |
| #8 Home page claims | Unbuilt features marked "Coming soon"; Twilio and false claims removed | Review the wording on the home page |
| #9 Privacy / POPIA | Policy drafted (`docs/KeptCare Privacy Policy.docx`) | Legal review, fill placeholders, register Information Officer |
| #26 Sendexa | Sending works for SMS, WhatsApp and email, with plan rules and a daily cap | Add funds, connect WhatsApp, get DNS records live |

## What was done, issue by issue

### #1 Auth emails
- Five branded email templates in `supabase/templates/`, with install steps in `supabase/templates/README.md`.
- Not added to `supabase/config.toml`, because that file configures a local Supabase stack shared with your other projects.

### #2 Domain
- Auth and invite links already use whatever domain the visitor is on, and PayFast URLs come from `NEXT_PUBLIC_APP_URL`. No code change needed.
- Terms page: all contact emails and the website link changed from `keptcare.co.za` to `kept-care.co.za`. The old domain has no mail server, so those emails bounced.

### #3 Security branch
- `fix/security-criticals` was already merged into `main`. The gap was the other way: local `dev` was missing those 5 commits.
- Merged `main` into `dev`. Mish's security work and the new messaging both had plan checks, so they were combined into one rule in `src/lib/access.ts`.

### #4 Cleanup
- `supabase/scripts/deactivate-legacy-test-orgs.sql`: step 1 only lists orgs that are marked active but have no PayFast token. Step 2 (switching them off) is commented out and must be run by hand.
- `/api/debug-env` was deleted, then restored: issue #2 needs it to check which app URL production runs with.

### #5 Env vars
- `docs/ARCHITECTURE.md` → Environment variables: every variable, where it is used, whether it is secret, and where the value comes from. Twilio variables are listed for removal.

### #8 Home page
- "Coming soon" on automations, campaigns, automatic alerts, automation rules, campaign messaging and API access.
- Removed Twilio mentions, email open tracking and two-way WhatsApp claims. Team FAQ now says "invite link". Hero dashboard labelled as an example.

### #26 Messaging (Sendexa)
- One send endpoint, `/api/messages/send`, for SMS, WhatsApp and email. Delivery updates arrive on `/api/sendexa/webhook`.
- Rules: user needs the `communications.write` permission; the channel must be in the plan (Starter: email only; WhatsApp: Pro only); SMS and WhatsApp need paid access (never the trial); 500 messages per practice per 24 hours.
- Patient page has SMS, WhatsApp and Email buttons, greyed out with a reason when sending isn't allowed.
- Tested locally up to Sendexa: an email test reached Sendexa and was refused only because the domain isn't verified yet.

### Other fixes along the way
- Patient page crashed when a patient had no date of birth. Fixed for all dates in the app.
- Local dev server now trusts the Windows certificate store, so server calls to Supabase work behind HTTPS inspection.

## Your checklist

### Sendexa (dash.sendexa.co)
- [ ] Add funds to the account.
- [ ] Get the DNS records live for `kept-care.co.za` (they were not yet showing on `ns16.zadns.co.za`): edit the SPF record to `v=spf1 a mx include:_spf.absolutehosting.joburg include:spf.sendexa.co ~all`, and add the DKIM TXT record at `sendexa._domainkey`. Then ask Claude to run verification.
- [ ] Ask Sendexa: do they deliver to South African (+27) numbers? Can they issue a new DKIM key? (Their API exposed the private key.)
- [ ] Request an SMS sender ID, e.g. `KeptCare`, and put it in `SENDEXA_SMS_FROM`.
- [ ] Connect the WhatsApp Business number and get templates approved by Meta.
- [ ] Add the webhook `https://www.kept-care.co.za/api/sendexa/webhook` and generate its secret.

### Supabase
- [ ] Authentication → URL Configuration: Site URL `https://www.kept-care.co.za`, plus redirect URLs for `/dashboard`, `/accept-invite` and `/reset-password`.
- [ ] Once the Sendexa domain is verified: Authentication → Emails → SMTP with Sendexa's SMTP details, sender `no-reply@kept-care.co.za`.
- [ ] Authentication → Emails → Templates: paste the five templates from `supabase/templates/`.
- [ ] Authentication → Rate Limits: raise the email limit.
- [ ] SQL editor (production): run step 1 of `deactivate-legacy-test-orgs.sql`, check the list, then run step 2 with those ids.

### Vercel
- [ ] Set `NEXT_PUBLIC_APP_URL=https://www.kept-care.co.za` (not Sensitive) and redeploy.
- [ ] Add the `SENDEXA_*` variables; delete the `TWILIO_*` ones if present.
- [ ] Re-create public variables as non-Sensitive (see `docs/ARCHITECTURE.md`).
- [ ] Turn on Observability for error monitoring.
- [ ] After deploying, open `/api/debug-env` to confirm the app URL, then have the endpoint deleted.
- [ ] Consider setting the function region to Cape Town (`cpt1`) so patient data is processed in South Africa.

### PayFast (last: real money)
- [ ] Live merchant ID, key and passphrase in Vercel, `PAYFAST_SANDBOX=false`, redeploy.
- [ ] Real-card test with immediate cancel.

### GitHub
- [ ] Push `dev` (it exists only on this computer) and open a PR into `main`.
- [ ] Close #6 (Twilio) and #3 (already merged).

### Privacy and legal
- [ ] Legal review of the privacy policy and fill in its placeholders.
- [ ] Register Johaar Bassier as Information Officer with the Information Regulator.
- [ ] Update Terms §7.3, which says data never leaves South Africa.

## Things to check

- **Which Supabase project is in `.env.local`?** It points at `ejlkumtvhoytlowqrqux`. If that is production, local testing touches real data.
- **New database migration:** the merge brought in `security_hardening`. It is already applied to production; check any other project you test against has it.
- **Not yet confirmed with a real send:** the WhatsApp template format and the delivery webhook format, as Sendexa's docs don't show them.
- **WhatsApp on Growth (#27):** assigned to Creative-Nerd; still only on Pro in the code.
