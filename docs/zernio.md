# Zernio messaging (SMS, WhatsApp, email)

Patient messages go out through [Zernio](https://docs.zernio.com/quickstart).
Every send is recorded in `communication_logs`, and a signed webhook keeps the
delivery status up to date. Zernio replaced Twilio here, before Twilio went live.

## Pieces

- `src/lib/zernio.ts`: REST calls for the three channels, plain text to HTML
  for email, webhook signature check, and event mapping. Tested in
  `src/lib/zernio.test.ts`.
- `app/api/messages/send/route.ts`: the authenticated send endpoint for all channels.
- `app/api/zernio/webhook/route.ts`: delivery webhook. It checks
  `X-Zernio-Signature` and updates the log row by message id.
- `src/components/SendMessageDialog.tsx` + `src/lib/send-message.ts`: the
  SMS / WhatsApp / Email buttons on PatientDetail.
- Phone numbers are normalised by `normalizePhone` in `src/lib/twilio.ts`.
  Local `0XX…` numbers are treated as South African (+27).
- The log columns (`body`, `provider_message_sid`, `error_message`) come from
  `supabase/migrations/20260714100000_twilio_sms.sql`, so no new migration is needed.

## Zernio setup

1. Create an API key in the Zernio dashboard. It starts with `sk_`, and Zernio
   shows it only once.
2. **SMS:** buy or port a number with SMS turned on, or register a sender ID.
3. **WhatsApp:** connect the practice's WhatsApp Business number with
   `GET /v1/connect/whatsapp`, or use the sandbox for testing
   (https://docs.zernio.com/platforms/whatsapp/sandbox). Note the `accountId`.
   Get your templates approved by Meta.
4. **Email:** connect the practice mailbox (Gmail / Outlook OAuth with the
   `email` scope, or IMAP through `GET /v1/connect/email`). Note the `accountId`.
   Gmail or IMAP sending needs a payment method on the Zernio workspace.
5. **Webhook:** add the endpoint `https://<app>/api/zernio/webhook` with a
   `secret` you choose, subscribed to `message.delivered`, `message.read` and
   `message.failed`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `ZERNIO_API_KEY` | API key, required for every channel |
| `ZERNIO_SMS_FROM` | SMS sender: a Zernio number in E.164 form, or a sender ID |
| `ZERNIO_WHATSAPP_ACCOUNT_ID` | Connected WhatsApp account id |
| `ZERNIO_WHATSAPP_LANGUAGE` | Template language code, default `en` |
| `ZERNIO_EMAIL_ACCOUNT_ID` | Connected mailbox account id |
| `ZERNIO_WEBHOOK_SECRET` | Must match the secret on the Zernio webhook |

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
- **Email:** the body is sent as escaped HTML with line breaks kept. A template's
  `subject` is rendered with the same variables.
- **Guards:** the patient must belong to the caller's organisation and have
  consent for the channel (`consent_sms` / `consent_whatsapp` / `consent_email`).
  They also need a valid phone number (E.164) or email address.

The response is `{ id, status, logId }`. The Zernio message id is stored in
`provider_message_sid`.

## Delivery webhook

`message.delivered` and `message.read` set the status to `delivered`.
`message.failed` sets it to `failed` and fills `error_message`. Other events,
and test events, are acknowledged and ignored.

**Unverified:** Zernio's docs don't publish the payload for delivery events. The
route reads the message id from `message.id` or `message.messageId`. Send a
test event from the dashboard and confirm before relying on it.
