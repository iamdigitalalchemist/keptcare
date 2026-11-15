# KeptCare architecture notes

## Environment variables

This is the source of truth for environment variables. Vercel shows variables marked
**Sensitive** as `*****`, and `vercel env pull` returns them empty, so nobody can read them
back from Vercel. If a value is lost, get it again from the source in the table.

**Names only. Never put values in this file.**

| Variable | Used by | Environments | Sensitive | Where the value comes from |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server Supabase clients | Production, Preview, Development | No (public) | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client | Production, Preview, Development | No (public) | Supabase → Project Settings → API Keys → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client (`src/integrations/supabase/admin.ts`) — bypasses RLS | Production, Preview, Development | **Yes** | Supabase → Project Settings → API Keys → Secret key (`sb_secret_…`) or legacy `service_role` |
| `NEXT_PUBLIC_APP_URL` | PayFast return / cancel / notify URLs | Production, Preview, Development | No (public) | The site's public URL, e.g. `https://www.kept-care.co.za`. Baked in at build time: redeploy after changing it |
| `PAYFAST_MERCHANT_ID` | PayFast checkout, cancel, API calls | Production, Preview, Development | No (public) | PayFast dashboard → Settings → Developer settings |
| `PAYFAST_MERCHANT_KEY` | PayFast checkout | Production, Preview, Development | **Yes** | PayFast dashboard → Settings → Developer settings |
| `PAYFAST_PASSPHRASE` | Signing PayFast requests, verifying ITNs | Production, Preview, Development | **Yes** | PayFast dashboard → Settings → Developer settings (set it there first) |
| `PAYFAST_SANDBOX` | Switches PayFast between sandbox and live | Production, Preview, Development | No | `true` for sandbox, `false` for live. Production goes live via issue #7 |
| `SENDEXA_API_TOKEN` | All Sendexa sends (`src/lib/sendexa.ts`) | Production, Preview, Development | **Yes** | Sendexa dashboard → Settings → API Keys → Copy Token (already Base64, don't re-encode) |
| `SENDEXA_SMS_FROM` | SMS sender | Production, Preview, Development | No | Sendexa dashboard → Sender ID (must be approved) |
| `SENDEXA_EMAIL_FROM` | Email sender address | Production, Preview, Development | No | An address on a domain verified in Sendexa, e.g. `hello@kept-care.co.za` |
| `SENDEXA_WHATSAPP_LANGUAGE` | WhatsApp template language (optional, default `en`) | Production, Preview, Development | No | Language code of your approved templates |
| `SENDEXA_WEBHOOK_SECRET` | Verifying `/api/sendexa/webhook` | Production (and Preview if it has a webhook) | **Yes** | Sendexa dashboard → Settings → Webhooks → Generate Secret |

Only five values are true secrets and stay Sensitive: `SUPABASE_SERVICE_ROLE_KEY`,
`PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `SENDEXA_API_TOKEN` and `SENDEXA_WEBHOOK_SECRET`.
Everything else is public or harmless, so keep it as a plain variable that can be read back.

### To remove

| Variable | Why |
| --- | --- |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_FROM_NUMBER` | Twilio was replaced by Sendexa. Nothing sends through Twilio any more; delete them from Vercel if they were added. |

### Local development

- `.env.local` holds local values and is git-ignored. It needs at least the Supabase variables;
  add the PayFast and Sendexa ones to test checkout or messaging.
- Add a Vercel **Development** environment pointing at a dev Supabase project, so
  `vercel env pull .env.local` works (Sensitive isn't allowed in Development, so values pull).
- The local dev server started from Claude Code sets `NODE_OPTIONS=--use-system-ca`
  (`.claude/launch.json`) so Node trusts the Windows certificate store. Running `npm run dev`
  yourself behind HTTPS inspection needs the same: `$env:NODE_OPTIONS="--use-system-ca"`.
