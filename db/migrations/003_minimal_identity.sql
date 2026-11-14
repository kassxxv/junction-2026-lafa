-- Minimal personal data: stage 1 asks only for an email. The name is optional.
ALTER TABLE candidate_identity ALTER COLUMN full_name DROP NOT NULL;
