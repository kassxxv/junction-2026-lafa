-- The candidate's own statement whether an AI tool helped with the task answer. Transparency instead of
-- AI-text detection (unreliable and unfair to non-native writers): shown to organisers as stated, never scored.
ALTER TABLE applications ADD COLUMN task_ai_used boolean NOT NULL DEFAULT false;
