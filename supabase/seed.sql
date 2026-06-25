-- Seed local development data from src/lib/dummy-data.ts.
-- This project currently has database tables for patients and appointments.

DO $$
DECLARE
  target_organisation_id UUID;
  target_user_id UUID;
BEGIN
  SELECT organisation_id, user_id
  INTO target_organisation_id, target_user_id
  FROM public.organisation_members
  WHERE status = 'active'
  ORDER BY created_at
  LIMIT 1;

  IF target_organisation_id IS NULL OR target_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot seed dummy data without an active organisation member.';
  END IF;

  DELETE FROM public.loyalty_member_rewards
  WHERE id IN (
    '00000000-0000-4000-8008-000000000001',
    '00000000-0000-4000-8008-000000000002',
    '00000000-0000-4000-8008-000000000003',
    '00000000-0000-4000-8008-000000000004',
    '00000000-0000-4000-8008-000000000005',
    '00000000-0000-4000-8008-000000000006'
  );

  DELETE FROM public.referral_records
  WHERE id IN (
    '00000000-0000-4000-8009-000000000001',
    '00000000-0000-4000-8009-000000000002',
    '00000000-0000-4000-8009-000000000003',
    '00000000-0000-4000-8009-000000000004',
    '00000000-0000-4000-8009-000000000005'
  );

  DELETE FROM public.loyalty_members
  WHERE id IN (
    '00000000-0000-4000-8007-000000000001',
    '00000000-0000-4000-8007-000000000002',
    '00000000-0000-4000-8007-000000000003',
    '00000000-0000-4000-8007-000000000004',
    '00000000-0000-4000-8007-000000000005',
    '00000000-0000-4000-8007-000000000006',
    '00000000-0000-4000-8007-000000000007'
  );

  DELETE FROM public.loyalty_rewards
  WHERE id IN (
    '00000000-0000-4000-8006-000000000001',
    '00000000-0000-4000-8006-000000000002',
    '00000000-0000-4000-8006-000000000003',
    '00000000-0000-4000-8006-000000000004',
    '00000000-0000-4000-8006-000000000005'
  );

  DELETE FROM public.alerts
  WHERE id IN (
    '00000000-0000-4000-8005-000000000001',
    '00000000-0000-4000-8005-000000000002',
    '00000000-0000-4000-8005-000000000003',
    '00000000-0000-4000-8005-000000000004',
    '00000000-0000-4000-8005-000000000005'
  );

  DELETE FROM public.campaigns
  WHERE id IN (
    '00000000-0000-4000-8004-000000000001',
    '00000000-0000-4000-8004-000000000002',
    '00000000-0000-4000-8004-000000000003'
  );

  DELETE FROM public.automation_rules
  WHERE id IN (
    '00000000-0000-4000-8003-000000000001',
    '00000000-0000-4000-8003-000000000002',
    '00000000-0000-4000-8003-000000000003',
    '00000000-0000-4000-8003-000000000004'
  );

  DELETE FROM public.communication_logs
  WHERE id IN (
    '00000000-0000-4000-8002-000000000001',
    '00000000-0000-4000-8002-000000000002',
    '00000000-0000-4000-8002-000000000003',
    '00000000-0000-4000-8002-000000000004',
    '00000000-0000-4000-8002-000000000005',
    '00000000-0000-4000-8002-000000000006',
    '00000000-0000-4000-8002-000000000007'
  );

  DELETE FROM public.message_templates
  WHERE id IN (
    '00000000-0000-4000-8010-000000000001',
    '00000000-0000-4000-8010-000000000002',
    '00000000-0000-4000-8010-000000000003',
    '00000000-0000-4000-8010-000000000004',
    '00000000-0000-4000-8010-000000000005'
  );

  DELETE FROM public.patient_segments
  WHERE id IN (
    '00000000-0000-4000-8011-000000000001',
    '00000000-0000-4000-8011-000000000002',
    '00000000-0000-4000-8011-000000000003',
    '00000000-0000-4000-8011-000000000004',
    '00000000-0000-4000-8011-000000000005',
    '00000000-0000-4000-8011-000000000006',
    '00000000-0000-4000-8011-000000000007'
  );

  DELETE FROM public.appointments
  WHERE id IN (
    '00000000-0000-4000-8001-000000000001',
    '00000000-0000-4000-8001-000000000002',
    '00000000-0000-4000-8001-000000000003',
    '00000000-0000-4000-8001-000000000004',
    '00000000-0000-4000-8001-000000000005',
    '00000000-0000-4000-8001-000000000006',
    '00000000-0000-4000-8001-000000000007',
    '00000000-0000-4000-8001-000000000008',
    '00000000-0000-4000-8001-000000000009'
  )
  OR patient_id IN (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000009',
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000012'
  );

  DELETE FROM public.patients
  WHERE id IN (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000009',
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000012'
  )
  OR email IN (
    'sarah.m@email.com',
    'jcooper@email.com',
    'emma.w@email.com',
    'dchen@email.com',
    'lisa.p@email.com',
    'mark.t@email.com',
    'anna.g@email.com',
    'rbrown@email.com',
    'sophie.t@email.com',
    'mjohnson@email.com',
    'rachel.k@email.com',
    'twilson@email.com'
  );

  INSERT INTO public.patients (
    id,
    organisation_id,
    user_id,
    first_name,
    last_name,
    email,
    phone,
    date_of_birth,
    gender,
    last_visit,
    next_appointment,
    visit_count,
    status,
    tags,
    consent_sms,
    consent_email,
    consent_whatsapp,
    notes,
    revenue
  )
  VALUES
    ('00000000-0000-4000-8000-000000000001', target_organisation_id, target_user_id, 'Sarah', 'Mitchell', 'sarah.m@email.com', '+44 7700 900123', '1985-03-14', 'female', '2024-11-15', '2025-04-02', 12, 'active', ARRAY['regular', 'dental-plan'], TRUE, TRUE, FALSE, 'Prefers morning appointments', 2400),
    ('00000000-0000-4000-8000-000000000002', target_organisation_id, target_user_id, 'James', 'Cooper', 'jcooper@email.com', '+44 7700 900456', '1972-08-22', 'male', '2024-06-03', NULL, 5, 'overdue', ARRAY['high-value'], TRUE, TRUE, TRUE, 'Crown replacement scheduled', 4800),
    ('00000000-0000-4000-8000-000000000003', target_organisation_id, target_user_id, 'Emma', 'Williams', 'emma.w@email.com', '+44 7700 900789', '1990-12-01', 'female', '2025-01-20', '2025-03-28', 8, 'active', ARRAY['regular'], TRUE, TRUE, TRUE, '', 1600),
    ('00000000-0000-4000-8000-000000000004', target_organisation_id, target_user_id, 'David', 'Chen', 'dchen@email.com', '+44 7700 900321', '1968-05-30', 'male', '2024-03-10', NULL, 3, 'inactive', ARRAY[]::TEXT[], FALSE, TRUE, FALSE, 'Moved areas, may not return', 600),
    ('00000000-0000-4000-8000-000000000005', target_organisation_id, target_user_id, 'Lisa', 'Patel', 'lisa.p@email.com', '+44 7700 900654', '1995-07-18', 'female', '2025-02-14', '2025-05-10', 15, 'active', ARRAY['regular', 'high-value', 'dental-plan'], TRUE, TRUE, TRUE, 'VIP patient, family of 4 all registered', 6200),
    ('00000000-0000-4000-8000-000000000006', target_organisation_id, target_user_id, 'Mark', 'Thompson', 'mark.t@email.com', '+44 7700 900987', '1980-11-25', 'male', '2024-09-05', NULL, 7, 'overdue', ARRAY['follow-up-needed'], TRUE, TRUE, FALSE, 'Root canal follow-up overdue', 3100),
    ('00000000-0000-4000-8000-000000000007', target_organisation_id, target_user_id, 'Anna', 'Garcia', 'anna.g@email.com', '+44 7700 900111', '1988-02-09', 'female', '2025-03-01', '2025-06-15', 20, 'active', ARRAY['regular', 'high-value'], TRUE, TRUE, TRUE, 'Orthodontic treatment ongoing', 8500),
    ('00000000-0000-4000-8000-000000000008', target_organisation_id, target_user_id, 'Robert', 'Brown', 'rbrown@email.com', '+44 7700 900222', '1955-09-12', 'male', '2024-12-18', '2025-04-20', 25, 'active', ARRAY['regular', 'elderly-care'], FALSE, TRUE, FALSE, 'Denture maintenance every 4 months', 5400),
    ('00000000-0000-4000-8000-000000000009', target_organisation_id, target_user_id, 'Sophie', 'Taylor', 'sophie.t@email.com', '+44 7700 900333', '1992-04-05', 'female', '2024-07-22', NULL, 2, 'inactive', ARRAY['new-patient'], TRUE, FALSE, FALSE, 'Only came for emergency visit', 350),
    ('00000000-0000-4000-8000-000000000010', target_organisation_id, target_user_id, 'Michael', 'Johnson', 'mjohnson@email.com', '+44 7700 900444', '1978-01-30', 'male', '2025-02-28', '2025-03-30', 10, 'active', ARRAY['dental-plan'], TRUE, TRUE, TRUE, 'Whitening treatment completed', 2900),
    ('00000000-0000-4000-8000-000000000011', target_organisation_id, target_user_id, 'Rachel', 'Kim', 'rachel.k@email.com', '+44 7700 900555', '1983-06-17', 'female', '2024-10-30', NULL, 6, 'overdue', ARRAY['follow-up-needed'], TRUE, TRUE, TRUE, 'Implant review overdue', 7200),
    ('00000000-0000-4000-8000-000000000012', target_organisation_id, target_user_id, 'Tom', 'Wilson', 'twilson@email.com', '+44 7700 900666', '2000-10-08', 'male', '2025-03-10', '2025-09-10', 4, 'active', ARRAY['young-adult'], TRUE, TRUE, TRUE, 'Wisdom teeth monitoring', 800);

  INSERT INTO public.appointments (
    id,
    organisation_id,
    user_id,
    patient_id,
    appointment_date,
    type,
    status,
    notes
  )
  VALUES
    ('00000000-0000-4000-8001-000000000001', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000001', '2024-11-15', 'Check-up', 'completed', 'Doctor: Dr. Harris. All clear, next check-up in 6 months'),
    ('00000000-0000-4000-8001-000000000002', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000001', '2024-05-10', 'Cleaning', 'completed', 'Doctor: Dr. Harris. Routine cleaning completed'),
    ('00000000-0000-4000-8001-000000000003', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000001', '2025-04-02', 'Check-up', 'scheduled', 'Doctor: Dr. Harris.'),
    ('00000000-0000-4000-8001-000000000004', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000002', '2024-06-03', 'Crown Prep', 'completed', 'Doctor: Dr. Patel. Temporary crown placed'),
    ('00000000-0000-4000-8001-000000000005', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000002', '2024-07-15', 'Crown Fitting', 'missed', 'Doctor: Dr. Patel. Patient did not attend'),
    ('00000000-0000-4000-8001-000000000006', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000003', '2025-01-20', 'Filling', 'completed', 'Doctor: Dr. Harris. Composite filling on lower molar'),
    ('00000000-0000-4000-8001-000000000007', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000005', '2025-02-14', 'Check-up', 'completed', 'Doctor: Dr. Patel. Excellent oral health'),
    ('00000000-0000-4000-8001-000000000008', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000006', '2024-09-05', 'Root Canal', 'completed', 'Doctor: Dr. Patel. Follow-up needed in 4 weeks'),
    ('00000000-0000-4000-8001-000000000009', target_organisation_id, target_user_id, '00000000-0000-4000-8000-000000000007', '2025-03-01', 'Orthodontic Review', 'completed', 'Doctor: Dr. Harris. Braces adjustment, good progress');

  INSERT INTO public.message_templates (
    id,
    organisation_id,
    name,
    channel,
    subject,
    body,
    variables
  )
  VALUES
    ('00000000-0000-4000-8010-000000000001', target_organisation_id, 'We Miss You', 'sms', NULL, 'Hi {{patient_name}}, it''s been a while since your last visit at {{practice_name}}. We''d love to see you! Book your appointment today: {{booking_link}}', ARRAY['patient_name', 'practice_name', 'booking_link']),
    ('00000000-0000-4000-8010-000000000002', target_organisation_id, 'Missed Appointment', 'email', 'We missed you, {{patient_name}}!', E'Dear {{patient_name}},\n\nWe noticed you missed your appointment on {{appointment_date}} with {{doctor_name}}. We understand things come up!\n\nPlease call us or visit {{booking_link}} to reschedule at a time that suits you.\n\nBest regards,\n{{practice_name}}', ARRAY['patient_name', 'appointment_date', 'doctor_name', 'practice_name', 'booking_link']),
    ('00000000-0000-4000-8010-000000000003', target_organisation_id, 'Post-Procedure Check', 'sms', NULL, 'Hi {{patient_name}}, just checking in after your {{procedure_name}} on {{procedure_date}}. How are you feeling? If you have any concerns, please call us on {{practice_phone}}.', ARRAY['patient_name', 'procedure_name', 'procedure_date', 'practice_phone']),
    ('00000000-0000-4000-8010-000000000004', target_organisation_id, 'Check-up Reminder', 'email', 'Time for your check-up, {{patient_name}}!', E'Dear {{patient_name}},\n\nIt''s been 6 months since your last check-up. Regular dental visits are key to maintaining great oral health.\n\nBook your next appointment: {{booking_link}}\n\nSee you soon!\n{{practice_name}}', ARRAY['patient_name', 'practice_name', 'booking_link']),
    ('00000000-0000-4000-8010-000000000005', target_organisation_id, 'Appointment Confirmation', 'whatsapp', NULL, 'Hi {{patient_name}} 👋 Your appointment with {{doctor_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Reply YES to confirm or call us to reschedule.', ARRAY['patient_name', 'doctor_name', 'appointment_date', 'appointment_time']);

  INSERT INTO public.communication_logs (
    id,
    organisation_id,
    patient_id,
    channel,
    subject,
    status,
    sent_at
  )
  VALUES
    ('00000000-0000-4000-8002-000000000001', target_organisation_id, '00000000-0000-4000-8000-000000000001', 'sms', 'Appointment reminder', 'delivered', '2025-03-20 09:00:00+00'),
    ('00000000-0000-4000-8002-000000000002', target_organisation_id, '00000000-0000-4000-8000-000000000001', 'email', 'Happy New Year from the practice', 'opened', '2025-01-05 09:00:00+00'),
    ('00000000-0000-4000-8002-000000000003', target_organisation_id, '00000000-0000-4000-8000-000000000002', 'sms', 'Missed appointment follow-up', 'delivered', '2024-07-16 09:00:00+00'),
    ('00000000-0000-4000-8002-000000000004', target_organisation_id, '00000000-0000-4000-8000-000000000002', 'email', 'Reschedule your appointment', 'sent', '2024-08-01 09:00:00+00'),
    ('00000000-0000-4000-8002-000000000005', target_organisation_id, '00000000-0000-4000-8000-000000000005', 'whatsapp', 'Appointment confirmation', 'delivered', '2025-02-10 09:00:00+00'),
    ('00000000-0000-4000-8002-000000000006', target_organisation_id, '00000000-0000-4000-8000-000000000006', 'sms', 'Follow-up reminder', 'delivered', '2024-10-05 09:00:00+00'),
    ('00000000-0000-4000-8002-000000000007', target_organisation_id, '00000000-0000-4000-8000-000000000006', 'email', 'Overdue follow-up notice', 'opened', '2024-11-01 09:00:00+00');

  INSERT INTO public.automation_rules (
    id,
    organisation_id,
    name,
    trigger_type,
    trigger_value,
    trigger_unit,
    action_type,
    template_id,
    active,
    patients_affected,
    last_triggered
  )
  VALUES
    ('00000000-0000-4000-8003-000000000001', target_organisation_id, 'Inactive Patient Recall', 'no_visit', 6, 'months', 'sms', '00000000-0000-4000-8010-000000000001', TRUE, 3, '2025-03-15'),
    ('00000000-0000-4000-8003-000000000002', target_organisation_id, 'Missed Appointment Follow-up', 'missed_appointment', 1, 'days', 'email', '00000000-0000-4000-8010-000000000002', TRUE, 1, '2025-03-10'),
    ('00000000-0000-4000-8003-000000000003', target_organisation_id, 'Post-Procedure Check-in', 'follow_up_due', 2, 'weeks', 'sms', '00000000-0000-4000-8010-000000000003', TRUE, 2, '2025-03-01'),
    ('00000000-0000-4000-8003-000000000004', target_organisation_id, '6-Month Check-up Reminder', 'checkup_due', 6, 'months', 'email', '00000000-0000-4000-8010-000000000004', FALSE, 8, NULL);

  INSERT INTO public.campaigns (
    id,
    organisation_id,
    name,
    status,
    channel,
    template_id,
    segment,
    recipient_count,
    sent_count,
    open_rate,
    scheduled_date,
    sent_date
  )
  VALUES
    ('00000000-0000-4000-8004-000000000001', target_organisation_id, 'Annual Check-up Drive', 'sent', 'email', '00000000-0000-4000-8010-000000000004', 'Patients due for check-up', 45, 45, 62, NULL, '2025-03-01'),
    ('00000000-0000-4000-8004-000000000002', target_organisation_id, 'Spring Whitening Offer', 'scheduled', 'sms', '00000000-0000-4000-8010-000000000001', 'Active patients', 120, 0, 0, '2025-04-01', NULL),
    ('00000000-0000-4000-8004-000000000003', target_organisation_id, 'Inactive Patient Recall', 'draft', 'email', '00000000-0000-4000-8010-000000000002', 'Inactive > 6 months', 28, 0, 0, NULL, NULL);

  INSERT INTO public.alerts (
    id,
    organisation_id,
    patient_id,
    patient_name,
    type,
    message,
    alert_date,
    read
  )
  VALUES
    ('00000000-0000-4000-8005-000000000001', target_organisation_id, '00000000-0000-4000-8000-000000000002', 'James Cooper', 'missed_appointment', 'Missed crown fitting appointment on Jul 15', '2024-07-15', FALSE),
    ('00000000-0000-4000-8005-000000000002', target_organisation_id, '00000000-0000-4000-8000-000000000006', 'Mark Thompson', 'overdue_visit', 'Root canal follow-up overdue by 5 months', '2025-03-01', FALSE),
    ('00000000-0000-4000-8005-000000000003', target_organisation_id, '00000000-0000-4000-8000-000000000011', 'Rachel Kim', 'overdue_visit', 'Implant review overdue by 4 months', '2025-03-01', FALSE),
    ('00000000-0000-4000-8005-000000000004', target_organisation_id, '00000000-0000-4000-8000-000000000007', 'Anna Garcia', 'high_value', 'High-value patient completed 20th visit', '2025-03-01', TRUE),
    ('00000000-0000-4000-8005-000000000005', target_organisation_id, '00000000-0000-4000-8000-000000000002', 'James Cooper', 'follow_up', 'Crown replacement still pending — contact patient', '2025-03-15', FALSE);

  INSERT INTO public.loyalty_rewards (
    id,
    organisation_id,
    name,
    points_cost,
    description,
    category
  )
  VALUES
    ('00000000-0000-4000-8006-000000000001', target_organisation_id, 'Free Cleaning', 500, 'Complimentary dental cleaning session', 'free_service'),
    ('00000000-0000-4000-8006-000000000002', target_organisation_id, '20% Off Whitening', 300, '20% discount on teeth whitening', 'discount'),
    ('00000000-0000-4000-8006-000000000003', target_organisation_id, 'Priority Booking', 200, 'Skip the queue for your next 3 appointments', 'priority'),
    ('00000000-0000-4000-8006-000000000004', target_organisation_id, 'Electric Toothbrush', 800, 'Premium electric toothbrush kit', 'gift'),
    ('00000000-0000-4000-8006-000000000005', target_organisation_id, '£50 Treatment Credit', 1000, '£50 off any treatment', 'discount');

  INSERT INTO public.loyalty_members (
    id,
    organisation_id,
    patient_id,
    points,
    lifetime_points,
    tier,
    current_streak,
    longest_streak,
    referral_count,
    referral_points,
    last_points_earned,
    joined_at
  )
  VALUES
    ('00000000-0000-4000-8007-000000000001', target_organisation_id, '00000000-0000-4000-8000-000000000005', 1450, 3200, 'gold', 8, 12, 3, 450, '2025-02-14', '2023-06-01'),
    ('00000000-0000-4000-8007-000000000002', target_organisation_id, '00000000-0000-4000-8000-000000000007', 2100, 4500, 'platinum', 14, 14, 5, 750, '2025-03-01', '2022-09-15'),
    ('00000000-0000-4000-8007-000000000003', target_organisation_id, '00000000-0000-4000-8000-000000000008', 980, 2800, 'silver', 5, 10, 1, 150, '2024-12-18', '2021-03-20'),
    ('00000000-0000-4000-8007-000000000004', target_organisation_id, '00000000-0000-4000-8000-000000000001', 620, 1400, 'silver', 4, 6, 2, 300, '2024-11-15', '2023-01-10'),
    ('00000000-0000-4000-8007-000000000005', target_organisation_id, '00000000-0000-4000-8000-000000000003', 340, 680, 'bronze', 3, 3, 0, 0, '2025-01-20', '2024-04-01'),
    ('00000000-0000-4000-8007-000000000006', target_organisation_id, '00000000-0000-4000-8000-000000000010', 510, 1100, 'bronze', 2, 5, 1, 150, '2025-02-28', '2023-08-15'),
    ('00000000-0000-4000-8007-000000000007', target_organisation_id, '00000000-0000-4000-8000-000000000012', 180, 180, 'bronze', 2, 2, 0, 0, '2025-03-10', '2024-10-01');

  INSERT INTO public.loyalty_member_rewards (
    id,
    organisation_id,
    loyalty_member_id,
    reward_id,
    claimed,
    claimed_at
  )
  VALUES
    ('00000000-0000-4000-8008-000000000001', target_organisation_id, '00000000-0000-4000-8007-000000000001', '00000000-0000-4000-8006-000000000001', TRUE, '2024-11-20'),
    ('00000000-0000-4000-8008-000000000002', target_organisation_id, '00000000-0000-4000-8007-000000000001', '00000000-0000-4000-8006-000000000002', FALSE, NULL),
    ('00000000-0000-4000-8008-000000000003', target_organisation_id, '00000000-0000-4000-8007-000000000002', '00000000-0000-4000-8006-000000000004', TRUE, '2025-01-10'),
    ('00000000-0000-4000-8008-000000000004', target_organisation_id, '00000000-0000-4000-8007-000000000002', '00000000-0000-4000-8006-000000000005', FALSE, NULL),
    ('00000000-0000-4000-8008-000000000005', target_organisation_id, '00000000-0000-4000-8007-000000000003', '00000000-0000-4000-8006-000000000003', FALSE, NULL),
    ('00000000-0000-4000-8008-000000000006', target_organisation_id, '00000000-0000-4000-8007-000000000006', '00000000-0000-4000-8006-000000000001', FALSE, NULL);

  INSERT INTO public.referral_records (
    id,
    organisation_id,
    referrer_id,
    referrer_name,
    referred_name,
    referred_email,
    status,
    points_awarded,
    created_at
  )
  VALUES
    ('00000000-0000-4000-8009-000000000001', target_organisation_id, '00000000-0000-4000-8000-000000000005', 'Lisa Patel', 'Tom Wilson', 'twilson@email.com', 'first_visit', 150, '2024-09-20 09:00:00+00'),
    ('00000000-0000-4000-8009-000000000002', target_organisation_id, '00000000-0000-4000-8000-000000000007', 'Anna Garcia', 'Sophie Taylor', 'sophie.t@email.com', 'registered', 100, '2024-08-10 09:00:00+00'),
    ('00000000-0000-4000-8009-000000000003', target_organisation_id, '00000000-0000-4000-8000-000000000007', 'Anna Garcia', 'Daniel Lee', 'dlee@email.com', 'first_visit', 150, '2024-05-01 09:00:00+00'),
    ('00000000-0000-4000-8009-000000000004', target_organisation_id, '00000000-0000-4000-8000-000000000001', 'Sarah Mitchell', 'Katie Hughes', 'katie.h@email.com', 'pending', 0, '2025-03-01 09:00:00+00'),
    ('00000000-0000-4000-8009-000000000005', target_organisation_id, '00000000-0000-4000-8000-000000000005', 'Lisa Patel', 'Omar Ahmed', 'omar.a@email.com', 'expired', 0, '2024-01-15 09:00:00+00');

  INSERT INTO public.patient_segments (
    id,
    organisation_id,
    name,
    description,
    type,
    groups,
    group_logic,
    patient_count,
    last_updated,
    is_system
  )
  VALUES
    ('00000000-0000-4000-8011-000000000001', target_organisation_id, 'High-Value Active', 'Active patients with revenue > £3000', 'revenue', '[{"id":"g1","logic":"AND","conditions":[{"id":"c1","field":"status","operator":"equals","value":"active"},{"id":"c2","field":"revenue","operator":"greater_than","value":3000}]}]'::jsonb, 'AND', 3, '2025-03-25', TRUE),
    ('00000000-0000-4000-8011-000000000002', target_organisation_id, 'At-Risk Patients', 'Overdue patients with no upcoming appointment', 'behavioral', '[{"id":"g2","logic":"AND","conditions":[{"id":"c3","field":"status","operator":"equals","value":"overdue"},{"id":"c4","field":"nextAppointment","operator":"equals","value":"null"}]}]'::jsonb, 'AND', 3, '2025-03-25', TRUE),
    ('00000000-0000-4000-8011-000000000003', target_organisation_id, 'Frequent Visitors', 'Patients with 10+ visits', 'behavioral', '[{"id":"g3","logic":"AND","conditions":[{"id":"c5","field":"visitCount","operator":"greater_than","value":10}]}]'::jsonb, 'AND', 4, '2025-03-25', TRUE),
    ('00000000-0000-4000-8011-000000000004', target_organisation_id, 'Young Adults', 'Patients aged 18-30', 'demographic', '[{"id":"g4","logic":"AND","conditions":[{"id":"c6","field":"age","operator":"between","value":"18-30"}]}]'::jsonb, 'AND', 2, '2025-03-20', FALSE),
    ('00000000-0000-4000-8011-000000000005', target_organisation_id, 'Dormant Patients', 'Inactive patients with low visit count', 'behavioral', '[{"id":"g5","logic":"AND","conditions":[{"id":"c7","field":"status","operator":"equals","value":"inactive"},{"id":"c8","field":"visitCount","operator":"less_than","value":4}]}]'::jsonb, 'AND', 2, '2025-03-18', FALSE),
    ('00000000-0000-4000-8011-000000000006', target_organisation_id, 'SMS-Opted Dental Plan', 'Patients on dental plan who accept SMS', 'custom', '[{"id":"g6a","logic":"AND","conditions":[{"id":"c9","field":"tags","operator":"contains","value":"dental-plan"},{"id":"c10","field":"consentSms","operator":"equals","value":"true"}]}]'::jsonb, 'AND', 3, '2025-03-15', FALSE),
    ('00000000-0000-4000-8011-000000000007', target_organisation_id, 'WhatsApp Reachable', 'Active patients with WhatsApp consent', 'custom', '[{"id":"g7","logic":"AND","conditions":[{"id":"c11","field":"status","operator":"equals","value":"active"},{"id":"c12","field":"consentWhatsapp","operator":"equals","value":"true"}]}]'::jsonb, 'AND', 5, '2025-03-22', FALSE);
END $$;
