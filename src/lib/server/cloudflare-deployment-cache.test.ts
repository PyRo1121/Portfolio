import { describe, expect, it } from 'vitest';
import type { CloudflareDeploymentSnapshot } from '$lib/domain/cloudflare-deployments';
import { CloudflareDeploymentCache } from './cloudflare-deployment-cache';
import type { DashboardCacheStore } from './dashboard-snapshot-cache';

function snapshot(
	workerName: string,
	state: 'Observed' | 'Unavailable'
): CloudflareDeploymentSnapshot {
	return {
		generatedAt: '2026-08-15T09:00:00.000Z',
		workers: [
			{
				workerName,
				state,
				detail: state,
				deploymentId: state === 'Observed' ? 'deployment-id' : null,
				createdAt: null,
				source: null,
				strategy: null,
				authorEmail: null,
				message: null,
				triggeredBy: null,
				versions: [],
				versionsTruncated: false,
				evidenceUrl: 'https://dash.cloudflare.com/example'
			}
		]
	};
}

describe('CloudflareDeploymentCache', () => {
	it('refuses to replace complete evidence with a partially unavailable snapshot', async () => {
		const values = new Map<string, string>();
		const store: DashboardCacheStore = {
			get: (key) => Promise.resolve(values.get(key) ?? null),
			put: (key, value) => {
				values.set(key, value);
				return Promise.resolve();
			}
		};
		const cache = new CloudflareDeploymentCache(store, 0);
		const complete: CloudflareDeploymentSnapshot = {
			generatedAt: '2026-08-15T09:00:00.000Z',
			workers: [
				...snapshot('weeknote', 'Observed').workers,
				...snapshot('weeknote-warm', 'Observed').workers
			]
		};
		const first = await cache.refresh(
			'account',
			['weeknote', 'weeknote-warm'],
			null,
			new Date(),
			() => Promise.resolve(complete)
		);
		expect(first._tag).toBe('Fresh');
		const cached = await cache.read('account', ['weeknote', 'weeknote-warm']);
		const partial: CloudflareDeploymentSnapshot = {
			generatedAt: '2026-08-15T09:10:00.000Z',
			workers: [
				...snapshot('weeknote', 'Observed').workers,
				...snapshot('weeknote-warm', 'Unavailable').workers
			]
		};
		const refresh = await cache.refresh(
			'account',
			['weeknote', 'weeknote-warm'],
			cached,
			new Date(),
			() => Promise.resolve(partial)
		);
		expect(refresh._tag).toBe('Unavailable');
		expect((await cache.read('account', ['weeknote', 'weeknote-warm']))?.snapshot.generatedAt).toBe(
			'2026-08-15T09:00:00.000Z'
		);
	});

	it('scopes records to the exact Worker set and retains last-known-good evidence', async () => {
		const values = new Map<string, string>();
		const store: DashboardCacheStore = {
			get: (key) => Promise.resolve(values.get(key) ?? null),
			put: (key, value) => {
				values.set(key, value);
				return Promise.resolve();
			}
		};
		const cache = new CloudflareDeploymentCache(store, 0);
		const first = await cache.refresh('account', ['weeknote'], null, new Date(), () =>
			Promise.resolve(snapshot('weeknote', 'Observed'))
		);
		expect(first._tag).toBe('Fresh');
		const cached = await cache.read('account', ['weeknote']);
		expect(cached?.snapshot.workers[0]?.deploymentId).toBe('deployment-id');
		expect(await cache.read('account', ['other-worker'])).toBeNull();

		const failed = await cache.refresh('account', ['weeknote'], cached, new Date(), () =>
			Promise.resolve(snapshot('weeknote', 'Unavailable'))
		);
		expect(failed._tag).toBe('Unavailable');
		expect((await cache.read('account', ['weeknote']))?.snapshot.workers[0]?.deploymentId).toBe(
			'deployment-id'
		);
	});
});
