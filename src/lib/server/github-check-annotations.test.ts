import { Effect, Redacted } from 'effect';
import { describe, expect, it } from 'vitest';
import type { WorkflowRunInput } from '$lib/domain/github-intelligence';
import { fetchWorkflowAnnotations } from './github-check-annotations';

function run(conclusion: string | null): WorkflowRunInput {
	return {
		id: 42,
		name: 'Weeknote CI',
		title: 'Ship verification evidence',
		repository: 'octocat/portfolio',
		url: 'https://github.com/octocat/portfolio/actions/runs/42',
		event: 'push',
		status: 'completed',
		conclusion,
		branch: 'main',
		createdAt: '2026-08-14T20:00:00.000Z'
	};
}

const token = Redacted.make('secret');

describe('fetchWorkflowAnnotations', () => {
	it('links a bounded failure annotation to its exact workflow job and run', async () => {
		const requested: string[] = [];
		const longMessage = `GitHub billing evidence: ${'x'.repeat(900)}`;
		const fetch = (async (input: RequestInfo | URL) => {
			const url = String(input);
			requested.push(url);
			if (url.includes('/actions/runs/42/jobs')) {
				return Response.json({
					total_count: 1,
					jobs: [
						{
							id: 99,
							name: 'Check, lint, test, and build',
							status: 'completed',
							conclusion: 'failure',
							html_url: 'https://github.com/octocat/portfolio/actions/runs/42/job/99'
						}
					]
				});
			}
			if (url.includes('/check-runs/99/annotations')) {
				return Response.json([
					{
						path: '.github',
						start_line: 1,
						end_line: 1,
						annotation_level: 'failure',
						title: '',
						message: longMessage
					}
				]);
			}
			return new Response('not found', { status: 404 });
		}) as typeof globalThis.fetch;

		const result = await Effect.runPromise(
			fetchWorkflowAnnotations(fetch, token, [run('failure')])
		);
		expect(result).toMatchObject({
			state: 'Observed',
			targetedRuns: 1,
			truncated: false,
			evidence: [
				{
					runId: 42,
					repository: 'octocat/portfolio',
					jobName: 'Check, lint, test, and build',
					level: 'failure',
					path: '.github',
					messageTruncated: true
				}
			]
		});
		expect(result.evidence[0]?.message).toHaveLength(800);
		expect(requested).toEqual([
			expect.stringContaining('/actions/runs/42/jobs?filter=all&per_page=100&page=1'),
			expect.stringContaining('/check-runs/99/annotations?per_page=100&page=1')
		]);
	});

	it('does not call GitHub checks when no failed run needs annotations', async () => {
		let calls = 0;
		const fetch = (async () => {
			calls += 1;
			return new Response('unexpected', { status: 500 });
		}) as typeof globalThis.fetch;
		const result = await Effect.runPromise(
			fetchWorkflowAnnotations(fetch, token, [run('success')])
		);
		expect(result).toMatchObject({ state: 'Observed', targetedRuns: 0, evidence: [] });
		expect(calls).toBe(0);
	});

	it('isolates unavailable annotation requests from workflow totals', async () => {
		const fetch = (async () =>
			new Response('forbidden', { status: 403 })) as typeof globalThis.fetch;
		const result = await Effect.runPromise(
			fetchWorkflowAnnotations(fetch, token, [run('failure')])
		);
		expect(result).toMatchObject({
			state: 'Unavailable',
			targetedRuns: 1,
			evidence: [],
			truncated: false,
			detail:
				'Check-run annotations are permission-limited; the server token requires Checks: read.'
		});
	});
});
