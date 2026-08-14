import { describe, expect, it } from 'vitest';
import type { CommitSignal, EngineeringDay } from './github-intelligence';
import { latestActiveEngineeringDate } from './dashboard-ledger';
import { commitsForViewerDate } from './dashboard-viewer-time';

const commit = (committedAt: string): CommitSignal => ({
	sha: committedAt,
	shortSha: 'abc1234',
	message: 'Test Eastern grouping',
	committedAt,
	repository: 'octocat/weeknote',
	repositoryUrl: 'https://github.com/octocat/weeknote',
	url: 'https://github.com/octocat/weeknote/commit/abc',
	isPrivate: true,
	additions: 4,
	deletions: 1,
	changedFiles: 1
});

describe('dashboard ledger', () => {
	it('groups one instant under the viewer-local date', () => {
		const lateUtc = commit('2026-08-13T02:30:00Z');
		expect(commitsForViewerDate([lateUtc], '2026-08-12', 'America/New_York')).toEqual([lateUtc]);
		expect(commitsForViewerDate([lateUtc], '2026-08-13', 'Asia/Tokyo')).toEqual([lateUtc]);
	});

	it('opens on the latest active engineering day', () => {
		const day = (date: string, commits: number): EngineeringDay => ({
			date,
			label: 'THU',
			longLabel: 'Thursday',
			commits,
			additions: 0,
			deletions: 0,
			totalChanges: 0,
			height: '2%'
		});
		const days = [day('2026-08-11', 3), day('2026-08-12', 0), day('2026-08-13', 2)];
		expect(latestActiveEngineeringDate(days)).toBe('2026-08-13');
	});
});
