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
			other: 1
		});
	});

	it('excludes automated dynamic runs from user-triggered verification totals', async () => {
		const requested: string[] = [];
		const fetch = (async (input: RequestInfo | URL) => {
			const url = String(input);
			requested.push(url);
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
						created_at: '2026-08-14T20:00:00.000Z'
					}
				]
			});
		}) as typeof globalThis.fetch;
		const coverage = await Effect.runPromise(
			fetchWorkflowCoverage(
				fetch,
				Redacted.make('secret'),
				Redacted.make('checks-secret'),
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
		expect(requested).toHaveLength(2);
	});
});
