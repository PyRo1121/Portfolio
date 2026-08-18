import { describe, expect, it } from 'vitest';
import type { CommitSignal } from './github-intelligence';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import { createTodayChangeScope, createTodayIntelligence } from './dashboard-today';
import { createViewerActivityProjection } from './dashboard-viewer-time';

const snapshot = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-13T08:00:00Z'), 'octocat', 'test')
);

function commitAt(
	committedAt: string,
	additions: number,
	deletions: number,
	changedFiles: number
): CommitSignal {
	return {
		sha: committedAt,
		shortSha: committedAt.slice(0, 7),
		message: 'Hourly change fixture',
		committedAt,
		repository: 'octocat/signal-garden',
		repositoryUrl: 'https://github.com/octocat/signal-garden',
		url: 'https://github.com/octocat/signal-garden/commit/hourly',
		isPrivate: true,
		additions,
		deletions,
		changedFiles
	};
}

describe('createTodayIntelligence', () => {
	it('uses the viewer-local day and preserves exact totals', () => {
		const projection = createViewerActivityProjection(snapshot, 'America/New_York');
		const today = createTodayIntelligence(snapshot, projection);
		expect(today.date).toBe('2026-08-13');
		expect(today.hourlyCommits).toHaveLength(24);
		expect(today.hourlyChanges).toHaveLength(24);
		expect(today.repositories.reduce((total, repository) => total + repository.commits, 0)).toBe(
			today.commits
		);
		expect(today.additions + today.deletions).toBeGreaterThanOrEqual(0);
	});

	it('buckets additions, deletions, and files by viewer-local hour', () => {
		const withHours = {
			...snapshot,
			intelligence: {
				...snapshot.intelligence,
				commits: [
					commitAt('2026-08-13T09:00:00.000Z', 40, 10, 3),
					commitAt('2026-08-13T14:00:00.000Z', 5, 1, 1)
				]
			}
		};
		const projection = createViewerActivityProjection(withHours, 'America/New_York');
		const today = createTodayIntelligence(withHours, projection);
		expect(today.hourlyChanges[5]).toEqual({
			commits: 1,
			additions: 40,
			deletions: 10,
			changedFiles: 3
		});
		expect(today.hourlyChanges[10]).toEqual({
			commits: 1,
			additions: 5,
			deletions: 1,
			changedFiles: 1
		});
		expect(today.additions).toBe(45);
	});
});

describe('createTodayChangeScope', () => {
	it('keeps day totals until an hour is inspected', () => {
		const withHours = {
			...snapshot,
			intelligence: {
				...snapshot.intelligence,
				commits: [
					commitAt('2026-08-13T09:00:00.000Z', 40, 10, 3),
					commitAt('2026-08-13T14:00:00.000Z', 5, 1, 1)
				]
			}
		};
		const projection = createViewerActivityProjection(withHours, 'America/New_York');
		const today = createTodayIntelligence(withHours, projection);
		expect(createTodayChangeScope(today, null)).toEqual({
			_tag: 'Day',
			caption: 'Current local day',
			commits: 2,
			additions: 45,
			deletions: 11,
			changedFiles: 4
		});
		expect(createTodayChangeScope(today, 5)).toEqual({
			_tag: 'Hour',
			caption: '5:00 AM',
			commits: 1,
			additions: 40,
			deletions: 10,
			changedFiles: 3
		});
	});
});
