import { describe, expect, it } from 'vitest';
import { createDemoIntelligence } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import { createViewerActivityProjection, commitsForViewerDate } from './dashboard-viewer-time';

const snapshot = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-13T18:00:00Z'), 'octocat', 'test')
);

describe('createViewerActivityProjection', () => {
	it('labels the projection with the viewer timezone and active abbreviation', () => {
		const newYork = createViewerActivityProjection(snapshot, 'America/New_York');
		const tokyo = createViewerActivityProjection(snapshot, 'Asia/Tokyo');
		expect(newYork.timeLabel).toBe('EDT');
		expect(tokyo.timeLabel).toBe('GMT+9');
		expect(newYork.timeZone).toBe('America/New_York');
		expect(tokyo.timeZone).toBe('Asia/Tokyo');
		expect(newYork.days).toHaveLength(7);
		expect(tokyo.days).toHaveLength(7);
	});

	it('places one instant into each viewer local date', () => {
		const commit = snapshot.intelligence.commits[0];
		// Test-setup invariant: the demo snapshot must always contain a commit.
		if (commit === undefined) throw new Error('demo snapshot has no commits');
		const newYork = createViewerActivityProjection(snapshot, 'America/New_York');
		const tokyo = createViewerActivityProjection(snapshot, 'Asia/Tokyo');
		const newYorkDate = new Intl.DateTimeFormat('en-CA', {
			timeZone: newYork.timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
			.format(new Date(commit.committedAt))
			.replaceAll('/', '-');
		const tokyoDate = new Intl.DateTimeFormat('en-CA', {
			timeZone: tokyo.timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
			.format(new Date(commit.committedAt))
			.replaceAll('/', '-');
		expect(commitsForViewerDate([commit], newYorkDate, newYork.timeZone)).toEqual([commit]);
		expect(commitsForViewerDate([commit], tokyoDate, tokyo.timeZone)).toEqual([commit]);
	});
});
