-- The CV as organisers may see it: personal details (name, e-mail, phone, links, address, birth date,
-- nationality) are cut out by code when the document is uploaded. Review screens read only this column;
-- cv_text (the original) stays for the candidate and for Gemma.
ALTER TABLE candidate_documents ADD COLUMN cv_text_blind text;
