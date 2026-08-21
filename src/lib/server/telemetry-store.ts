import type { D1Database } from '@cloudflare/workers-types';
import { Effect, Schema } from 'effect';
import {
	TelemetryEventTypeSchema,
	type TelemetryEvent,
	type TelemetryPayload
} from '$lib/domain/telemetry';
import type { TelemetryTotals } from '$lib/domain/telemetry-view';

/** Expected D1 telemetry failure boundary. */
export class TelemetryStoreError extends Error {
	readonly _tag = 'TelemetryStoreError';

	constructor(
		readonly operation: 'delete' | 'insert' | 'load',
		override readonly cause: unknown
	) {
		super(`telemetry ${operation} failed`);
		this.name = 'TelemetryStoreError';
	}
}

/** Client payload plus server-derived evidence added at the edge. */
export type TelemetryEventInput = TelemetryPayload & { readonly country: string | null };

const TelemetryTotalsRowSchema = Schema.Struct({
	total_events: Schema.Number,
	page_views: Schema.Number,
	workspace_views: Schema.Number,
	unique_sessions: Schema.Number,
	page_view_sessions: Schema.Number,
	performance_sessions: Schema.Number,
	contact_actions: Schema.Number,
	contact_sessions: Schema.Number,
	email_clicks: Schema.Number,
	linkedin_clicks: Schema.Number,
	error_count: Schema.Number,
	last_recorded_at: Schema.NullOr(Schema.String)
});

const TelemetryRowSchema = Schema.Struct({
	id: Schema.String,
	owner_email: Schema.String,
	event_type: TelemetryEventTypeSchema,
	recorded_at: Schema.String,
	path: Schema.String,
	workspace: Schema.NullOr(Schema.String),
	referrer_host: Schema.NullOr(Schema.String),
	country: Schema.NullOr(Schema.String),
	device_class: Schema.NullOr(Schema.String),
	browser_family: Schema.NullOr(Schema.String),
	viewport_width: Schema.NullOr(Schema.Number),
	viewport_height: Schema.NullOr(Schema.Number),
	timezone_offset_minutes: Schema.NullOr(Schema.Number),
	language: Schema.NullOr(Schema.String),
	metric_name: Schema.NullOr(Schema.String),
	metric_value: Schema.NullOr(Schema.Number),
	session_hash: Schema.NullOr(Schema.String),
	visit_hash: Schema.NullOr(Schema.String)
});

export function telemetryTotalsFromRow(
	row: Schema.Schema.Type<typeof TelemetryTotalsRowSchema>
): TelemetryTotals {
	return {
		totalEvents: row.total_events,
		pageViews: row.page_views,
		workspaceViews: row.workspace_views,
		uniqueSessions: row.unique_sessions,
		pageViewSessions: row.page_view_sessions,
		performanceSessions: row.performance_sessions,
		contactActions: row.contact_actions,
		contactSessions: row.contact_sessions,
		emailClicks: row.email_clicks,
		linkedinClicks: row.linkedin_clicks,
		errorCount: row.error_count,
		lastRecordedAt: row.last_recorded_at
	};
}

export function telemetryEventFromRow(
	row: Schema.Schema.Type<typeof TelemetryRowSchema>
): TelemetryEvent {
	return {
		id: row.id,
		ownerEmail: row.owner_email,
		eventType: row.event_type,
		recordedAt: row.recorded_at,
		path: row.path,
		workspace: row.workspace,
		referrerHost: row.referrer_host,
		country: row.country,
		deviceClass: row.device_class,
		browserFamily: row.browser_family,
		viewportWidth: row.viewport_width,
		viewportHeight: row.viewport_height,
		timezoneOffsetMinutes: row.timezone_offset_minutes,
		language: row.language,
		metricName: row.metric_name,
		metricValue: row.metric_value,
		sessionHash: row.session_hash,
		visitHash: row.visit_hash
	};
}

type TelemetryVariantColumns = {
	readonly workspace: string | null;
	readonly referrerHost: string | null;
	readonly metricName: string | null;
	readonly metricValue: number | null;
};

function telemetryVariantColumns(input: TelemetryPayload): TelemetryVariantColumns {
	switch (input.eventType) {
		case 'page_view':
			return {
				workspace: null,
				referrerHost: input.referrerHost ?? null,
				metricName: null,
				metricValue: null
			};
		case 'workspace_view':
			return {
				workspace: input.workspace,
				referrerHost: null,
				metricName: null,
				metricValue: null
			};
		case 'web_vital':
		case 'error':
			return {
				workspace: null,
				referrerHost: null,
				metricName: input.metricName,
				metricValue: input.metricValue
			};
		case 'contact_action':
			return {
				workspace: null,
				referrerHost: null,
				metricName: input.action,
				metricValue: 1
			};
		default: {
			const exhaustive: never = input;
			return exhaustive;
		}
	}
}

/** Build the owner-scoped deletion used to enforce the telemetry retention window. */
export function telemetryRetentionQuery(
	ownerEmail: string,
	before: Date
): { readonly sql: string; readonly binds: ReadonlyArray<string> } {
	return {
		sql: `DELETE FROM telemetry_events
		      WHERE owner_email = ? AND recorded_at < ?`,
		binds: [ownerEmail, before.toISOString()]
	};
}

/** Delete telemetry rows older than the configured retention boundary. */
export function deleteExpiredTelemetryEvents(
	database: D1Database,
	ownerEmail: string,
	before: Date
): Effect.Effect<number, TelemetryStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const query = telemetryRetentionQuery(ownerEmail, before);
			const result = await database
				.prepare(query.sql)
				.bind(...query.binds)
				.run();
			return result.meta.changes;
		},
		catch: (cause) => new TelemetryStoreError('delete', cause)
	});
}

/** Persist one enriched telemetry event. */
export function insertTelemetryEvent(
	database: D1Database,
	ownerEmail: string,
	input: TelemetryEventInput,
	now: Date
): Effect.Effect<void, TelemetryStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const columns = telemetryVariantColumns(input);
			await database
				.prepare(
					`INSERT INTO telemetry_events (
						id, owner_email, event_type, recorded_at, path, workspace,
						referrer_host, country, device_class, browser_family,
						viewport_width, viewport_height, timezone_offset_minutes, language,
						metric_name, metric_value, session_hash, visit_hash
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					input.eventId,
					ownerEmail,
					input.eventType,
					now.toISOString(),
					input.path,
					columns.workspace,
					columns.referrerHost,
					input.country ?? null,
					input.deviceClass ?? null,
					input.browserFamily ?? null,
					input.viewportWidth ?? null,
					input.viewportHeight ?? null,
					input.timezoneOffsetMinutes ?? null,
					input.language ?? null,
					columns.metricName,
					columns.metricValue,
					input.sessionHash ?? null,
					input.visitHash ?? null
				)
				.run();
		},
		catch: (cause) => new TelemetryStoreError('insert', cause)
	});
}

/** Complete totals plus a bounded detailed-event window. */
export type TelemetryEventWindow = {
	readonly totals: TelemetryTotals;
	readonly events: ReadonlyArray<TelemetryEvent>;
	readonly truncated: boolean;
};

/** Load telemetry events recorded after a cutoff, newest first. */
export function loadTelemetryEvents(
	database: D1Database,
	ownerEmail: string,
	since: Date
): Effect.Effect<TelemetryEventWindow, TelemetryStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const sinceIso = since.toISOString();
			const totalsResult = await database
				.prepare(
					`SELECT
						COUNT(*) AS total_events,
						COALESCE(SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END), 0) AS page_views,
						COALESCE(SUM(CASE WHEN event_type = 'workspace_view' THEN 1 ELSE 0 END), 0) AS workspace_views,
						COUNT(DISTINCT session_hash) AS unique_sessions,
						COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_hash END) AS page_view_sessions,
						COUNT(DISTINCT CASE WHEN event_type = 'web_vital' THEN session_hash END) AS performance_sessions,
						COALESCE(SUM(CASE WHEN event_type = 'contact_action' THEN 1 ELSE 0 END), 0) AS contact_actions,
						COUNT(DISTINCT CASE WHEN event_type = 'contact_action' THEN session_hash END) AS contact_sessions,
						COALESCE(SUM(CASE WHEN event_type = 'contact_action' AND metric_name LIKE 'email_%' THEN 1 ELSE 0 END), 0) AS email_clicks,
						COALESCE(SUM(CASE WHEN event_type = 'contact_action' AND metric_name LIKE 'linkedin_%' THEN 1 ELSE 0 END), 0) AS linkedin_clicks,
						COALESCE(SUM(CASE WHEN event_type = 'error' THEN 1 ELSE 0 END), 0) AS error_count,
						MAX(recorded_at) AS last_recorded_at
					 FROM telemetry_events
					 WHERE owner_email = ? AND recorded_at >= ?`
				)
				.bind(ownerEmail, sinceIso)
				.first();
			const totalsRow = Schema.decodeUnknownSync(TelemetryTotalsRowSchema)(totalsResult);
			const result = await database
				.prepare(
					`SELECT id, owner_email, event_type, recorded_at, path, workspace,
					        referrer_host, country, device_class, browser_family,
					        viewport_width, viewport_height, timezone_offset_minutes, language,
					        metric_name, metric_value, session_hash, visit_hash
					 FROM telemetry_events
					 WHERE owner_email = ? AND recorded_at >= ?
					 ORDER BY recorded_at DESC
					 LIMIT 5001`
				)
				.bind(ownerEmail, sinceIso)
				.all();
			const rows = Schema.decodeUnknownSync(Schema.Array(TelemetryRowSchema))(result.results);
			return {
				totals: telemetryTotalsFromRow(totalsRow),
				events: rows.slice(0, 5000).map(telemetryEventFromRow),
				truncated: rows.length > 5000
			};
		},
		catch: (cause) => new TelemetryStoreError('load', cause)
	});
}
