import { describe, expect, it } from 'vitest';
import { summarizeRepositoryWorkflows } from './github-actions';
import type { WorkflowRunInput } from '$lib/domain/github-intelligence';

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
});
