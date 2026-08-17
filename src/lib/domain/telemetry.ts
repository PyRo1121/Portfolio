import { Schema } from 'effect';

/** Telemetry event kinds collected from the public dashboard. */
export const TelemetryEventTypeSchema = Schema.Union(
	Schema.Literal('page_view'),
	Schema.Literal('workspace_view'),
	Schema.Literal('web_vital'),
	Schema.Literal('error')
);
export type TelemetryEventType = Schema.Schema.Type<typeof TelemetryEventTypeSchema>;

/** Device class inferred from the client user agent. */
export const TelemetryDeviceClassSchema = Schema.Union(
	Schema.Literal('mobile'),
	Schema.Literal('tablet'),
	Schema.Literal('desktop')
);
export type TelemetryDeviceClass = Schema.Schema.Type<typeof TelemetryDeviceClassSchema>;

/** Structured payload sent by the dashboard client beacon. */
export const TelemetryPayloadSchema = Schema.Struct({
	eventType: TelemetryEventTypeSchema,
	path: Schema.Trim.pipe(Schema.maxLength(512)),
	workspace: Schema.optional(Schema.Trim.pipe(Schema.maxLength(32))),
	referrerHost: Schema.optional(Schema.Trim.pipe(Schema.maxLength(256))),
	deviceClass: Schema.optional(TelemetryDeviceClassSchema),
	browserFamily: Schema.optional(Schema.Trim.pipe(Schema.maxLength(64))),
	viewportWidth: Schema.optional(Schema.Number),
	viewportHeight: Schema.optional(Schema.Number),
	timezoneOffsetMinutes: Schema.optional(Schema.Number),
	language: Schema.optional(Schema.Trim.pipe(Schema.maxLength(16))),
	metricName: Schema.optional(Schema.Trim.pipe(Schema.maxLength(32))),
	metricValue: Schema.optional(Schema.Number),
	sessionHash: Schema.optional(Schema.Trim.pipe(Schema.maxLength(64))),
	visitHash: Schema.optional(Schema.Trim.pipe(Schema.maxLength(64)))
});
export type TelemetryPayload = Schema.Schema.Type<typeof TelemetryPayloadSchema>;

/** One persisted telemetry row after server enrichment. */
export type TelemetryEvent = {
	readonly id: string;
	readonly ownerEmail: string;
	readonly eventType: TelemetryEventType;
	readonly recordedAt: string;
	readonly path: string;
	readonly workspace: string | null;
	readonly referrerHost: string | null;
	readonly country: string | null;
	readonly deviceClass: string | null;
	readonly browserFamily: string | null;
	readonly viewportWidth: number | null;
	readonly viewportHeight: number | null;
	readonly timezoneOffsetMinutes: number | null;
	readonly language: string | null;
	readonly metricName: string | null;
	readonly metricValue: number | null;
	readonly sessionHash: string | null;
	readonly visitHash: string | null;
};
