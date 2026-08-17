PRAGMA defer_foreign_keys = true;

CREATE TABLE telemetry_events (
	id TEXT PRIMARY KEY NOT NULL,
	owner_email TEXT NOT NULL,
	event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'workspace_view', 'web_vital', 'error')),
	recorded_at TEXT NOT NULL,
	path TEXT NOT NULL,
	workspace TEXT,
	referrer_host TEXT,
	country TEXT,
	device_class TEXT,
	browser_family TEXT,
	viewport_width INTEGER,
	viewport_height INTEGER,
	timezone_offset_minutes INTEGER,
	language TEXT,
	metric_name TEXT,
	metric_value REAL,
	session_hash TEXT,
	visit_hash TEXT
);

CREATE INDEX idx_telemetry_owner_recorded
	ON telemetry_events (owner_email, recorded_at DESC);

CREATE INDEX idx_telemetry_owner_path
	ON telemetry_events (owner_email, path);

CREATE INDEX idx_telemetry_owner_workspace
	ON telemetry_events (owner_email, workspace);

CREATE INDEX idx_telemetry_owner_country
	ON telemetry_events (owner_email, country);

CREATE INDEX idx_telemetry_owner_metric
	ON telemetry_events (owner_email, metric_name);
