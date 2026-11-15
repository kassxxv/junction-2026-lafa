-- Plain-language explanation of a requirement for event organisers (Gemini, company data only).
-- Stored with the wording it explains, so an edited requirement gets a fresh explanation.
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS glossary jsonb;
