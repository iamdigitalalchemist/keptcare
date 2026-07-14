# Twilio SMS integration

Sends patient SMS notifications through the Twilio REST API and records every
send in `communication_logs`, with delivery state kept up to date by a status
webhook.

## Pieces

- `src/lib/twilio.ts` — config loading, E.164 phone normalisation (SA-first),
  `{{variable}}` template rendering, the Twilio send call, status mapping, and
  webhook signature validation. Unit-tested in `src/lib/twilio.test.ts`.
- `app/api/sms/send/route.ts` — authenticated send endpoint.
- `app/api/sms/status/route.ts` — Twilio status callback; verifies
  `X-Twilio-Signature` and updates the log row by message SID.
- `supabase/migrations/20260714100000_twilio_sms.sql` — adds `body`,
  `provider_message_sid`, and `error_message` to `communication_logs`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Account SID from the Twilio console |
| `TWILIO_AUTH_TOKEN` | Auth token; also verifies status webhooks |
| `TWILIO_MESSAGING_SERVICE_SID` | Preferred sender: a Messaging Service SID (`MG...`) |
| `TWILIO_FROM_NUMBER` | Alternative sender: a specific Twilio number in E.164 |
| `NEXT_PUBLIC_APP_URL` | Public base URL; used to build the status-callback URL |

Set either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`. Without
`NEXT_PUBLIC_APP_URL` messages still send but no delivery updates arrive.

## Sending

`POST /api/sms/send` with the Supabase access token as a bearer token (same
pattern as the PayFast checkout — see `Pricing.tsx`).

Free-form message:

```json
{ "patientId": "<uuid>", "message": "Hi, your results are ready." }
```

From a stored SMS template, with optional extra variables:

```json
{ "patientId": "<uuid>", "templateId": "<uuid>", "variables": { "appointment_date": "21 July" } }
```

`patient_name`, `first_name`, `last_name`, and `practice_name` are filled in
automatically from the patient and organisation; anything in `variables`
overrides them. Unknown `{{placeholders}}` are left visible in the text rather
than silently dropped.

Guards: the patient must belong to the caller's organisation, must have
`consent_sms` set, and must have a phone number that normalises to E.164
(local `0XX...` numbers are treated as South African, `+27`).

Responds with `{ sid, status, logId }`. The send is recorded in
`communication_logs` with `status = 'sent'` and the Twilio SID in
`provider_message_sid`.

## Delivery updates

Twilio posts to `/api/sms/status` as the message progresses. Statuses map to
the log's allowed values: queued/sending/sent → `sent`, delivered/read →
`delivered`, undelivered/failed/canceled → `failed` (with `error_message` set
to the Twilio error code). Requests failing signature validation are rejected
with 403; out-of-order callbacks never downgrade a terminal status back to
`sent`.

No Twilio console configuration is needed for this webhook — the callback URL
is passed per-message via `StatusCallback`.

## Local testing

Twilio can't reach localhost, so delivery updates need a tunnel (e.g.
`ngrok http 3000`) with `NEXT_PUBLIC_APP_URL` pointed at the tunnel URL.
Plain sends work without one. A trial Twilio account can only message
verified numbers.
