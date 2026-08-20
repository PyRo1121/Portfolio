import { describe, expect, it } from 'vitest';
import { loadCloudflareUsageSnapshot } from './cloudflare-api';

function api(result: unknown, resultInfo?: Record<string, number>): Response {
	return Response.json({
		success: true,
		errors: [],
		messages: [],
		result,
		...(resultInfo === undefined ? {} : { result_info: resultInfo })
	});
}

function graphQlResponse(body: string): Response {
	if (body.includes('workersInvocationsAdaptive')) {
		return Response.json({
			data: {
				viewer: { accounts: [{ metric: [{ sum: { requests: 4200, errors: 12 } }] }] }
			}
		});
	}
	if (body.includes('d1AnalyticsAdaptiveGroups')) {
		return Response.json({
			data: {
				viewer: { accounts: [{ metric: [{ sum: { rowsRead: 9000, rowsWritten: 450 } }] }] }
			}
		});
	}
	return Response.json({
		data: { viewer: { accounts: [{ metric: [{ sum: { requests: 700 } }] }] } }
	});
}

function inventoryResponse(pathname: string): Response {
	switch (true) {
		case pathname.endsWith('/queues'):
			return new Response(null, { status: 403 });
		case pathname.endsWith('/workers/scripts'):
			return api([{ id: 'a' }, { id: 'b' }]);
		case pathname.endsWith('/d1/database'):
			return api([
				{ uuid: 'db-1', name: 'one', file_size: 1000 },
				{ uuid: 'db-2', name: 'two' }
			]);
		case pathname.endsWith('/d1/database/db-2'):
			return api({ file_size: 2000 });
		case pathname.endsWith('/r2/buckets'):
			return api({ buckets: [{ name: 'assets', creation_date: '2026-08-01T00:00:00.000Z' }] });
		case pathname.endsWith('/storage/kv/namespaces'):
			return api([{ id: 'kv', title: 'CACHE' }]);
		case pathname.endsWith('/vectorize/v2/indexes'):
			return api([{ name: 'search' }]);
		case pathname.endsWith('/workflows'):
			return api([{ name: 'refresh' }]);
		case pathname.endsWith('/cloudchamber/applications'):
			return api({ items: [{ id: 'app' }] });
		default:
			return new Response(null, { status: 404 });
	}
}

describe('loadCloudflareUsageSnapshot', () => {
	it('collects every page of named account inventory', async () => {
		const workerPages: string[] = [];
		const fetch: typeof globalThis.fetch = async (input, init) => {
			const url = URL.parse(input instanceof Request ? input.url : input.toString());
			if (url === null) return new Response(null, { status: 400 });
			if (url.pathname.endsWith('/graphql')) {
				return graphQlResponse(typeof init?.body === 'string' ? init.body : '');
			}
			if (url.pathname.endsWith('/workers/scripts')) {
				const page = url.searchParams.get('page') ?? '1';
				workerPages.push(page);
				return page === '1'
					? api(
							Array.from({ length: 100 }, (_, index) => ({ id: `worker-${String(index)}` })),
							{ page: 1, per_page: 100, total_pages: 2, total_count: 101 }
						)
					: api([{ id: 'worker-100' }], {
							page: 2,
							per_page: 100,
							total_pages: 2,
							total_count: 101
						});
			}
			return inventoryResponse(url.pathname);
		};
		const snapshot = await loadCloudflareUsageSnapshot(
			fetch,
			'account-id',
			'test-token',
			new Date('2026-08-14T00:00:00.000Z')
		);
		expect(workerPages).toEqual(['1', '2']);
		expect(snapshot.resources.filter((resource) => resource.kind === 'Worker')).toHaveLength(101);
	});

	it('isolates product failures while preserving measured analytics', async () => {
		const graphQlBodies: string[] = [];
		const fetch: typeof globalThis.fetch = async (input, init) => {
			const url = URL.parse(input instanceof Request ? input.url : input.toString());
			if (url === null) return new Response(null, { status: 400 });
			if (url.pathname.endsWith('/graphql')) {
				const body = typeof init?.body === 'string' ? init.body : '';
				graphQlBodies.push(body);
				return graphQlResponse(body);
			}
			return inventoryResponse(url.pathname);
		};

		const snapshot = await loadCloudflareUsageSnapshot(
			fetch,
			'account-id',
			'test-token',
			new Date('2026-08-14T00:00:00.000Z')
		);

		expect(snapshot.summary.availableProducts).toBe(7);
		expect(snapshot.products.find((product) => product.id === 'queues')).toMatchObject({
			state: 'Unavailable',
			count: null
		});
		expect(snapshot.metrics.find((metric) => metric.id === 'd1Storage')).toMatchObject({
			state: 'Measured',
			value: 3000
		});
		expect(snapshot.metrics.find((metric) => metric.id === 'workerRequests')?.value).toBe(4200);
		expect(snapshot.metrics.find((metric) => metric.id === 'd1RowsWritten')?.value).toBe(450);
		expect(snapshot.metrics.find((metric) => metric.id === 'kvOperations')?.value).toBe(700);
		const dateBucketVariables = graphQlBodies
			.map((body) => JSON.parse(body) as { readonly variables?: Record<string, unknown> })
			.map((body) => body.variables)
			.filter(
				(variables) => typeof variables?.['start'] === 'string' && variables['start'].length === 10
			);
		expect(dateBucketVariables).toEqual([
			expect.objectContaining({ start: '2026-08-08', end: '2026-08-14' }),
			expect.objectContaining({ start: '2026-08-08', end: '2026-08-14' })
		]);
		expect(snapshot.resources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kind: 'Worker', providerId: 'a', name: 'a' }),
				expect.objectContaining({
					kind: 'D1Database',
					providerId: 'db-1',
					sizeBytes: 1000
				}),
				expect.objectContaining({ kind: 'KVNamespace', providerId: 'kv', name: 'CACHE' }),
				expect.objectContaining({ kind: 'R2Bucket', providerId: 'assets' })
			])
		);
	});
});
