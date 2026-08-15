PRAGMA defer_foreign_keys = true;

CREATE TABLE owner_projects (
	id TEXT PRIMARY KEY NOT NULL,
	owner_email TEXT NOT NULL,
	slug TEXT NOT NULL,
	name TEXT NOT NULL,
	description TEXT NOT NULL,
	lifecycle TEXT NOT NULL CHECK (lifecycle IN ('Active', 'Paused', 'Archived', 'Reviewing')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	UNIQUE (owner_email, slug)
);

CREATE INDEX idx_owner_projects_owner_updated
	ON owner_projects (owner_email, updated_at DESC);

CREATE TABLE owner_project_resources (
	id TEXT PRIMARY KEY NOT NULL,
	project_id TEXT NOT NULL,
	owner_email TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('GitHubRepository', 'CloudflareWorker', 'D1Database', 'KVNamespace', 'R2Bucket', 'Domain')),
	environment TEXT NOT NULL CHECK (environment IN ('Production', 'Staging', 'Development', 'Shared')),
	provider_id TEXT NOT NULL,
	display_name TEXT NOT NULL,
	canonical_url TEXT NOT NULL,
	created_at TEXT NOT NULL,
	FOREIGN KEY (project_id) REFERENCES owner_projects(id) ON DELETE CASCADE,
	UNIQUE (owner_email, kind, provider_id)
);

CREATE INDEX idx_owner_project_resources_project
	ON owner_project_resources (project_id, kind, display_name);
