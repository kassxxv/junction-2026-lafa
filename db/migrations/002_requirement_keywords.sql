-- Words that identify a requirement in a CV (e.g. {optical, photonic, testing}).
-- Written by the AI draft step or by hand; used by code to find evidence, never to score.
ALTER TABLE requirements ADD COLUMN keywords text[] NOT NULL DEFAULT '{}';
