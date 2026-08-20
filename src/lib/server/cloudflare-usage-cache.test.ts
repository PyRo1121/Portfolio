import { describe, expect, it, vi } from 'vitest';
import type { CloudflareUsageSnapshot } from '$lib/domain/cloudflare-usage';
import { CloudflareUsageCache } from './cloudflare-usage-cache';
import type { DashboardCacheStore } from './dashboard-snapshot-cache';
import type { RefreshLeaseClient } from './refresh-lease-client';

function snapshot(availableProducts: number, measuredMetrics: number): CloudflareUsageSnapshot {
	return {
		generatedAt: '2026-08-14T00:00:00.000Z',
		period: {
			startIso: '2026-08-07T00:00:00.000Z',
			endIso: '2026-08-14T00:00:00.000Z',
			label: 'Last 7 UTC days'
		},
		products: [],
		resources: [],
		metrics: [],
		summary: {
			availableProducts,
			totalProducts: 8,
			provisionedResources: availableProducts,
			measuredMetrics,
			unavailableMetrics: 6 - measuredMetrics
		}
	};
}

describe('CloudflareUsageCache', () => {
	it('defers cross-isolate contention without invoking the provider loader', async () => {
		const store: DashboardCacheStore = {
			get: async () => null,
			put: async () => undefined
		};
		const leaseClient: RefreshLeaseClient = {
			acquire: async () => ({ _tag: 'Busy', retryAfterMs: 20_000 }),
			release: vi.fn()
		};
		const loader = vi.fn(async () => snapshot(8, 6));
		const result = await new CloudflareUsageCache(store, 0, leaseClient).refresh(
			'account',
			null,
			new Date(),
			loader
		);
		expect(result).toMatchObject({ _tag: 'Deferred', retryAfterMs: 5_000 });
		expect(loader).not.toHaveBeenCalled();
	});

	it('retains the last-known-good snapshot when a refresh has no readable evidence', async () => {
		const values = new Map<string, string>();
		const store: DashboardCacheStore = {
			get: (key) => Promise.resolve(values.get(key) ?? null),
			put: (key, value) => {
				values.set(key, value);
				return Promise.resolve();
			}
		};
		const cache = new CloudflareUsageCache(store, 0);
		const first = await cache.refresh('account', null, new Date(), () =>
			Promise.resolve(snapshot(8, 6))
		);
		expect(first._tag).toBe('Fresh');
		const cached = await cache.read('account');
		expect(cached?.snapshot.summary.availableProducts).toBe(8);

		const failed = await cache.refresh('account', cached, new Date(), () =>
			Promise.resolve(snapshot(0, 0))
		);
		expect(failed._tag).toBe('Unavailable');
		expect((await cache.read('account'))?.snapshot.summary.availableProducts).toBe(8);
	});
});
