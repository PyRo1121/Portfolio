import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import { createWorkspaceSignals } from './dashboard-navigation';
import { createViewerActivityProjection } from './dashboard-viewer-time';

const snapshot = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-13T18:00:00Z'), 'octocat', 'test')
);

describe('createWorkspaceSignals', () => {
	it('exposes exact existing evidence as navigation information scent', () => {
		const projection = createViewerActivityProjection(snapshot, 'America/New_York');
		const signals = createWorkspaceSignals(snapshot, projection);
		expect(signals.brief.value).toBe(String(snapshot.totals.commits));
		expect(signals.delivery.value).toBe(String(snapshot.intelligence.delivery.outcomes));
		expect(signals.repositories.value).toBe(
			String(snapshot.intelligence.account.activeRepositories)
		);
		expect(signals.activity.value).toBe(String(snapshot.intelligence.commits.length));
	});
});
