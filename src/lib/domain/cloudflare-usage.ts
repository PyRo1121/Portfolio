import { Schema } from 'effect';

/** Evidence classification used by the Cloudflare workspace. */
export const CloudflareEvidenceStateSchema = Schema.Union(
	Schema.Literal('Measured'),
	Schema.Literal('Provisioned'),
	Schema.Literal('Unavailable')
);
export type CloudflareEvidenceState = Schema.Schema.Type<typeof CloudflareEvidenceStateSchema>;

/** Cloudflare products currently inventoried by the account collector. */
export const CloudflareProductIdSchema = Schema.Union(
	Schema.Literal('workers'),
	Schema.Literal('d1'),
	Schema.Literal('r2'),
	Schema.Literal('kv'),
	Schema.Literal('queues'),
	Schema.Literal('vectorize'),
	Schema.Literal('workflows'),
	Schema.Literal('containers')
);
export type CloudflareProductId = Schema.Schema.Type<typeof CloudflareProductIdSchema>;

/** One product inventory result, including an observable permission failure when unavailable. */
export const CloudflareProductEvidenceSchema = Schema.Struct({
	id: CloudflareProductIdSchema,
	label: Schema.String,
	count: Schema.NullOr(Schema.Number),
	state: CloudflareEvidenceStateSchema,
	detail: Schema.String,
	evidenceUrl: Schema.String
});
export type CloudflareProductEvidence = Schema.Schema.Type<typeof CloudflareProductEvidenceSchema>;

/** One measured Cloudflare usage or storage signal. */
export const CloudflareMetricSchema = Schema.Struct({
	id: Schema.Union(
		Schema.Literal('workerRequests'),
		Schema.Literal('workerErrors'),
		Schema.Literal('d1RowsRead'),
		Schema.Literal('d1RowsWritten'),
		Schema.Literal('kvOperations'),
		Schema.Literal('d1Storage')
	),
	label: Schema.String,
	value: Schema.NullOr(Schema.Number),
	unit: Schema.String,
	state: CloudflareEvidenceStateSchema,
	detail: Schema.String,
	evidenceUrl: Schema.String
});
export type CloudflareMetric = Schema.Schema.Type<typeof CloudflareMetricSchema>;

/** Independently cached account evidence returned to the Cloudflare workspace. */
export const CloudflareUsageSnapshotSchema = Schema.Struct({
	generatedAt: Schema.String,
	period: Schema.Struct({ startIso: Schema.String, endIso: Schema.String, label: Schema.String }),
	products: Schema.Array(CloudflareProductEvidenceSchema),
	metrics: Schema.Array(CloudflareMetricSchema),
	summary: Schema.Struct({
		availableProducts: Schema.Number,
		totalProducts: Schema.Number,
		provisionedResources: Schema.Number,
		measuredMetrics: Schema.Number,
		unavailableMetrics: Schema.Number
	})
});
export type CloudflareUsageSnapshot = Schema.Schema.Type<typeof CloudflareUsageSnapshotSchema>;

/** Outcome of an isolated Cloudflare cache refresh. */
export type CloudflareUsageRefreshResult =
	| {
			readonly _tag: 'Fresh';
			readonly snapshot: CloudflareUsageSnapshot;
			readonly refreshedAt: string;
	  }
	| { readonly _tag: 'Current'; readonly checkedAt: string }
	| { readonly _tag: 'Unavailable'; readonly attemptedAt: string; readonly reason: string };

/** Format one Cloudflare metric value without implying unavailable evidence is zero. */
export function formatCloudflareMetric(metric: CloudflareMetric): string {
	if (metric.value === null) return '—';
	if (metric.unit === 'bytes') {
		const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
		let value = metric.value;
		let unitIndex = 0;
		while (value >= 1_000 && unitIndex < units.length - 1) {
			value /= 1_000;
			unitIndex += 1;
		}
		return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
	}
	return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
		metric.value
	);
}
