CREATE TABLE career_opportunities (
	id TEXT PRIMARY KEY,
	owner_email TEXT NOT NULL,
	company TEXT NOT NULL,
	role TEXT NOT NULL,
	job_url TEXT,
	stage TEXT NOT NULL CHECK (stage IN ('Interested', 'Researching', 'Applied', 'Contacted', 'Interviewing', 'Offer', 'Closed')),
	next_action TEXT,
	next_action_due TEXT,
	contact TEXT,
	resume_version TEXT,
	notes TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX career_opportunities_owner_stage
	ON career_opportunities (owner_email, stage, updated_at DESC);
CREATE INDEX career_opportunities_owner_due
	ON career_opportunities (owner_email, next_action_due);

CREATE TABLE career_stage_events (
	id TEXT PRIMARY KEY,
	opportunity_id TEXT NOT NULL REFERENCES career_opportunities(id) ON DELETE CASCADE,
	owner_email TEXT NOT NULL,
	from_stage TEXT,
	to_stage TEXT NOT NULL,
	occurred_at TEXT NOT NULL
);

CREATE INDEX career_stage_events_opportunity
	ON career_stage_events (opportunity_id, occurred_at DESC);

CREATE TABLE career_commitments (
	id TEXT PRIMARY KEY,
	owner_email TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('Build', 'Career')),
	text TEXT NOT NULL,
	due_on TEXT,
	status TEXT NOT NULL CHECK (status IN ('Open', 'Done')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX career_commitments_owner_status
	ON career_commitments (owner_email, status, updated_at DESC);

CREATE TABLE career_stories (
	id TEXT PRIMARY KEY,
	owner_email TEXT NOT NULL,
	title TEXT NOT NULL,
	problem TEXT NOT NULL,
	action TEXT NOT NULL,
	outcome TEXT NOT NULL,
	evidence_url TEXT,
	visibility TEXT NOT NULL CHECK (visibility IN ('Private', 'ShareDraft')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX career_stories_owner_updated
	ON career_stories (owner_email, updated_at DESC);
