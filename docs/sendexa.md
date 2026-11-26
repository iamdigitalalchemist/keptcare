# Sendexa messaging (SMS, WhatsApp, email)

Patient messages go out through [Sendexa](https://docs.sendexa.co/). Every
send is recorded in `communication_logs`, and a signed webhook keeps the
delivery status up to date. Sendexa replaced Zernio, which had replaced Twilio;
neither went live.

## Pieces

- `src/lib/sendexa.ts`: REST calls for the three channels, plain text to HTML
  for email, webhook signature check, and status mapping. Tested in
  `src/lib/sendexa.test.ts`.
- `app/api/messages/send/route.ts`: the authenticated send endpoint for all channels.
- `app/api/sendexa/webhook/route.ts`: delivery webhook. It checks `X-Signature`
  and updates the log row by `messageId`.
- `src/components/SendMessageDialog.tsx` + `src/lib/send-message.ts`: the
  SMS / WhatsApp / Email buttons on PatientDetail.
- Phone numbers are normalised by `normalizePhone` in `src/lib/twilio.ts`
  (local `0XX…` numbers are treated as South African, +27). The leading `+` is
  stripped before sending, which is the format Sendexa uses.
- The log columns (`body`, `provider_message_sid`, `error_message`) come from
  `supabase/migrations/20260714100000_twilio_sms.sql`, so no new migration is needed.

There's no SDK dependency: Sendexa's Node SDK isn't published on npm, so the
code calls the REST API with `fetch`.

## Sendexa setup (https://dash.sendexa.co)

1. **API token:** go to Settings → API Keys and click **Copy Token**. It's a
   ready-made Base64 token, so don't re-encode it. The key needs send scopes
   (including `email.write` for email).
2. **SMS:** register a sender ID under Sender ID. Sends fail with
   `SENDER_ID_NOT_APPROVED` until it's approved.
3. **WhatsApp:** connect the practice's WhatsApp Business number and get your
   templates approved by Meta.
4. **Email (Examail, beta):** verify the practice's sending domain. Sends from
   an unverified domain fail with `DOMAIN_NOT_VERIFIED`.
5. **Webhook:** go to Settings → Webhooks, add `https://<app>/api/sendexa/webhook`,
   select the SMS, WhatsApp and email delivery events, and click **Generate Secret**.
6. **Coverage:** every example in Sendexa's docs uses Ghana numbers. Confirm with
   Sendexa that they deliver to South African numbers before going live.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SENDEXA_API_TOKEN` | Base64 token from the dashboard, required for every channel |
| `SENDEXA_SMS_FROM` | Approved SMS sender ID |
| `SENDEXA_EMAIL_FROM` | Sender address on a verified domain, e.g. `hello@practice.co.za` |
| `SENDEXA_WHATSAPP_LANGUAGE` | Template language code, default `en` |
| `SENDEXA_WEBHOOK_SECRET` | The secret generated for the webhook |

A channel with missing variables returns `500 "<channel> is not configured"`,
and the server log names the missing variables. The other channels keep working.

## Sending

`POST /api/messages/send`, with the Supabase access token as a bearer token.

```json
{ "channel": "sms", "patientId": "<uuid>", "message": "Hi, your results are ready." }
{ "channel": "email", "patientId": "<uuid>", "subject": "Results", "message": "Hi…" }
{ "channel": "whatsapp", "patientId": "<uuid>", "templateId": "<uuid>", "variables": { "appointment_date": "21 July" } }
```

- `patient_name`, `first_name`, `last_name` and `practice_name` are filled in
  automatically. Values in `variables` override them.
- **WhatsApp is template-only.** The stored template's `name` must exactly match
  the Meta-approved template name. Its `variables` list, in order, fills `{{1}}`,
  `{{2}}`, and so on.
- **Email:** sent as escaped HTML plus a plain-text copy. A template's `subject`
  is rendered with the same variables.
- **Guards:** the patient must belong to the caller's organisation and have
  consent for the channel. They also need a valid phone number or email address.

The response is `{ id, status, logId }`. Sendexa's `messageId` is stored in
`provider_message_sid`.

## Delivery webhook

Delivered, read, opened and clicked events set the status to `delivered`.
Failed, expired, bounced and spam events set it to `failed`. Queued and sent
events are ignored.

**Unverified (check with a real send):**
- Sendexa's docs show both a flat payload (`{ messageId, status }`) and
  `{ event, data }`. The route accepts either.
- The docs don't show the request format for WhatsApp templates. The code uses
  the Meta Cloud API format (`template.name`, `language.code`,
  `components[].parameters`).
