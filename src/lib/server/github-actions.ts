import { Effect, Redacted, Schema } from 'effect';
import type {
	RepositoryIntelligenceInput,
	RepositoryWorkflowSummaryInput,
	WorkflowCoverageInput,
	WorkflowRunInput
} from '$lib/domain/github-intelligence';
import { fetchWorkflowAnnotations } from '$lib/server/github-check-annotations';
import { githubFetch, githubRequestHeaders } from '$lib/server/github-http';
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const MAX_RECENT_RUNS = 16;
const USER_TRIGGERED_EVENTS = new Set(['push', 'workflow_dispatch', 'repository_dispatch']);

const WorkflowRunSchema = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
	display_title: Schema.String,
	event: Schema.String,
	status: Schema.String,
	conclusion: Schema.NullOr(Schema.String),
	html_url: Schema.String,
	head_branch: Schema.NullOr(Schema.String),
	head_sha: Schema.String,
	created_at: Schema.DateFromString
});

const WorkflowRunsResponseSchema = Schema.Struct({
	total_count: Schema.Number,
	workflow_runs: Schema.Array(WorkflowRunSchema)
});

type DecodedWorkflowRun = Schema.Schema.Type<typeof WorkflowRunSchema>;
type Fetch = typeof globalThis.fetch;

type RepositoryWindowResult = {
	readonly repository: string;
	readonly runs: ReadonlyArray<WorkflowRunInput>;
	readonly unavailable: boolean;
	readonly truncated: boolean;
};

function repositoryPath(fullName: string): string {
	return fullName
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
}

function toWorkflowRun(repository: string, run: DecodedWorkflowRun): WorkflowRunInput {
	return {
		id: run.id,
		name: run.name,
		title: run.display_title,
		repository,
		url: run.html_url,
		event: run.event,
		status: run.status,
		conclusion: run.conclusion,
		branch: run.head_branch,
		headSha: run.head_sha,
		createdAt: run.created_at.toISOString()
	};
}

/** Return whether an Actions event is explicitly initiated by a user push or dispatch. */
function isUserTriggeredWorkflowEvent(event: string): boolean {
	return USER_TRIGGERED_EVENTS.has(event);
}

function conclusionCounts(runs: ReadonlyArray<WorkflowRunInput>): {
	readonly successful: number;
	readonly failed: number;
	readonly cancelled: number;
	readonly other: number;
} {
	let successful = 0;
	let failed = 0;
	let cancelled = 0;
	let other = 0;
	for (const run of runs) {
		if (run.conclusion === 'success') successful += 1;
		else if (run.conclusion === 'cancelled') cancelled += 1;
		else if (
			run.conclusion === 'failure' ||
			run.conclusion === 'timed_out' ||
			run.conclusion === 'action_required' ||
			run.conclusion === 'stale'
		)
			failed += 1;
		else other += 1;
	}
	return { successful, failed, cancelled, other };
}

function latestRunsByWorkflow(
	runs: ReadonlyArray<WorkflowRunInput>
): ReadonlyArray<WorkflowRunInput> {
	const latest = new Map<string, WorkflowRunInput>();
	for (const run of runs) {
		const current = latest.get(run.name);
		if (
			current === undefined ||
			run.createdAt > current.createdAt ||
			(run.createdAt === current.createdAt && run.id > current.id)
		) {
			latest.set(run.name, run);
		}
	}
	return [...latest.values()].sort(
		(left, right) => right.createdAt.localeCompare(left.createdAt) || right.id - left.id
	);
}

function recoveredFailureSequences(runs: ReadonlyArray<WorkflowRunInput>): number {
	const byWorkflow = new Map<string, WorkflowRunInput[]>();
	for (const run of runs) {
		const workflowRuns = byWorkflow.get(run.name) ?? [];
		workflowRuns.push(run);
		byWorkflow.set(run.name, workflowRuns);
	}
	let recoveries = 0;
	for (const workflowRuns of byWorkflow.values()) {
		let awaitingRecovery = false;
		for (const run of workflowRuns.sort(
			(left, right) => left.createdAt.localeCompare(right.createdAt) || left.id - right.id
		)) {
			if (
				run.conclusion === 'failure' ||
				run.conclusion === 'timed_out' ||
				run.conclusion === 'action_required' ||
				run.conclusion === 'stale'
			) {
				awaitingRecovery = true;
			} else if (run.conclusion === 'success' && awaitingRecovery) {
				recoveries += 1;
				awaitingRecovery = false;
			}
		}
	}
	return recoveries;
}

/** Summarize exact workflow runs for one repository. */
export function summarizeRepositoryWorkflows(
	repository: string,
	runs: ReadonlyArray<WorkflowRunInput>
): RepositoryWorkflowSummaryInput {
	return {
		repository,
		total: runs.length,
		...conclusionCounts(runs),
		latestRuns: latestRunsByWorkflow(runs),
		recoveredFailures: recoveredFailureSequences(runs)
	};
}

function fetchRepositoryWindow(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	username: string,
	repository: string,
	branch: string | null,
	start: Date,
	end: Date
): Effect.Effect<RepositoryWindowResult, never> {
	return Effect.gen(function* () {
		const collected: DecodedWorkflowRun[] = [];
		let totalCount = 0;
		for (let page = 1; page <= MAX_PAGES; page += 1) {
			const parameters = new URLSearchParams({
				actor: username,
				created: `${start.toISOString()}..${end.toISOString()}`,
				per_page: String(PAGE_SIZE),
				page: String(page)
			});
			if (branch !== null) parameters.set('branch', branch);
			const response = yield* Effect.tryPromise({
				try: () =>
					githubFetch(
						fetch,
						`/repos/${repositoryPath(repository)}/actions/runs?${parameters.toString()}`,
						{
							headers: githubRequestHeaders({
								authorization: `Bearer ${Redacted.value(token)}`
							})
						}
					),
				catch: (cause) => cause
			}).pipe(Effect.either);
			if (response._tag === 'Left' || !response.right.ok) {
				return { repository, runs: [], unavailable: true, truncated: false };
			}
			const body = yield* Effect.tryPromise({
				try: () => response.right.json(),
				catch: (cause) => cause
			}).pipe(Effect.either);
			if (body._tag === 'Left') {
				return { repository, runs: [], unavailable: true, truncated: false };
			}
			const decoded = Schema.decodeUnknownEither(WorkflowRunsResponseSchema)(body.right);
			if (decoded._tag === 'Left') {
				return { repository, runs: [], unavailable: true, truncated: false };
			}
			totalCount = decoded.right.total_count;
			collected.push(...decoded.right.workflow_runs);
			if (decoded.right.workflow_runs.length < PAGE_SIZE) break;
		}
		const runs = collected
			.filter(
				(run) =>
					run.created_at >= start && run.created_at < end && isUserTriggeredWorkflowEvent(run.event)
			)
			.map((run) => toWorkflowRun(repository, run))
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
		return {
			repository,
			runs,
			unavailable: false,
			truncated: totalCount > MAX_PAGES * PAGE_SIZE
		};
	}).pipe(
		Effect.tapErrorCause((cause) =>
			Effect.logWarning('GitHub workflow coverage failed for repository', repository, cause)
		),
		Effect.catchAll(() =>
			Effect.succeed({ repository, runs: [], unavailable: true, truncated: false })
		)
	);
}

function aggregate(results: ReadonlyArray<RepositoryWindowResult>): {
	readonly total: number;
	readonly successful: number;
	readonly failed: number;
	readonly cancelled: number;
	readonly other: number;
} {
	const runs = results.flatMap((result) => result.runs);
	return { total: runs.length, ...conclusionCounts(runs) };
}

/** Fetch bounded, user-attributed workflow evidence with each repository's credential. */
export function fetchWorkflowCoverage(
	fetch: Fetch,
	tokenForRepository: (repository: string) => Redacted.Redacted<string>,
	checksTokenForRepository: (repository: string) => Redacted.Redacted<string> | undefined,
	username: string,
	repositories: ReadonlyArray<RepositoryIntelligenceInput>,
	currentStart: Date,
	currentEnd: Date
): Effect.Effect<WorkflowCoverageInput, never> {
	const activeRepositories = repositories.filter((repository) => repository.commits.length > 0);
	const previousStart = new Date(currentStart.getTime() - 7 * 86_400_000);
	return Effect.gen(function* () {
		const current = yield* Effect.all(
			activeRepositories.map((repository) =>
				fetchRepositoryWindow(
					fetch,
					tokenForRepository(repository.fullName),
					username,
					repository.fullName,
					repository.defaultBranch,
					currentStart,
					currentEnd
				)
			),
			{ concurrency: 4 }
		);
		const previous = yield* Effect.all(
			activeRepositories.map((repository) =>
				fetchRepositoryWindow(
					fetch,
					tokenForRepository(repository.fullName),
					username,
					repository.fullName,
					repository.defaultBranch,
					previousStart,
					currentStart
				)
			),
			{ concurrency: 4 }
		);
		const unavailableRepositories = current
			.filter((result) => result.unavailable)
			.map((result) => result.repository);
		const currentAvailable = current.filter((result) => !result.unavailable);
		const previousAvailable = previous.filter((result) => !result.unavailable);
		const currentRuns = currentAvailable
			.flatMap((result) => result.runs)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
		const annotations = yield* fetchWorkflowAnnotations(
			fetch,
			tokenForRepository,
			checksTokenForRepository,
			currentRuns
		);
		return {
			coveredRepositories: currentAvailable.length,
			totalRepositories: activeRepositories.length,
			unavailableRepositories,
			truncated: [...current, ...previous].some((result) => result.truncated),
			current: {
				...aggregate(currentAvailable),
				repositories: currentAvailable
					.map((result) => summarizeRepositoryWorkflows(result.repository, result.runs))
					.sort(
						(left, right) =>
							right.total - left.total || left.repository.localeCompare(right.repository)
					),
				recent: currentRuns.slice(0, MAX_RECENT_RUNS),
				annotations
			},
			previous: aggregate(previousAvailable)
		};
	});
}
