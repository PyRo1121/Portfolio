import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from '$lib/domain/github-intelligence';
import { createDemoSnapshot } from '$lib/domain/github-stats';
import { DashboardSnapshotCache, type DashboardCacheStore } from './dashboard-snapshot-cache';

function liveSnapshot(now = new Date('2026-08-13T08:00:00Z')) {
	const snapshot = createDemoIntelligence(createDemoSnapshot(now, 'octocat', 'cache test'));
	return { ...snapshot, source: { _tag: 'Live' as const, label: 'Private account signal' } };
}

function cacheFixture() {
	const values = new Map<string, string>();
	const store: DashboardCacheStore = {
		get: async (key) => values.get(key) ?? null,
		put: async (key, value) => {
			values.set(key, value);
		}
	};
	return {
		values,
		cache: new DashboardSnapshotCache(store, { freshnessMs: 60_000 })
	};
}

function parseJson<Value>(encoded: string): Value {
	try {
		return JSON.parse(encoded) as Value;
	} catch (cause) {
		throw new Error('Test cache envelope was not valid JSON.', { cause });
	}
}

describe('DashboardSnapshotCache', () => {
	it('persists and decodes a live snapshot through its private store', async () => {
		const { cache, values } = cacheFixture();
		const snapshot = liveSnapshot();
		const result = await cache.refresh('octocat', null, new Date(), async () => snapshot);
		expect(result._tag).toBe('Fresh');
		expect(values.size).toBe(1);
		expect((await cache.read('octocat'))?.snapshot).toEqual(snapshot);
	});

	it('hydrates repository artwork for snapshots written before image support', async () => {
		const { cache, values } = cacheFixture();
		await cache.refresh('octocat', null, new Date(), async () => liveSnapshot());
		const [key] = values.keys();
		expect(key).toBeDefined();
		const envelope = parseJson<{
			snapshot: {
				profile: { avatarUrl: string };
				intelligence: { repositories: Array<Record<string, unknown>> };
			};
		}>(values.get(key!)!);
		for (const repository of envelope.snapshot.intelligence.repositories) {
			delete repository['imageUrl'];
		}
		values.set(key!, JSON.stringify(envelope));
		const cached = await cache.read('octocat');
		expect(
			cached?.snapshot.intelligence.repositories.every(
				(repository) => repository.imageUrl === cached.snapshot.profile.avatarUrl
			)
		).toBe(true);
	});

	it('hydrates legacy snapshots with explicitly unavailable repository collection health', async () => {
		const { cache, values } = cacheFixture();
		await cache.refresh('octocat', null, new Date(), async () => liveSnapshot());
		const [key] = values.keys();
		expect(key).toBeDefined();
		const envelope = parseJson<{
			snapshot: { intelligence: Record<string, unknown> };
		}>(values.get(key!)!);
		delete envelope.snapshot.intelligence['repositoryCollection'];
		values.set(key!, JSON.stringify(envelope));
		expect((await cache.read('octocat'))?.snapshot.intelligence.repositoryCollection).toMatchObject(
			{
				state: 'Unavailable',
				freshRepositories: 0
			}
		);
	});

	it('hydrates pre-observability collection health with unavailable cost evidence', async () => {
		const { cache, values } = cacheFixture();
		await cache.refresh('octocat', null, new Date(), async () => liveSnapshot());
		const [key] = values.keys();
		expect(key).toBeDefined();
		const envelope = parseJson<{
			snapshot: {
				intelligence: { repositoryCollection: Record<string, unknown> };
			};
		}>(values.get(key!)!);
		delete envelope.snapshot.intelligence.repositoryCollection['graphQL'];
		delete envelope.snapshot.intelligence.repositoryCollection['oldestStaleAt'];
		values.set(key!, JSON.stringify(envelope));
		expect((await cache.read('octocat'))?.snapshot.intelligence.repositoryCollection).toMatchObject(
			{
				oldestStaleAt: null,
				graphQL: { state: 'Unavailable', points: 0, successfulRequests: 0 }
			}
		);
	});

	it('shares one in-flight refresh across concurrent callers', async () => {
		const { cache } = cacheFixture();
		let calls = 0;
		const loader = async () => {
			calls += 1;
			await new Promise((resolve) => setTimeout(resolve, 10));
			return liveSnapshot();
		};
		await Promise.all([
			cache.refresh('octocat', null, new Date(), loader),
			cache.refresh('octocat', null, new Date(), loader)
		]);
		expect(calls).toBe(1);
	});

	it('keeps the last-known-good snapshot when refresh fails', async () => {
		const { cache } = cacheFixture();
		const snapshot = liveSnapshot();
		await cache.refresh('octocat', null, new Date(), async () => snapshot);
		const cached = await cache.read('octocat');
		const result = await cache.refresh(
			'octocat',
			cached,
			new Date('2026-08-13T09:10:00Z'),
			async () => Promise.reject(new Error('upstream timeout')),
			true
		);
		expect(result._tag).toBe('Unavailable');
		expect((await cache.read('octocat'))?.snapshot).toEqual(snapshot);
	});

	it('rejects unknown cache versions instead of trusting forward data', async () => {
		const { cache, values } = cacheFixture();
		await cache.refresh('octocat', null, new Date(), async () => liveSnapshot());
		const [key] = values.keys();
		expect(key).toBeDefined();
		const envelope = parseJson<Record<string, unknown>>(values.get(key!)!);
		values.set(key!, JSON.stringify({ ...envelope, version: 2 }));
		expect(await cache.read('octocat')).toBeNull();
	});

	it('rejects malformed cache values', async () => {
		const { cache, values } = cacheFixture();
		values.set('unused', '{not-json');
		await cache.refresh('octocat', null, new Date(), async () => liveSnapshot());
		const [key] = [...values.keys()].filter((candidate) => candidate !== 'unused');
		expect(key).toBeDefined();
		values.set(key!, '{not-json');
		expect(await cache.read('octocat')).toBeNull();
	});
});
