import { describe, expect, it } from 'vitest';
import { createWeeklySnapshot, startOfRollingWeek } from './github-stats';
import type {
	GitHubActivityEvent,
	GitHubProfile,
	GitHubRepository,
	PushMeasurement
} from './github-stats';

const profile: GitHubProfile = {
	login: 'octocat',
	name: 'Octo Cat',
	avatarUrl: 'https://example.test/avatar.png',
	profileUrl: 'https://github.com/octocat',
	publicRepos: 3,
	followers: 8
};

const repositories: ReadonlyArray<GitHubRepository> = [
	{
		fullName: 'octocat/orbit',
		name: 'orbit',
		createdAt: new Date('2026-08-11T10:00:00Z'),
		language: 'Svelte',
		stars: 4,
		forks: 1,
		url: 'https://github.com/octocat/orbit'
	}
];

const events: ReadonlyArray<GitHubActivityEvent> = [
	{
		_tag: 'Push',
		createdAt: new Date('2026-08-10T09:00:00Z'),
		repo: 'octocat/orbit',
		before: 'before',
		head: 'head'
	},
	{
		_tag: 'RepositoryCreated',
		createdAt: new Date('2026-08-11T10:00:00Z'),
		repo: 'octocat/orbit'
	},
	{
		_tag: 'PullRequest',
		createdAt: new Date('2026-08-12T20:00:00Z'),
		repo: 'octocat/orbit',
		action: 'closed',
		merged: true
	},
	{
		_tag: 'Push',
		createdAt: new Date('2026-08-09T23:59:00Z'),
		repo: 'octocat/orbit',
		before: 'old-before',
		head: 'old-head'
	}
];

const measurements: ReadonlyArray<PushMeasurement> = [
	{
		repo: 'octocat/orbit',
		head: 'head',
		createdAt: new Date('2026-08-10T09:00:00Z'),
		commits: 3,
		additions: 120,
		deletions: 25
	}
];

describe('startOfRollingWeek', () => {
	it('returns canonical UTC midnight six days before today', () => {
		expect(startOfRollingWeek(new Date('2026-08-13T07:44:00Z')).toISOString()).toBe(
			'2026-08-07T00:00:00.000Z'
		);
	});

	it('does not vary the shared cache boundary by daylight-saving season', () => {
		expect(startOfRollingWeek(new Date('2026-01-13T07:44:00Z')).toISOString()).toBe(
			'2026-01-07T00:00:00.000Z'
		);
	});
});

describe('createWeeklySnapshot', () => {
	it('aggregates events in the canonical rolling seven-day collection window', () => {
		const snapshot = createWeeklySnapshot({
			now: new Date('2026-08-13T07:44:00Z'),
			profile,
			repositories,
			events,
			pushMeasurements: measurements
		});

		expect(snapshot.totals).toMatchObject({
			commits: 3,
			pushes: 2,
			additions: 120,
			deletions: 25,
			churn: 145,
			repositoriesCreated: 1,
			pullRequestsMerged: 1,
			events: 4
		});
		expect(snapshot.period).toMatchObject({
			startIso: '2026-08-07T00:00:00.000Z',
			endIso: '2026-08-14T00:00:00.000Z'
		});
		expect(snapshot.dailyActivity.map((day) => day.activity)).toEqual([0, 0, 1, 1, 1, 1, 0]);
		expect(snapshot.topRepositories[0]).toMatchObject({
			name: 'orbit',
			commits: 3,
			events: 4
		});
		expect(snapshot.coverage).toEqual({ measuredPushes: 1, totalPushes: 2 });
	});
});
