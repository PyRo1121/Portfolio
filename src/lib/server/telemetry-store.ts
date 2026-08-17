import type { D1Database } from '@cloudflare/workers-types';
import { Effect, Schema } from 'effect';
import type { TelemetryEvent, TelemetryPayload } from '$lib/domain/telemetry';

/** Expected D1 telemetry failure boundary. */
export class TelemetryStoreError extends Error {
	readonly _tag = 'TelemetryStoreError';

	constructor(
		readonly operation: 'insert' | 'load',
		override readonly cause: unknown
	) {
		super(`telemetry ${operation} failed`);
		this.name = 'TelemetryStoreError';
	}
}

/** Client payload plus server-derived evidence added at the edge. */
export type TelemetryEventInput = TelemetryPayload & { readonly country: string | null };

const TelemetryRowSchema = Schema.Struct({
	id: Schema.String,
	owner_email: Schema.String,
	event_type: Schema.String,
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

export function telemetryEventFromRow(
	row: Schema.Schema.Type<typeof TelemetryRowSchema>
): TelemetryEvent {
	return {
		id: row.id,
		ownerEmail: row.owner_email,
		eventType: row.event_type as TelemetryEvent['eventType'],
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

/** Persist one enriched telemetry event. */
export function insertTelemetryEvent(
	database: D1Database,
	ownerEmail: string,
	input: TelemetryEventInput,
	now: Date
): Effect.Effect<void, TelemetryStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const id = crypto.randomUUID();
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
					id,
					ownerEmail,
					input.eventType,
					now.toISOString(),
					input.path,
					input.workspace ?? null,
					input.referrerHost ?? null,
					input.country ?? null,
					input.deviceClass ?? null,
					input.browserFamily ?? null,
					input.viewportWidth ?? null,
					input.viewportHeight ?? null,
					input.timezoneOffsetMinutes ?? null,
					input.language ?? null,
					input.metricName ?? null,
					input.metricValue ?? null,
					input.sessionHash ?? null,
					input.visitHash ?? null
				)
				.run();
		},
		catch: (cause) => new TelemetryStoreError('insert', cause)
	});
}

/** Load telemetry events recorded after a cutoff, newest first. */
export function loadTelemetryEvents(
	database: D1Database,
	ownerEmail: string,
	since: Date
): Effect.Effect<ReadonlyArray<TelemetryEvent>, TelemetryStoreError> {
	return Effect.tryPromise({
		try: async () => {
			const result = await database
				.prepare(
					`SELECT id, owner_email, event_type, recorded_at, path, workspace,
					        referrer_host, country, device_class, browser_family,
					        viewport_width, viewport_height, timezone_offset_minutes, language,
					        metric_name, metric_value, session_hash, visit_hash
					 FROM telemetry_events
					 WHERE owner_email = ? AND recorded_at >= ?
					 ORDER BY recorded_at DESC
					 LIMIT 5000`
				)
				.bind(ownerEmail, since.toISOString())
				.all();
			const rows = Schema.decodeUnknownSync(Schema.Array(TelemetryRowSchema))(result.results);
			return rows.map(telemetryEventFromRow);
		},
		catch: (cause) => new TelemetryStoreError('load', cause)
	});
}
