import { Effect, Redacted } from 'effect';
import { describe, expect, it } from 'vitest';
import { fetchWorkflowCoverage, summarizeRepositoryWorkflows } from './github-actions';
import type {
	RepositoryIntelligenceInput,
	WorkflowRunInput
} from '$lib/domain/github-intelligence';

const run = (id: number, conclusion: string | null, status = 'completed'): WorkflowRunInput => ({
	id,
	name: 'CI',
	title: `Run ${id}`,
	repository: 'octocat/project',
	url: `https://github.com/octocat/project/actions/runs/${id}`,
	event: 'push',
	status,
	conclusion,
	branch: 'main',
	headSha: id.toString(16).padStart(40, '0'),
	createdAt: `2026-08-1${id}T00:00:00Z`
});

const repository: RepositoryIntelligenceInput = {
	name: 'portfolio',
	fullName: 'octocat/portfolio',
	url: 'https://github.com/octocat/portfolio',
	description: null,
	isPrivate: true,
	isFork: false,
	isArchived: false,
	imageUrl: 'https://example.test/portfolio.png',
	createdAt: new Date('2026-08-01T00:00:00.000Z'),
	pushedAt: new Date('2026-08-14T20:00:00.000Z'),
	primaryLanguage: 'TypeScript',
	primaryLanguageColor: '#3178c6',
	languages: [],
	stars: 0,
	forks: 0,
	diskUsageKb: 1,
	openIssues: 0,
	openPullRequests: 0,
	defaultBranch: 'main',
	previousCommits: 0,
	commits: [
		{
			sha: 'abc123',
			message: 'Ship portfolio',
			committedAt: new Date('2026-08-14T19:00:00.000Z'),
			url: 'https://github.com/octocat/portfolio/commit/abc123',
			additions: 1,
			deletions: 0,
			changedFiles: 1
		}
	]
};

describe('summarizeRepositoryWorkflows', () => {
	it('separates verified, failed, cancelled, and incomplete checks', () => {
		const summary = summarizeRepositoryWorkflows('octocat/project', [
			run(1, 'success'),
			run(2, 'failure'),
			run(3, 'timed_out'),
			run(4, 'cancelled'),
			run(5, null, 'in_progress')
		]);

		expect(summary).toEqual({
			repository: 'octocat/project',
			total: 5,
			successful: 1,
			failed: 2,
			cancelled: 1,
			other: 1,
			latestRuns: [run(5, null, 'in_progress')],
			recoveredFailures: 0
		});
	});

	it('retains the latest run per workflow and counts failure-to-success recovery sequences', () => {
		const ciFailure = { ...run(1, 'failure'), name: 'CI' };
		const ciRecovery = { ...run(2, 'success'), name: 'CI' };
		const releaseSuccess = { ...run(3, 'success'), name: 'Release' };
		const releaseFailure = { ...run(4, 'failure'), name: 'Release' };

		const summary = summarizeRepositoryWorkflows('octocat/project', [
			ciFailure,
			ciRecovery,
			releaseSuccess,
			releaseFailure
		]);

		expect(summary.latestRuns.map((workflow) => workflow.id)).toEqual([4, 2]);
		expect(summary.recoveredFailures).toBe(1);
	});

	it('excludes automated dynamic runs and uses the repository credential', async () => {
		const requested: Array<{
			readonly url: string;
			readonly authorization: string | null;
		}> = [];
		const resolvedRepositories: string[] = [];
		const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			requested.push({
				url,
				authorization: new Headers(init?.headers).get('Authorization')
			});
			return Response.json({
				total_count: 2,
				workflow_runs: [
					{
						id: 1,
						name: 'Weeknote CI',
						display_title: 'Ship portfolio',
						event: 'push',
						status: 'completed',
						conclusion: 'success',
						html_url: 'https://github.com/octocat/portfolio/actions/runs/1',
						head_branch: 'main',
						head_sha: '1111111111111111111111111111111111111111',
						created_at: '2026-08-14T20:00:00.000Z'
					},
					{
						id: 2,
						name: 'Dependabot Updates',
						display_title: 'Automated update',
						event: 'dynamic',
						status: 'completed',
						conclusion: 'failure',
						html_url: 'https://github.com/octocat/portfolio/actions/runs/2',
						head_branch: 'main',
						head_sha: '2222222222222222222222222222222222222222',
						created_at: '2026-08-14T20:00:00.000Z'
					}
				]
			});
		}) as typeof globalThis.fetch;
		const coverage = await Effect.runPromise(
			fetchWorkflowCoverage(
				fetch,
				(repositoryName) => {
					resolvedRepositories.push(repositoryName);
					return Redacted.make('repository-secret');
				},
				() => Redacted.make('checks-secret'),
				'octocat',
				[repository],
				new Date('2026-08-08T00:00:00.000Z'),
				new Date('2026-08-15T00:00:00.000Z')
			)
		);
		expect(coverage.current).toMatchObject({
			total: 1,
			successful: 1,
			failed: 0,
			annotations: { state: 'Observed', targetedRuns: 0, evidence: [] }
		});
		expect(coverage.current.recent.map((workflow) => workflow.event)).toEqual(['push']);
		expect(coverage.current.repositories[0]).toMatchObject({
			repository: 'octocat/portfolio',
			latestRuns: [{ id: 1, conclusion: 'success' }],
			recoveredFailures: 0
		});
		expect(resolvedRepositories).toEqual(['octocat/portfolio', 'octocat/portfolio']);
		expect(requested).toHaveLength(2);
		expect(
			requested.every(({ authorization }) => authorization === 'Bearer repository-secret')
		).toBe(true);
	});
});
