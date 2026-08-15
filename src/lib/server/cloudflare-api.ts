import { Effect, Either, Redacted, Schema } from 'effect';
import type {
	CloudflareMetric,
	CloudflareProductEvidence,
	CloudflareProductId,
	CloudflareResourceEvidence,
	CloudflareUsageSnapshot
} from '$lib/domain/cloudflare-usage';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const REQUEST_TIMEOUT_MS = 10_000;

type Fetch = typeof globalThis.fetch;

type ProductDefinition = {
	readonly id: CloudflareProductId;
	readonly label: string;
	readonly path: string;
	readonly resultKey: 'buckets' | 'items' | null;
	readonly evidencePath: string;
};

const productDefinitions: ReadonlyArray<ProductDefinition> = [
	{
		id: 'workers',
		label: 'Workers',
		path: '/workers/scripts',
		resultKey: null,
		evidencePath: '/workers-and-pages'
	},
	{ id: 'd1', label: 'D1 databases', path: '/d1/database', resultKey: null, evidencePath: '/d1' },
	{
		id: 'r2',
		label: 'R2 buckets',
		path: '/r2/buckets',
		resultKey: 'buckets',
		evidencePath: '/r2/default/buckets'
	},
	{
		id: 'kv',
		label: 'KV namespaces',
		path: '/storage/kv/namespaces',
		resultKey: null,
		evidencePath: '/workers/kv/namespaces'
	},
	{
		id: 'queues',
		label: 'Queues',
		path: '/queues',
		resultKey: null,
		evidencePath: '/workers/queues'
	},
	{
		id: 'vectorize',
		label: 'Vectorize indexes',
		path: '/vectorize/v2/indexes',
		resultKey: null,
		evidencePath: '/vectorize'
	},
	{
		id: 'workflows',
		label: 'Workflows',
		path: '/workflows',
		resultKey: null,
		evidencePath: '/workers/workflows'
	},
	{
		id: 'containers',
		label: 'Container apps',
		path: '/cloudchamber/applications',
		resultKey: 'items',
		evidencePath: '/workers/containers'
	}
];

const ApiErrorSchema = Schema.Struct({ code: Schema.Number, message: Schema.String });
const ApiEnvelopeSchema = Schema.Struct({
	success: Schema.Boolean,
	result: Schema.Unknown,
	errors: Schema.optional(Schema.Array(ApiErrorSchema)),
	result_info: Schema.optional(
		Schema.Struct({
			total_count: Schema.optional(Schema.Number),
			count: Schema.optional(Schema.Number)
		})
	)
});
const ArrayResultSchema = Schema.Array(Schema.Unknown);
const WorkerInventorySchema = Schema.Array(
	Schema.Struct({
		id: Schema.String,
		tag: Schema.optional(Schema.String),
		created_on: Schema.optional(Schema.String),
		modified_on: Schema.optional(Schema.String)
	})
);
const R2BucketSchema = Schema.Struct({ name: Schema.String, creation_date: Schema.String });
const BucketResultSchema = Schema.Struct({ buckets: Schema.Array(R2BucketSchema) });
const ItemsResultSchema = Schema.Struct({ items: Schema.Array(Schema.Unknown) });
const KvNamespaceInventorySchema = Schema.Array(
	Schema.Struct({ id: Schema.String, title: Schema.String })
);
const D1DatabaseSchema = Schema.Struct({
	uuid: Schema.String,
	name: Schema.String,
	file_size: Schema.optional(Schema.Number),
	created_at: Schema.optional(Schema.String)
});
const D1DatabasesSchema = Schema.Array(D1DatabaseSchema);
const D1DetailSchema = Schema.Struct({ file_size: Schema.Number });

class CloudflareCollectionError extends Error {
	readonly _tag = 'CloudflareCollectionError';

	constructor(
		readonly surface: string,
		readonly status: number | null,
		readonly sourceCause: unknown
	) {
		super(status === null ? `${surface} could not be read` : `${surface} returned HTTP ${status}`);
	}
}

function requestJson(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	path: string,
	init: RequestInit = {}
): Effect.Effect<unknown, CloudflareCollectionError> {
	return Effect.tryPromise({
		try: () =>
			fetch(`${API_BASE}${path}`, {
				...init,
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${Redacted.value(token)}`,
					...init.headers
				},
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
			}),
		catch: (cause) => new CloudflareCollectionError(path, null, cause)
	}).pipe(
		Effect.flatMap((response) =>
			response.ok
				? Effect.tryPromise({
						try: () => response.json(),
						catch: (cause) => new CloudflareCollectionError(path, response.status, cause)
					})
				: Effect.fail(new CloudflareCollectionError(path, response.status, null))
		)
	);
}

function requestApiResult(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	path: string,
	paginate = true
): Effect.Effect<Schema.Schema.Type<typeof ApiEnvelopeSchema>, CloudflareCollectionError> {
	const separator = path.includes('?') ? '&' : '?';
	const requestPath = paginate ? `${path}${separator}per_page=100` : path;
	return requestJson(fetch, token, `/accounts/${accountId}${requestPath}`).pipe(
		Effect.flatMap((raw) =>
			Schema.decodeUnknown(ApiEnvelopeSchema)(raw).pipe(
				Effect.mapError((cause) => new CloudflareCollectionError(path, null, cause))
			)
		),
		Effect.flatMap((envelope) =>
			envelope.success
				? Effect.succeed(envelope)
				: Effect.fail(new CloudflareCollectionError(path, null, envelope.errors ?? null))
		)
	);
}

function inventoryCount(
	envelope: Schema.Schema.Type<typeof ApiEnvelopeSchema>,
	resultKey: ProductDefinition['resultKey']
): number | null {
	const total = envelope.result_info?.total_count;
	if (total !== undefined) return total;
	if (resultKey === 'buckets') {
		const decoded = Schema.decodeUnknownEither(BucketResultSchema)(envelope.result);
		if (Either.isRight(decoded)) return decoded.right.buckets.length;
	}
	if (resultKey === 'items') {
		const decoded = Schema.decodeUnknownEither(ItemsResultSchema)(envelope.result);
		if (Either.isRight(decoded)) return decoded.right.items.length;
	}
	const decoded = Schema.decodeUnknownEither(ArrayResultSchema)(envelope.result);
	return Either.isRight(decoded) ? decoded.right.length : null;
}

function unavailableProduct(
	definition: ProductDefinition,
	accountId: string,
	reason: string
): CloudflareProductEvidence {
	return {
		id: definition.id,
		label: definition.label,
		count: null,
		state: 'Unavailable',
		detail: reason,
		evidenceUrl: `https://dash.cloudflare.com/${accountId}${definition.evidencePath}`
	};
}

type ProductCollection = {
	readonly product: CloudflareProductEvidence;
	readonly resources: ReadonlyArray<CloudflareResourceEvidence>;
};

function namedResources(
	definition: ProductDefinition,
	envelope: Schema.Schema.Type<typeof ApiEnvelopeSchema>,
	accountId: string
): ReadonlyArray<CloudflareResourceEvidence> | null {
	if (definition.id === 'workers') {
		const decoded = Schema.decodeUnknownEither(WorkerInventorySchema)(envelope.result);
		return Either.isLeft(decoded)
			? null
			: decoded.right.map((worker) => ({
					kind: 'Worker' as const,
					providerId: worker.id,
					name: worker.id,
					state: 'Provisioned' as const,
					createdAt: worker.created_on ?? null,
					modifiedAt: worker.modified_on ?? null,
					sizeBytes: null,
					evidenceUrl: `https://dash.cloudflare.com/${accountId}/workers/services/view/${encodeURIComponent(worker.id)}/production`
				}));
	}
	if (definition.id === 'd1') {
		const decoded = Schema.decodeUnknownEither(D1DatabasesSchema)(envelope.result);
		return Either.isLeft(decoded)
			? null
			: decoded.right.map((database) => ({
					kind: 'D1Database' as const,
					providerId: database.uuid,
					name: database.name,
					state: 'Provisioned' as const,
					createdAt: database.created_at ?? null,
					modifiedAt: null,
					sizeBytes: database.file_size ?? null,
					evidenceUrl: `https://dash.cloudflare.com/${accountId}/d1/${database.uuid}`
				}));
	}
	if (definition.id === 'kv') {
		const decoded = Schema.decodeUnknownEither(KvNamespaceInventorySchema)(envelope.result);
		return Either.isLeft(decoded)
			? null
			: decoded.right.map((namespace) => ({
					kind: 'KVNamespace' as const,
					providerId: namespace.id,
					name: namespace.title,
					state: 'Provisioned' as const,
					createdAt: null,
					modifiedAt: null,
					sizeBytes: null,
					evidenceUrl: `https://dash.cloudflare.com/${accountId}/workers/kv/namespaces/${namespace.id}`
				}));
	}
	if (definition.id === 'r2') {
		const decoded = Schema.decodeUnknownEither(BucketResultSchema)(envelope.result);
		return Either.isLeft(decoded)
			? null
			: decoded.right.buckets.map((bucket) => ({
					kind: 'R2Bucket' as const,
					providerId: bucket.name,
					name: bucket.name,
					state: 'Provisioned' as const,
					createdAt: bucket.creation_date,
					modifiedAt: null,
					sizeBytes: null,
					evidenceUrl: `https://dash.cloudflare.com/${accountId}/r2/default/buckets/${encodeURIComponent(bucket.name)}`
				}));
	}
	return [];
}

async function collectProduct(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	definition: ProductDefinition
): Promise<ProductCollection> {
	const exit = await Effect.runPromiseExit(
		requestApiResult(fetch, token, accountId, definition.path)
	);
	if (exit._tag === 'Failure') {
		return {
			product: unavailableProduct(
				definition,
				accountId,
				'The inventory endpoint is unavailable or the token lacks permission.'
			),
			resources: []
		};
	}
	const count = inventoryCount(exit.value, definition.resultKey);
	const resources = namedResources(definition, exit.value, accountId);
	if (count === null || resources === null) {
		return {
			product: unavailableProduct(
				definition,
				accountId,
				'Cloudflare returned an unrecognized inventory shape.'
			),
			resources: []
		};
	}
	return {
		product: {
			id: definition.id,
			label: definition.label,
			count,
			state: 'Provisioned',
			detail: `${count} resources enumerated by the account API. This is inventory, not usage.`,
			evidenceUrl: `https://dash.cloudflare.com/${accountId}${definition.evidencePath}`
		},
		resources
	};
}

function unavailableMetric(
	id: CloudflareMetric['id'],
	label: string,
	unit: string,
	detail: string,
	evidenceUrl: string
): CloudflareMetric {
	return { id, label, value: null, unit, state: 'Unavailable', detail, evidenceUrl };
}

async function collectD1Storage(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string
): Promise<CloudflareMetric> {
	const evidenceUrl = `https://dash.cloudflare.com/${accountId}/d1`;
	const listExit = await Effect.runPromiseExit(
		requestApiResult(fetch, token, accountId, '/d1/database')
	);
	if (listExit._tag === 'Failure') {
		return unavailableMetric(
			'd1Storage',
			'D1 physical storage',
			'bytes',
			'D1 inventory is unavailable; storage is not assumed to be zero.',
			evidenceUrl
		);
	}
	const decoded = Schema.decodeUnknownEither(D1DatabasesSchema)(listExit.value.result);
	if (Either.isLeft(decoded)) {
		return unavailableMetric(
			'd1Storage',
			'D1 physical storage',
			'bytes',
			'D1 returned an unrecognized database shape.',
			evidenceUrl
		);
	}
	const sizes = await Promise.all(
		decoded.right.map(async (database) => {
			if (database.file_size !== undefined) return database.file_size;
			const detailExit = await Effect.runPromiseExit(
				requestApiResult(fetch, token, accountId, `/d1/database/${database.uuid}`, false)
			);
			if (detailExit._tag === 'Failure') return null;
			const detail = Schema.decodeUnknownEither(D1DetailSchema)(detailExit.value.result);
			return Either.isRight(detail) ? detail.right.file_size : null;
		})
	);
	if (sizes.some((size) => size === null)) {
		return unavailableMetric(
			'd1Storage',
			'D1 physical storage',
			'bytes',
			'At least one database size could not be read; partial storage is not presented as a total.',
			evidenceUrl
		);
	}
	const measuredSizes = sizes.filter((size): size is number => size !== null);
	const total = measuredSizes.reduce((sum, size) => sum + size, 0);
	return {
		id: 'd1Storage',
		label: 'D1 physical storage',
		value: total,
		unit: 'bytes',
		state: 'Measured',
		detail: `Current physical file size summed across ${sizes.length} D1 databases.`,
		evidenceUrl
	};
}

function graphQlRequest(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	query: string,
	variables: Readonly<Record<string, string>>
): Effect.Effect<unknown, CloudflareCollectionError> {
	return requestJson(fetch, token, '/graphql', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ query, variables })
	});
}

async function collectWorkersAnalytics(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	startIso: string,
	endIso: string
): Promise<ReadonlyArray<CloudflareMetric>> {
	const evidenceUrl =
		'https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/';
	const query = `query WorkerUsage($accountTag: string!, $start: Time!, $end: Time!) { viewer { accounts(filter: { accountTag: $accountTag }) { metric: workersInvocationsAdaptive(limit: 1, filter: { datetime_geq: $start, datetime_leq: $end }) { sum { requests errors } } } } }`;
	const exit = await Effect.runPromiseExit(
		graphQlRequest(fetch, token, query, { accountTag: accountId, start: startIso, end: endIso })
	);
	const schema = Schema.Struct({
		data: Schema.Struct({
			viewer: Schema.Struct({
				accounts: Schema.Array(
					Schema.Struct({
						metric: Schema.Array(
							Schema.Struct({
								sum: Schema.Struct({ requests: Schema.Number, errors: Schema.Number })
							})
						)
					})
				)
			})
		})
	});
	if (exit._tag === 'Failure') {
		return [
			unavailableMetric(
				'workerRequests',
				'Worker requests',
				'requests',
				'Workers analytics is unavailable or not permitted.',
				evidenceUrl
			),
			unavailableMetric(
				'workerErrors',
				'Worker errors',
				'errors',
				'Workers analytics is unavailable or not permitted.',
				evidenceUrl
			)
		];
	}
	const decoded = Schema.decodeUnknownEither(schema)(exit.value);
	const sums = Either.isRight(decoded) ? decoded.right.data.viewer.accounts[0]?.metric : undefined;
	if (sums === undefined) {
		return [
			unavailableMetric(
				'workerRequests',
				'Worker requests',
				'requests',
				'Workers analytics returned no account dataset.',
				evidenceUrl
			),
			unavailableMetric(
				'workerErrors',
				'Worker errors',
				'errors',
				'Workers analytics returned no account dataset.',
				evidenceUrl
			)
		];
	}
	const requests = sums.reduce((total, row) => total + row.sum.requests, 0);
	const errors = sums.reduce((total, row) => total + row.sum.errors, 0);
	return [
		{
			id: 'workerRequests',
			label: 'Worker requests',
			value: requests,
			unit: 'requests',
			state: 'Measured',
			detail: 'Account-wide requests measured over the last seven UTC days.',
			evidenceUrl
		},
		{
			id: 'workerErrors',
			label: 'Worker errors',
			value: errors,
			unit: 'errors',
			state: 'Measured',
			detail: 'Account-wide invocation errors measured over the last seven UTC days.',
			evidenceUrl
		}
	];
}

async function collectD1Analytics(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	startDate: string,
	endDate: string
): Promise<ReadonlyArray<CloudflareMetric>> {
	const evidenceUrl = 'https://developers.cloudflare.com/d1/observability/metrics-analytics/';
	const query = `query D1Usage($accountTag: string!, $start: Date!, $end: Date!) { viewer { accounts(filter: { accountTag: $accountTag }) { metric: d1AnalyticsAdaptiveGroups(limit: 1, filter: { date_geq: $start, date_leq: $end }) { sum { rowsRead rowsWritten } } } } }`;
	const exit = await Effect.runPromiseExit(
		graphQlRequest(fetch, token, query, { accountTag: accountId, start: startDate, end: endDate })
	);
	const schema = Schema.Struct({
		data: Schema.Struct({
			viewer: Schema.Struct({
				accounts: Schema.Array(
					Schema.Struct({
						metric: Schema.Array(
							Schema.Struct({
								sum: Schema.Struct({ rowsRead: Schema.Number, rowsWritten: Schema.Number })
							})
						)
					})
				)
			})
		})
	});
	const decoded = exit._tag === 'Success' ? Schema.decodeUnknownEither(schema)(exit.value) : null;
	const rows =
		decoded !== null && Either.isRight(decoded)
			? decoded.right.data.viewer.accounts[0]?.metric
			: undefined;
	if (rows === undefined) {
		return [
			unavailableMetric(
				'd1RowsRead',
				'D1 rows read',
				'rows',
				'D1 analytics is unavailable or not permitted.',
				evidenceUrl
			),
			unavailableMetric(
				'd1RowsWritten',
				'D1 rows written',
				'rows',
				'D1 analytics is unavailable or not permitted.',
				evidenceUrl
			)
		];
	}
	return [
		{
			id: 'd1RowsRead',
			label: 'D1 rows read',
			value: rows.reduce((total, row) => total + row.sum.rowsRead, 0),
			unit: 'rows',
			state: 'Measured',
			detail: 'Rows scanned account-wide over the last seven UTC days.',
			evidenceUrl
		},
		{
			id: 'd1RowsWritten',
			label: 'D1 rows written',
			value: rows.reduce((total, row) => total + row.sum.rowsWritten, 0),
			unit: 'rows',
			state: 'Measured',
			detail: 'Rows written account-wide over the last seven UTC days.',
			evidenceUrl
		}
	];
}

async function collectKvAnalytics(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	accountId: string,
	startDate: string,
	endDate: string
): Promise<CloudflareMetric> {
	const evidenceUrl = 'https://developers.cloudflare.com/kv/observability/metrics-analytics/';
	const query = `query KvUsage($accountTag: string!, $start: Date!, $end: Date!) { viewer { accounts(filter: { accountTag: $accountTag }) { metric: kvOperationsAdaptiveGroups(limit: 1, filter: { date_geq: $start, date_leq: $end }) { sum { requests } } } } }`;
	const exit = await Effect.runPromiseExit(
		graphQlRequest(fetch, token, query, { accountTag: accountId, start: startDate, end: endDate })
	);
	const schema = Schema.Struct({
		data: Schema.Struct({
			viewer: Schema.Struct({
				accounts: Schema.Array(
					Schema.Struct({
						metric: Schema.Array(Schema.Struct({ sum: Schema.Struct({ requests: Schema.Number }) }))
					})
				)
			})
		})
	});
	const decoded = exit._tag === 'Success' ? Schema.decodeUnknownEither(schema)(exit.value) : null;
	const rows =
		decoded !== null && Either.isRight(decoded)
			? decoded.right.data.viewer.accounts[0]?.metric
			: undefined;
	return rows === undefined
		? unavailableMetric(
				'kvOperations',
				'KV operations',
				'operations',
				'KV analytics is unavailable or not permitted.',
				evidenceUrl
			)
		: {
				id: 'kvOperations',
				label: 'KV operations',
				value: rows.reduce((total, row) => total + row.sum.requests, 0),
				unit: 'operations',
				state: 'Measured',
				detail: 'Read, write, delete, and list operations over the last seven UTC days.',
				evidenceUrl
			};
}

/** Collect account inventory and bounded seven-day analytics with product-level failure isolation. */
export async function loadCloudflareUsageSnapshot(
	fetch: Fetch,
	accountId: string,
	rawToken: string,
	now: Date
): Promise<CloudflareUsageSnapshot> {
	const token = Redacted.make(rawToken);
	const end = now;
	const start = new Date(now.getTime() - 7 * 86_400_000);
	const startIso = start.toISOString();
	const endIso = end.toISOString();
	const startDate = startIso.slice(0, 10);
	const endDate = endIso.slice(0, 10);
	const [productCollections, d1Storage, workerMetrics, d1Metrics, kvMetric] = await Promise.all([
		Promise.all(
			productDefinitions.map((definition) => collectProduct(fetch, token, accountId, definition))
		),
		collectD1Storage(fetch, token, accountId),
		collectWorkersAnalytics(fetch, token, accountId, startIso, endIso),
		collectD1Analytics(fetch, token, accountId, startDate, endDate),
		collectKvAnalytics(fetch, token, accountId, startDate, endDate)
	]);
	const products = productCollections.map((collection) => collection.product);
	const resources = productCollections
		.flatMap((collection) => collection.resources)
		.sort((left, right) => left.name.localeCompare(right.name));
	const metrics = [...workerMetrics, ...d1Metrics, kvMetric, d1Storage];
	const availableProducts = products.filter((product) => product.state === 'Provisioned').length;
	return {
		generatedAt: now.toISOString(),
		period: { startIso, endIso, label: 'Last 7 UTC days' },
		products,
		resources,
		metrics,
		summary: {
			availableProducts,
			totalProducts: products.length,
			provisionedResources: products.reduce((total, product) => total + (product.count ?? 0), 0),
			measuredMetrics: metrics.filter((metric) => metric.state === 'Measured').length,
			unavailableMetrics: metrics.filter((metric) => metric.state === 'Unavailable').length
		}
	};
}
