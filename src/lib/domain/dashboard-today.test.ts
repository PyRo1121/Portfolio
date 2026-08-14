import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import { createTodayIntelligence } from './dashboard-today';
import { createViewerActivityProjection } from './dashboard-viewer-time';

const snapshot = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-13T08:00:00Z'), 'octocat', 'test')
);

describe('createTodayIntelligence', () => {
	it('uses the viewer-local day and preserves exact totals', () => {
		const projection = createViewerActivityProjection(snapshot, 'America/New_York');
		const today = createTodayIntelligence(snapshot, projection);
		expect(today.date).toBe('2026-08-13');
		expect(today.hourlyCommits).toHaveLength(24);
		expect(today.repositories.reduce((total, repository) => total + repository.commits, 0)).toBe(
			today.commits
		);
		expect(today.additions + today.deletions).toBeGreaterThanOrEqual(0);
	});
});
