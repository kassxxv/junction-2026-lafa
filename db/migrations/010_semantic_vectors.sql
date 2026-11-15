-- Meaning search with pgvector: CV lines and requirements as EmbeddingGemma vectors (768 dims).
-- Vectors of candidate text are made only on our own Gemma server (Verda, EU) and only from the
-- de-identified CV (cv_text_blind). They are hints for people ("this line may be related"), never a
-- score: no status, filter or order of candidates is based on them.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS cv_line_vectors (
  candidate_id text NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  line_no      int  NOT NULL,
  embedding    vector(768) NOT NULL,
  PRIMARY KEY (candidate_id, line_no)
);

CREATE TABLE IF NOT EXISTS requirement_vectors (
  requirement_id text PRIMARY KEY REFERENCES requirements(id) ON DELETE CASCADE,
  source         text NOT NULL,          -- the text that was embedded; re-embedded when it changes
  embedding      vector(768) NOT NULL
);
