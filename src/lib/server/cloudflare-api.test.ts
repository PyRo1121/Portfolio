import { describe, expect, it } from 'vitest';
import { loadCloudflareUsageSnapshot } from './cloudflare-api';

function api(result: unknown): Response {
	return Response.json({ success: true, errors: [], messages: [], result });
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
			return api({ buckets: [{ name: 'assets' }] });
		case pathname.endsWith('/storage/kv/namespaces'):
			return api([{ id: 'kv' }]);
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
	it('isolates product failures while preserving measured analytics', async () => {
		const fetch: typeof globalThis.fetch = async (input, init) => {
			const url = URL.parse(input instanceof Request ? input.url : input.toString());
			if (url === null) return new Response(null, { status: 400 });
			return url.pathname.endsWith('/graphql')
				? graphQlResponse(typeof init?.body === 'string' ? init.body : '')
				: inventoryResponse(url.pathname);
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
	});
});
