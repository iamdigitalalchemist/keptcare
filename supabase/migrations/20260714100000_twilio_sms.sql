-- Twilio SMS integration: track message content and delivery state on
-- communication_logs so the /api/sms/status webhook can update rows by the
-- Twilio message SID.

ALTER TABLE public.communication_logs
  ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_message_sid TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_communication_logs_provider_message_sid
  ON public.communication_logs (provider_message_sid)
  WHERE provider_message_sid IS NOT NULL;
