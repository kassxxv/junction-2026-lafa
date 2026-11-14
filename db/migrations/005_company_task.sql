-- Optional task from the company (mentor input, 2026-11-14). The candidate applies it to their own past
-- work and walks the company through the answer at the start of the meeting. Nobody scores it
-- automatically: organisers may read it when they decide, like any other stated fact.
ALTER TABLE company_cards ADD COLUMN task text;           -- NULL = the company set no task
ALTER TABLE applications  ADD COLUMN task_answer text;    -- the candidate's own words, kept as sent
