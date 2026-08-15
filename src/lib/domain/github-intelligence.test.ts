import { describe, expect, it } from 'vitest';
import type { GitHubIntelligenceInput } from './github-intelligence';
import { createDemoIntelligence, createGitHubDashboardSnapshot } from './github-intelligence';
import { createDemoSnapshot } from './github-stats';

const now = new Date('2026-08-13T08:00:00Z');

describe('createGitHubDashboardSnapshot', () => {
	it('projects private repository commits, churn, calendar, and account totals', () => {
		const base = createDemoSnapshot(now, 'octocat', 'test');
		const input: GitHubIntelligenceInput = {
			repositories: [
				{
					name: 'private-work',
					fullName: 'octocat/private-work',
					url: 'https://github.com/octocat/private-work',
					description: 'Private work',
					isPrivate: true,
					isFork: false,
					isArchived: false,
					imageUrl: 'https://example.test/private-work.png',
					createdAt: new Date('2026-01-01T00:00:00Z'),
					pushedAt: now,
					primaryLanguage: 'TypeScript',
					primaryLanguageColor: '#3178c6',
					languages: [{ name: 'TypeScript', color: '#3178c6', bytes: 1_000 }],
					stars: 0,
					forks: 0,
					diskUsageKb: 2_048,
					openIssues: 2,
					openPullRequests: 1,
					defaultBranch: 'main',
					previousCommits: 1,
					commits: [
						{
							sha: 'abc1234567890',
							message: 'Ship private work',
							committedAt: new Date('2026-08-11T10:00:00Z'),
							url: 'https://github.com/octocat/private-work/commit/abc',
							additions: 90,
							deletions: 20,
							changedFiles: 4
						},
						{
							sha: 'def1234567890',
							message: 'Refine private work',
							committedAt: new Date('2026-08-12T11:00:00Z'),
							url: 'https://github.com/octocat/private-work/commit/def',
							additions: 30,
							deletions: 10,
							changedFiles: 2
						}
					]
				}
			],
			repositoryCollection: {
				totalRepositories: 1,
				privateRepositories: 1,
				publicRepositories: 0,
				freshRepositories: 1,
				staleRepositories: [],
				graphQLCost: 12,
				successfulGraphQLRequests: 3
			},
			contributionDays: [
				{ date: '2026-08-11', count: 2 },
				{ date: '2026-08-12', count: 3 }
			],
			totalYearContributions: 5,
			restrictedWeekContributions: 2,
			previousWeekContributions: 1,
			collaboration: {
				authoredPullRequests: 1,
				mergedPullRequests: 1,
				reviewedPullRequests: 0,
				authoredIssues: 0,
				commentedItems: 1,
				items: []
			},
			delivery: {
				mergedPullRequests: 1,
				authoredMergedPullRequests: 1,
				maintainerMergedPullRequests: 0,
				automatedMergedPullRequests: 0,
				mergedPullRequestsTruncated: false,
				closedIssues: 0,
				previousMergedPullRequests: 0,
				previousClosedIssues: 0,
				outcomes: [
					{
						kind: 'PullRequest',
						title: 'Ship private work',
						number: 1,
						repository: 'octocat/private-work',
						url: 'https://github.com/octocat/private-work/pull/1',
						occurredAt: now.toISOString(),
						isPrivate: true,
						responsibility: 'Authored'
					}
				],
				releases: [],
				previousReleaseCount: 0,
				workflows: {
					coveredRepositories: 1,
					totalRepositories: 1,
					unavailableRepositories: [],
					truncated: false,
					current: {
						total: 2,
						successful: 1,
						failed: 1,
						cancelled: 0,
						other: 0,
						repositories: [],
						recent: [],
						annotations: {
							state: 'Observed',
							targetedRuns: 0,
							evidence: [],
							truncated: false,
							detail: 'No failed workflow runs required annotation collection.'
						}
					},
					previous: { total: 0, successful: 0, failed: 0, cancelled: 0, other: 0 }
				}
			},
			rateLimit: { remaining: 4_900, limit: 5_000, resetAt: now.toISOString() }
		};
		const snapshot = createGitHubDashboardSnapshot(base, input);

		expect(snapshot.totals).toMatchObject({
			commits: 2,
			additions: 120,
			deletions: 30,
			churn: 150
		});
		expect(snapshot.intelligence.account).toMatchObject({
			ownedRepositories: 1,
			privateRepositories: 1,
			activeRepositories: 1,
			openIssues: 2,
			openPullRequests: 1
		});
		expect(snapshot.intelligence.repositoryCollection).toMatchObject({
			state: 'Observed',
			totalRepositories: 1,
			freshRepositories: 1,
			staleRepositories: [],
			oldestStaleAt: null,
			graphQL: { state: 'Measured', points: 12, successfulRequests: 3 }
		});
		expect(snapshot.intelligence.comparison).toMatchObject({
			currentCommits: 2,
			previousCommits: 1,
			commitDelta: 1,
			direction: 'up'
		});
		expect(snapshot.intelligence.delivery).toMatchObject({
			outcomes: 1,
			workflowPassRate: 50,
			outcomeDelta: 1
		});
		expect(snapshot.intelligence.repositories[0]).toMatchObject({
			commits: 2,
			additions: 120,
			deletions: 30,
			changedFiles: 6
		});
		expect(snapshot.dailyActivity.map((day) => day.commits)).toEqual([0, 0, 0, 0, 1, 1, 0]);

		const staleSnapshot = createGitHubDashboardSnapshot(base, {
			...input,
			repositoryCollection: {
				...input.repositoryCollection,
				freshRepositories: 0,
				staleRepositories: [
					{ repository: 'octocat/private-work', cachedAt: '2026-08-13T07:30:00.000Z' }
				],
				graphQLCost: 10,
				successfulGraphQLRequests: 2
			}
		});
		expect(staleSnapshot.intelligence.repositoryCollection).toMatchObject({
			state: 'Unavailable',
			staleRepositories: ['octocat/private-work'],
			oldestStaleAt: '2026-08-13T07:30:00.000Z',
			graphQL: {
				state: 'Unavailable',
				points: 10,
				successfulRequests: 2,
				detail: expect.stringContaining('Failed request cost was not returned.')
			}
		});
	});

	it('keeps demo repository collection explicitly unavailable', () => {
		const snapshot = createDemoIntelligence(createDemoSnapshot(now, 'octocat', 'test'));
		expect(snapshot.intelligence.repositoryCollection).toMatchObject({
			state: 'Unavailable',
			freshRepositories: 0,
			staleRepositories: []
		});
	});
});
