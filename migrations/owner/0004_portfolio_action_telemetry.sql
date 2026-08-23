PRAGMA defer_foreign_keys = true;

CREATE TABLE telemetry_events_next (
	id TEXT PRIMARY KEY NOT NULL,
	owner_email TEXT NOT NULL,
	event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'workspace_view', 'web_vital', 'error', 'contact_action', 'portfolio_action')),
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

INSERT INTO telemetry_events_next (
	id,
	owner_email,
	event_type,
	recorded_at,
	path,
	workspace,
	referrer_host,
	country,
	device_class,
	browser_family,
	viewport_width,
	viewport_height,
	timezone_offset_minutes,
	language,
	metric_name,
	metric_value,
	session_hash,
	visit_hash
)
SELECT
	id,
	owner_email,
	event_type,
	recorded_at,
	path,
	workspace,
	referrer_host,
	country,
	device_class,
	browser_family,
	viewport_width,
	viewport_height,
	timezone_offset_minutes,
	language,
	metric_name,
	metric_value,
	session_hash,
	visit_hash
FROM telemetry_events;

DROP TABLE telemetry_events;
ALTER TABLE telemetry_events_next RENAME TO telemetry_events;

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

PRAGMA defer_foreign_keys = false;
