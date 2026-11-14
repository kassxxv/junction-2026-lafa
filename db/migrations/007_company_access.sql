-- Company sign-in by invitation code, and reminders after the meetings.
-- Only a hash of the code is stored; the code itself is shown once to the organiser (or, in the demo, written
-- in lib/matchready/demo.ts). contact_email is where reminders go (synthetic in the demo).
ALTER TABLE companies ADD COLUMN invite_code_hash text;
ALTER TABLE companies ADD COLUMN contact_email text;
CREATE UNIQUE INDEX companies_invite_code_idx ON companies (invite_code_hash);
ALTER TABLE applications ADD COLUMN reminder_sent_at timestamptz;   -- reminder e-mails after the meeting
