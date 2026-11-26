# Supabase auth email templates (issue #1)

Branded templates for Supabase Auth emails. They are **not** wired into `supabase/config.toml`,
because that file configures a local Supabase stack shared with other projects.

## Install on the hosted project

Supabase dashboard → Authentication → Emails → Templates. For each template, set the subject
and paste the whole HTML file into the message body:

| Supabase template | Subject | File |
| --- | --- | --- |
| Confirm signup | Confirm your KeptCare account | `confirmation.html` |
| Reset password | Reset your KeptCare password | `recovery.html` |
| Magic link | Your KeptCare sign-in link | `magic_link.html` |
| Change email address | Confirm your new email address | `email_change.html` |
| Invite user | You've been invited to KeptCare | `invite.html` |

## Before these go out from your domain

1. Verify `kept-care.co.za` in Sendexa (SPF + DKIM records; see `docs/sendexa.md`).
2. Supabase → Authentication → Emails → SMTP Settings: enable custom SMTP with Sendexa's SMTP
   relay host, port, username and password (Sendexa dashboard), sender `no-reply@kept-care.co.za`,
   sender name `KeptCare`.
3. Supabase → Authentication → Rate Limits: raise the email limit (the default is very low).
4. Supabase → Authentication → URL Configuration: Site URL `https://www.kept-care.co.za`, and
   redirect URLs for `/dashboard`, `/accept-invite` and `/reset-password` on that domain (issue #2).

Placeholders like `{{ .ConfirmationURL }}`, `{{ .Email }}` and `{{ .NewEmail }}` are filled in by Supabase.
