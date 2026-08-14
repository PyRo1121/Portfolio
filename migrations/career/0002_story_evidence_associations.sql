PRAGMA defer_foreign_keys = true;

CREATE TABLE career_story_evidence (
  story_id TEXT PRIMARY KEY NOT NULL,
  owner_email TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source = 'GitHub'),
  artifact_kind TEXT NOT NULL CHECK (artifact_kind IN ('PullRequest', 'Issue', 'Release')),
  artifact_title TEXT NOT NULL,
  repository TEXT NOT NULL,
  url TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  FOREIGN KEY (story_id) REFERENCES career_stories(id) ON DELETE CASCADE
);

CREATE INDEX idx_career_story_evidence_owner
  ON career_story_evidence(owner_email, observed_at DESC);
