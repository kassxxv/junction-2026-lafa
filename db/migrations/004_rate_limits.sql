-- Counters for abuse limits (lib/rate-limit.ts). No personal data: `client` is a keyed hash of an
-- IP address ('*' = everyone, for the daily cap), and rows older than two days are deleted.
CREATE TABLE rate_limit_hits (
  bucket       text        NOT NULL,   -- e.g. 'companyDraft', 'documentParse'
  client       text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         int         NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, client, window_start)
);
