import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from '$lib/domain/github-intelligence';
import { createDemoSnapshot } from '$lib/domain/github-stats';
import { resolveObservedCareerStoryEvidence } from './career-story-evidence';
import { dashboardSnapshotCacheFor, type DashboardCacheStore } from './dashboard-snapshot-cache';

function storeFixture(): DashboardCacheStore {
	const values = new Map<string, string>();
	return {
		get: async (key) => values.get(key) ?? null,
		put: async (key, value) => {
			values.set(key, value);
		}
	};
}

function liveSnapshot() {
	const snapshot = createDemoIntelligence(
		createDemoSnapshot(new Date('2026-08-14T12:00:00.000Z'), 'octocat', 'test')
	);
	return { ...snapshot, source: { _tag: 'Live' as const, label: 'Live test evidence' } };
}

describe('server career story evidence resolution', () => {
	it('returns canonical metadata only for a URL in the live cache', async () => {
		const store = storeFixture();
		const snapshot = liveSnapshot();
		await dashboardSnapshotCacheFor(store).refresh(
			'octocat',
			null,
			new Date('2026-08-14T20:00:00.000Z'),
			async () => snapshot
		);
		const selectedUrl = snapshot.intelligence.delivery.artifacts.find(
			(artifact) => artifact.kind !== 'WorkflowRun' && artifact.status === 'shipped'
		)?.url;
		expect(selectedUrl).toBeDefined();
		const exit = await Effect.runPromiseExit(
			resolveObservedCareerStoryEvidence(
				store,
				'octocat',
				selectedUrl!,
				new Date('2026-08-14T20:01:00.000Z')
			)
		);
		expect(exit).toMatchObject({
			_tag: 'Success',
			value: { _tag: 'Observed', url: selectedUrl, observedAt: '2026-08-14T20:01:00.000Z' }
		});
	});

	it('rejects injected URLs but permits explicitly clearing evidence without a cache', async () => {
		const store = storeFixture();
		const rejected = await Effect.runPromiseExit(
			resolveObservedCareerStoryEvidence(
				store,
				'octocat',
				'https://example.test/injected',
				new Date()
			)
		);
		expect(rejected._tag).toBe('Failure');
		const cleared = await Effect.runPromise(
			resolveObservedCareerStoryEvidence(store, 'octocat', null, new Date())
		);
		expect(cleared).toBeNull();
	});
});
