import type {
	GitHubDashboardSnapshot,
	RepositoryWorkflowSummaryInput,
	WorkflowRunInput
} from './github-intelligence';

export type RepositoryCheckState =
	'passing' | 'attention' | 'running' | 'indeterminate' | 'noRecord' | 'unavailable';

type WorkflowCheckSignal = {
	readonly name: string;
	readonly state: RepositoryCheckState;
	readonly stateLabel: string;
};

export type RepositoryCheckSignal = {
	readonly repository: string;
	readonly state: RepositoryCheckState;
	readonly stateLabel: string;
	readonly detail: string;
	readonly latestWorkflowCount: number;
	readonly failedWorkflowNames: ReadonlyArray<string>;
	readonly recoveredFailures: number;
	readonly workflows: ReadonlyArray<WorkflowCheckSignal>;
};

/** Check evidence organized around latest state, recovery, history, and explicit limits. */
export type ChecksIntelligence = {
	readonly current: {
		readonly headline: string;
		readonly detail: string;
		readonly totalRepositories: number;
		readonly repositoriesWithEvidence: number;
		readonly passingRepositories: number;
		readonly attentionRepositories: number;
		readonly runningRepositories: number;
		readonly indeterminateRepositories: number;
		readonly noRecordRepositories: number;
		readonly unavailableRepositories: number;
		readonly activeFailedWorkflows: number;
		readonly recoveredFailureSequences: number;
		readonly repositories: ReadonlyArray<RepositoryCheckSignal>;
	};
	readonly history: {
		readonly totalRuns: number;
		readonly completedRuns: number;
		readonly successfulRuns: number;
		readonly failedRuns: number;
		readonly cancelledRuns: number;
		readonly otherRuns: number;
	};
	readonly context: {
		readonly commits: number;
		readonly medianFilesPerCommit: number;
		readonly medianChangedLinesPerCommit: number;
		readonly reverts: number;
	};
	readonly unavailable: ReadonlyArray<string>;
};

const FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required', 'stale']);
const RUNNING_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);

function median(values: ReadonlyArray<number>): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
		: (sorted[middle] ?? 0);
}

function stateForRun(run: WorkflowRunInput): RepositoryCheckState {
	if (run.conclusion !== null && FAILURE_CONCLUSIONS.has(run.conclusion)) return 'attention';
	if (RUNNING_STATUSES.has(run.status)) return 'running';
	if (run.conclusion === 'success') return 'passing';
	return 'indeterminate';
}

function stateForLatestRuns(latestRuns: ReadonlyArray<WorkflowRunInput>): RepositoryCheckState {
	if (latestRuns.length === 0) return 'noRecord';
	const states = latestRuns.map(stateForRun);
	if (states.includes('attention')) return 'attention';
	if (states.includes('running')) return 'running';
	if (states.every((state) => state === 'passing')) return 'passing';
	return 'indeterminate';
}

function workflowStateLabel(state: RepositoryCheckState): string {
	const labels: Readonly<Record<RepositoryCheckState, string>> = {
		passing: 'Passing',
		attention: 'Failed',
		running: 'Running',
		indeterminate: 'Other result',
		noRecord: 'No run',
		unavailable: 'Unavailable'
	};
	return labels[state];
}

function stateLabel(state: RepositoryCheckState): string {
	const labels: Readonly<Record<RepositoryCheckState, string>> = {
		passing: 'Latest checks passing',
		attention: 'Needs attention',
		running: 'Checks in progress',
		indeterminate: 'No decisive result',
		noRecord: 'No recent run',
		unavailable: 'Provider unavailable'
	};
	return labels[state];
}

function repositoryDetail(
	state: RepositoryCheckState,
	latestWorkflowCount: number,
	failedWorkflowNames: ReadonlyArray<string>,
	recoveredFailures: number
): string {
	if (state === 'unavailable') return 'Workflow collection failed for this repository.';
	if (state === 'noRecord') return 'No user-triggered default-branch run in the rolling window.';
	if (state === 'attention') return `Latest failure: ${failedWorkflowNames.join(', ')}.`;
	const workflowLabel = latestWorkflowCount === 1 ? 'workflow' : 'workflows';
	const recoveryLabel = recoveredFailures === 1 ? 'recovery' : 'recoveries';
	return `${latestWorkflowCount} latest ${workflowLabel} · ${recoveredFailures} ${recoveryLabel}.`;
}

function repositorySignal(
	repository: string,
	summary: RepositoryWorkflowSummaryInput | undefined,
	unavailable: ReadonlySet<string>
): RepositoryCheckSignal {
	const latestRuns = unavailable.has(repository) ? [] : (summary?.latestRuns ?? []);
	const state = unavailable.has(repository) ? 'unavailable' : stateForLatestRuns(latestRuns);
	const failedWorkflowNames = latestRuns
		.flatMap((run) =>
			run.conclusion !== null && FAILURE_CONCLUSIONS.has(run.conclusion) ? [run.name] : []
		)
		.sort((left, right) => left.localeCompare(right));
	const recoveredFailures = summary?.recoveredFailures ?? 0;
	return {
		repository,
		state,
		stateLabel: stateLabel(state),
		detail: repositoryDetail(state, latestRuns.length, failedWorkflowNames, recoveredFailures),
		latestWorkflowCount: latestRuns.length,
		failedWorkflowNames,
		recoveredFailures,
		workflows: latestRuns.map((run) => {
			const workflowState = stateForRun(run);
			return {
				name: run.name,
				state: workflowState,
				stateLabel: workflowStateLabel(workflowState)
			};
		})
	};
}

const STATE_PRIORITY: Readonly<Record<RepositoryCheckState, number>> = {
	attention: 0,
	running: 1,
	indeterminate: 2,
	passing: 3,
	noRecord: 4,
	unavailable: 5
};

function countState(
	repositories: ReadonlyArray<RepositoryCheckSignal>,
	state: RepositoryCheckState
): number {
	return repositories.filter((repository) => repository.state === state).length;
}

function currentSummary(
	passing: number,
	attention: number,
	running: number,
	recoveries: number
): { readonly headline: string; readonly detail: string } {
	if (attention > 0) {
		return {
			headline: 'Current failures stay visible',
			detail: `${attention} ${attention === 1 ? 'repository has' : 'repositories have'} latest failed workflow evidence; ${recoveries} recovered failure ${recoveries === 1 ? 'sequence is' : 'sequences are'} also observed.`
		};
	}
	if (running > 0) {
		return {
			headline: 'Checks are in progress',
			detail: `${passing} ${passing === 1 ? 'repository is' : 'repositories are'} currently passing; ${running} ${running === 1 ? 'repository has' : 'repositories have'} an active run.`
		};
	}
	if (passing > 0) {
		return {
			headline: 'Latest observed checks are clear',
			detail: `${passing} ${passing === 1 ? 'repository has' : 'repositories have'} passing latest-run evidence; ${recoveries} recovered failure ${recoveries === 1 ? 'sequence is' : 'sequences are'} retained.`
		};
	}
	return {
		headline: 'No latest check state recorded',
		detail:
			'Historical workflow totals remain available, but no repository has decisive latest-run evidence in this window.'
	};
}

/** Derive exact check evidence without converting workflow history into a quality grade. */
export function createChecksIntelligence(snapshot: GitHubDashboardSnapshot): ChecksIntelligence {
	const workflows = snapshot.intelligence.delivery.workflows;
	const summaries = new Map(
		workflows.current.repositories.map((summary) => [summary.repository, summary] as const)
	);
	const unavailableRepositories = new Set(workflows.unavailableRepositories);
	const repositoryNames = new Set([
		...snapshot.intelligence.repositories
			.filter((repository) => repository.commits > 0)
			.map((repository) => repository.fullName),
		...summaries.keys(),
		...unavailableRepositories
	]);
	const repositories = [...repositoryNames]
		.map((repository) =>
			repositorySignal(repository, summaries.get(repository), unavailableRepositories)
		)
		.sort(
			(left, right) =>
				STATE_PRIORITY[left.state] - STATE_PRIORITY[right.state] ||
				left.repository.localeCompare(right.repository)
		);
	const commits = snapshot.intelligence.commits;
	const unavailable = [
		'Code coverage — no consistent coverage artifact exposed',
		'Code scanning — unavailable or disabled on active repositories',
		'Lint/typecheck results — not normalized across workflows'
	];
	if (workflows.truncated) {
		unavailable.push('Workflow history — provider pagination bound reached');
	}
	const passingRepositories = countState(repositories, 'passing');
	const attentionRepositories = countState(repositories, 'attention');
	const runningRepositories = countState(repositories, 'running');
	const recoveredFailureSequences = repositories.reduce(
		(total, repository) => total + repository.recoveredFailures,
		0
	);
	const summary = currentSummary(
		passingRepositories,
		attentionRepositories,
		runningRepositories,
		recoveredFailureSequences
	);

	return {
		current: {
			...summary,
			totalRepositories: workflows.totalRepositories,
			repositoriesWithEvidence: repositories.filter(
				(repository) => repository.state !== 'noRecord' && repository.state !== 'unavailable'
			).length,
			passingRepositories,
			attentionRepositories,
			runningRepositories,
			indeterminateRepositories: countState(repositories, 'indeterminate'),
			noRecordRepositories: countState(repositories, 'noRecord'),
			unavailableRepositories: countState(repositories, 'unavailable'),
			activeFailedWorkflows: repositories.reduce(
				(total, repository) => total + repository.failedWorkflowNames.length,
				0
			),
			recoveredFailureSequences,
			repositories
		},
		history: {
			totalRuns: workflows.current.total,
			completedRuns: workflows.current.successful + workflows.current.failed,
			successfulRuns: workflows.current.successful,
			failedRuns: workflows.current.failed,
			cancelledRuns: workflows.current.cancelled,
			otherRuns: workflows.current.other
		},
		context: {
			commits: commits.length,
			medianFilesPerCommit: median(commits.map((commit) => commit.changedFiles)),
			medianChangedLinesPerCommit: median(
				commits.map((commit) => commit.additions + commit.deletions)
			),
			reverts: commits.filter((commit) => /^revert\b/i.test(commit.message)).length
		},
		unavailable
	};
}
