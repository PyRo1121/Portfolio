import { Schema } from 'effect';

/** Telemetry event kinds collected from the public dashboard. */
export const TelemetryEventTypeSchema = Schema.Union(
	Schema.Literal('page_view'),
	Schema.Literal('workspace_view'),
	Schema.Literal('web_vital'),
	Schema.Literal('error'),
	Schema.Literal('contact_action'),
	Schema.Literal('portfolio_action')
);
export type TelemetryEventType = Schema.Schema.Type<typeof TelemetryEventTypeSchema>;

/** Device class inferred from the client user agent. */
export const TelemetryDeviceClassSchema = Schema.Union(
	Schema.Literal('mobile'),
	Schema.Literal('tablet'),
	Schema.Literal('desktop')
);
export type TelemetryDeviceClass = Schema.Schema.Type<typeof TelemetryDeviceClassSchema>;

/** Browser metric names accepted from the public telemetry client. */
export const TelemetryVitalMetricSchema = Schema.Union(
	Schema.Literal('lcp'),
	Schema.Literal('fcp'),
	Schema.Literal('ttfb'),
	Schema.Literal('inp'),
	Schema.Literal('cls')
);
export type TelemetryVitalMetric = Schema.Schema.Type<typeof TelemetryVitalMetricSchema>;

/** Exact public contact action recorded without message or identity data. */
export const ContactActionSchema = Schema.Union(
	Schema.Literal('email_header'),
	Schema.Literal('email_social'),
	Schema.Literal('email_summary'),
	Schema.Literal('email_about'),
	Schema.Literal('linkedin_social'),
	Schema.Literal('linkedin_summary'),
	Schema.Literal('linkedin_about')
);
export type ContactAction = Schema.Schema.Type<typeof ContactActionSchema>;

/** Exact portfolio navigation action recorded without visitor identity or content. */
export const PortfolioActionSchema = Schema.Union(
	Schema.Literal('featured_omg_open'),
	Schema.Literal('featured_weeknote_open'),
	Schema.Literal('live_evidence_open')
);
export type PortfolioAction = Schema.Schema.Type<typeof PortfolioActionSchema>;

/** Exclude Access-protected owner pages from public visitor analytics. */
export function shouldCollectTelemetryPath(path: string): boolean {
	return path !== '/owner' && path.startsWith('/owner/') === false;
}

const NonEmptyTrimmedString = Schema.Trim.pipe(Schema.minLength(1));
const TelemetryPathSchema = NonEmptyTrimmedString.pipe(
	Schema.startsWith('/'),
	Schema.maxLength(512)
);
const HexHashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{32}$/u));
const BrowserEvidenceFields = {
	deviceClass: Schema.optional(TelemetryDeviceClassSchema),
	browserFamily: Schema.optional(NonEmptyTrimmedString.pipe(Schema.maxLength(64))),
	viewportWidth: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.between(1, 10_000))),
	viewportHeight: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.between(1, 10_000))),
	timezoneOffsetMinutes: Schema.optional(
		Schema.Number.pipe(Schema.int(), Schema.between(-840, 840))
	),
	language: Schema.optional(NonEmptyTrimmedString.pipe(Schema.maxLength(32)))
};
const BaseEventFields = {
	eventId: Schema.UUID,
	path: TelemetryPathSchema,
	sessionHash: HexHashSchema,
	visitHash: Schema.optional(HexHashSchema),
	...BrowserEvidenceFields
};
const TimingVitalMetricSchema = Schema.Union(
	Schema.Literal('lcp'),
	Schema.Literal('fcp'),
	Schema.Literal('ttfb'),
	Schema.Literal('inp')
);

/** Structured, event-specific payload sent by the dashboard client beacon. */
export const TelemetryPayloadSchema = Schema.Union(
	Schema.Struct({
		...BaseEventFields,
		eventType: Schema.Literal('page_view'),
		referrerHost: Schema.optional(NonEmptyTrimmedString.pipe(Schema.maxLength(256)))
	}),
	Schema.Struct({
		...BaseEventFields,
		eventType: Schema.Literal('workspace_view'),
		workspace: NonEmptyTrimmedString.pipe(Schema.maxLength(32))
	}),
	Schema.Struct({
		...BaseEventFields,
		eventType: Schema.Literal('web_vital'),
		metricName: TimingVitalMetricSchema,
		metricValue: Schema.Number.pipe(Schema.between(0, 120_000))
	}),
	Schema.Struct({
		...BaseEventFields,
		eventType: Schema.Literal('web_vital'),
		metricName: Schema.Literal('cls'),
		metricValue: Schema.Number.pipe(Schema.between(0, 10))
	}),
	Schema.Struct({
		...BaseEventFields,
		eventType: Schema.Literal('error'),
		metricName: Schema.Union(
			Schema.Literal('runtime_error'),
			Schema.Literal('unhandled_rejection')
		),
		metricValue: Schema.Literal(1)
	}),
	Schema.Struct({
		...BaseEventFields,
		eventType: Schema.Literal('contact_action'),
		action: ContactActionSchema
	}),
	Schema.Struct({
		...BaseEventFields,
		eventType: Schema.Literal('portfolio_action'),
		action: PortfolioActionSchema
	})
);
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
