import { describe, expect, it } from 'vitest';
import {
	createDemoIntelligence,
	type GitHubDashboardSnapshot,
	type RepositoryWorkflowSummaryInput,
	type WorkflowRunInput
} from './github-intelligence';
import { createDemoSnapshot } from './github-stats';
import { createChecksIntelligence } from './dashboard-craft';

const snapshot = createDemoIntelligence(
	createDemoSnapshot(new Date('2026-08-13T08:00:00Z'), 'octocat', 'test')
);

function workflowRun(
	id: number,
	repository: string,
	name: string,
	conclusion: string | null,
	status = 'completed'
): WorkflowRunInput {
	return {
		id,
		name,
		title: `${name} run ${id}`,
		repository,
		url: `https://github.com/${repository}/actions/runs/${id}`,
		event: 'push',
		status,
		conclusion,
		branch: 'main',
		headSha: id.toString(16).padStart(40, '0'),
		createdAt: `2026-08-13T0${id}:00:00.000Z`
	};
}

function withWorkflowSummaries(
	base: GitHubDashboardSnapshot,
	repositories: ReadonlyArray<RepositoryWorkflowSummaryInput>,
	unavailableRepositories: ReadonlyArray<string> = []
): GitHubDashboardSnapshot {
	return {
		...base,
		intelligence: {
			...base.intelligence,
			delivery: {
				...base.intelligence.delivery,
				workflows: {
					...base.intelligence.delivery.workflows,
					coveredRepositories: repositories.length,
					unavailableRepositories,
					current: {
						...base.intelligence.delivery.workflows.current,
						repositories
					}
				}
			}
		}
	};
}

describe('createChecksIntelligence', () => {
	it('prioritizes latest repository state and retains recovery evidence over pass-rate grading', () => {
		const passingRepository = 'octocat/signal-garden';
		const attentionRepository = 'octocat/weeknote';
		const checks = createChecksIntelligence(
			withWorkflowSummaries(snapshot, [
				{
					repository: passingRepository,
					total: 5,
					successful: 3,
					failed: 2,
					cancelled: 0,
					other: 0,
					latestRuns: [workflowRun(5, passingRepository, 'CI', 'success')],
					recoveredFailures: 2
				},
				{
					repository: attentionRepository,
					total: 4,
					successful: 2,
					failed: 1,
					cancelled: 0,
					other: 1,
					latestRuns: [
						workflowRun(4, attentionRepository, 'CI', 'failure'),
						workflowRun(3, attentionRepository, 'Deploy', null, 'in_progress')
					],
					recoveredFailures: 1
				}
			])
		);

		expect(checks.current).toMatchObject({
			repositoriesWithEvidence: 2,
			passingRepositories: 1,
			attentionRepositories: 1,
			runningRepositories: 0,
			activeFailedWorkflows: 1,
			recoveredFailureSequences: 3
		});
		expect(checks.current.repositories.map(({ repository, state }) => [repository, state])).toEqual(
			[
				[attentionRepository, 'attention'],
				[passingRepository, 'passing']
			]
		);
		expect(checks.current.repositories[0]?.workflows).toEqual([
			{ name: 'CI', state: 'attention', stateLabel: 'Failed' },
			{ name: 'Deploy', state: 'running', stateLabel: 'Running' }
		]);
		expect(checks.current.repositories[1]?.workflows).toEqual([
			{ name: 'CI', state: 'passing', stateLabel: 'Passing' }
		]);
		expect(checks).not.toHaveProperty('workflowPassRate');
	});

	it('distinguishes unavailable collection from a repository with no recent workflow run', () => {
		const availableRepository = 'octocat/signal-garden';
		const unavailableRepository = 'octocat/weeknote';
		const checks = createChecksIntelligence(
			withWorkflowSummaries(
				snapshot,
				[
					{
						repository: availableRepository,
						total: 0,
						successful: 0,
						failed: 0,
						cancelled: 0,
						other: 0,
						latestRuns: [],
						recoveredFailures: 0
					}
				],
				[unavailableRepository]
			)
		);

		expect(checks.current.noRecordRepositories).toBe(1);
		expect(checks.current.unavailableRepositories).toBe(1);
		expect(checks.current.repositories).toEqual([
			expect.objectContaining({ repository: availableRepository, state: 'noRecord' }),
			expect.objectContaining({ repository: unavailableRepository, state: 'unavailable' })
		]);
	});
});
