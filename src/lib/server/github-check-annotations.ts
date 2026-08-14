import { Effect, Redacted, Schema } from 'effect';
import type {
	WorkflowAnnotationCoverageInput,
	WorkflowCheckAnnotationInput,
	WorkflowRunInput
} from '$lib/domain/github-intelligence';

const API_ROOT = 'https://api.github.com';
const PAGE_SIZE = 100;
const MAX_PAGES = 2;
const MAX_FAILED_RUNS = 4;
const MAX_EVIDENCE = 8;
const MAX_MESSAGE_LENGTH = 800;
const REQUEST_TIMEOUT_MS = 10_000;

const JobSchema = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
	status: Schema.String,
	conclusion: Schema.NullOr(Schema.String),
	html_url: Schema.String
});
const JobsResponseSchema = Schema.Struct({
	total_count: Schema.Number,
	jobs: Schema.Array(JobSchema)
});
const AnnotationSchema = Schema.Struct({
	path: Schema.String,
	start_line: Schema.Number,
	end_line: Schema.Number,
	annotation_level: Schema.Union(
		Schema.Literal('notice'),
		Schema.Literal('warning'),
		Schema.Literal('failure')
	),
	title: Schema.String,
	message: Schema.String
});
const AnnotationsResponseSchema = Schema.Array(AnnotationSchema);

const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required', 'stale']);
type Fetch = typeof globalThis.fetch;
type DecodedJob = Schema.Schema.Type<typeof JobSchema>;
type DecodedAnnotation = Schema.Schema.Type<typeof AnnotationSchema>;

type PageCollection<Value> = {
	readonly values: ReadonlyArray<Value>;
	readonly truncated: boolean;
};

type RunAnnotationResult = {
	readonly evidence: ReadonlyArray<WorkflowCheckAnnotationInput>;
	readonly truncated: boolean;
	readonly limitation: 'PermissionLimited' | 'Unavailable' | null;
};

class GitHubCheckAnnotationError extends Error {
	readonly _tag = 'GitHubCheckAnnotationError';

	constructor(
		message: string,
		readonly status: number | null = null,
		options?: ErrorOptions
	) {
		super(message, options);
	}
}

function repositoryPath(fullName: string): string {
	return fullName
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
}

function canonicalGitHubUrl(value: string): string {
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
			throw new GitHubCheckAnnotationError('GitHub check evidence URL was not canonical.');
		}
		return url.href;
	} catch (cause) {
		if (cause instanceof GitHubCheckAnnotationError) throw cause;
		throw new GitHubCheckAnnotationError('GitHub check evidence URL was invalid.', null, {
			cause
		});
	}
}

function requestHeaders(token: Redacted.Redacted<string>): Readonly<Record<string, string>> {
	return {
		Accept: 'application/vnd.github+json',
		Authorization: `Bearer ${Redacted.value(token)}`,
		'X-GitHub-Api-Version': '2022-11-28'
	};
}

async function fetchDecoded<Value>(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	url: string,
	schema: Schema.Schema<Value>
): Promise<Value> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			headers: requestHeaders(token),
			signal: controller.signal
		});
		if (!response.ok) {
			throw new GitHubCheckAnnotationError(
				`GitHub checks request failed with HTTP ${response.status}.`,
				response.status
			);
		}
		const body: unknown = await response.json();
		return Schema.decodeUnknownSync(schema)(body);
	} catch (cause) {
		if (cause instanceof GitHubCheckAnnotationError) throw cause;
		throw new GitHubCheckAnnotationError('GitHub checks response was unavailable.', null, {
			cause
		});
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchJobs(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	run: WorkflowRunInput
): Promise<PageCollection<DecodedJob>> {
	const jobs: DecodedJob[] = [];
	let totalCount = 0;
	for (let page = 1; page <= MAX_PAGES; page += 1) {
		const response = await fetchDecoded(
			fetch,
			token,
			`${API_ROOT}/repos/${repositoryPath(run.repository)}/actions/runs/${run.id}/jobs?filter=all&per_page=${PAGE_SIZE}&page=${page}`,
			JobsResponseSchema
		);
		totalCount = response.total_count;
		jobs.push(...response.jobs);
		if (response.jobs.length < PAGE_SIZE) break;
	}
	return { values: jobs, truncated: totalCount > jobs.length };
}

async function fetchJobAnnotations(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	repository: string,
	jobId: number
): Promise<PageCollection<DecodedAnnotation>> {
	const annotations: DecodedAnnotation[] = [];
	let truncated = false;
	for (let page = 1; page <= MAX_PAGES; page += 1) {
		const response = await fetchDecoded(
			fetch,
			token,
			`${API_ROOT}/repos/${repositoryPath(repository)}/check-runs/${jobId}/annotations?per_page=${PAGE_SIZE}&page=${page}`,
			AnnotationsResponseSchema
		);
		annotations.push(...response);
		if (response.length < PAGE_SIZE) return { values: annotations, truncated: false };
		truncated = page === MAX_PAGES;
	}
	return { values: annotations, truncated };
}

function toEvidence(
	run: WorkflowRunInput,
	job: DecodedJob,
	annotation: DecodedAnnotation
): WorkflowCheckAnnotationInput {
	return {
		runId: run.id,
		runTitle: run.title,
		runUrl: canonicalGitHubUrl(run.url),
		repository: run.repository,
		jobName: job.name,
		jobUrl: canonicalGitHubUrl(job.html_url),
		level: annotation.annotation_level,
		path: annotation.path,
		startLine: annotation.start_line,
		endLine: annotation.end_line,
		title: annotation.title,
		message: annotation.message.slice(0, MAX_MESSAGE_LENGTH),
		messageTruncated: annotation.message.length > MAX_MESSAGE_LENGTH
	};
}

async function collectRunAnnotations(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	run: WorkflowRunInput
): Promise<RunAnnotationResult> {
	try {
		const jobs = await fetchJobs(fetch, token, run);
		const failedJobs = jobs.values.filter(
			(job) => job.conclusion !== null && FAILED_CONCLUSIONS.has(job.conclusion)
		);
		const annotations = await Promise.all(
			failedJobs.map(async (job) => ({
				job,
				annotations: await fetchJobAnnotations(fetch, token, run.repository, job.id)
			}))
		);
		return {
			evidence: annotations.flatMap(({ job, annotations: result }) =>
				result.values.map((annotation) => toEvidence(run, job, annotation))
			),
			truncated: jobs.truncated || annotations.some(({ annotations: result }) => result.truncated),
			limitation: null
		};
	} catch (cause) {
		return {
			evidence: [],
			truncated: false,
			limitation:
				cause instanceof GitHubCheckAnnotationError && cause.status === 403
					? 'PermissionLimited'
					: 'Unavailable'
		};
	}
}

function annotationRank(annotation: WorkflowCheckAnnotationInput): number {
	if (annotation.level === 'failure') return 0;
	if (annotation.level === 'warning') return 1;
	return 2;
}

function annotationCoverageDetail(
	permissionLimited: boolean,
	unavailable: boolean,
	evidenceCount: number,
	targetedRunCount: number
): string {
	if (permissionLimited) {
		return 'Check-run annotations are permission-limited; the server token requires Checks: read.';
	}
	if (unavailable) {
		return `Check-run annotations were unavailable for at least one of ${targetedRunCount} failed workflow runs.`;
	}
	return `${evidenceCount} bounded check-run annotations observed across ${targetedRunCount} failed workflow runs.`;
}

/** Collect bounded check-run annotations for recent failed default-branch workflow runs. */
export function fetchWorkflowAnnotations(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	runs: ReadonlyArray<WorkflowRunInput>
): Effect.Effect<WorkflowAnnotationCoverageInput, never> {
	const failedRuns = runs
		.filter((run) => run.conclusion !== null && FAILED_CONCLUSIONS.has(run.conclusion))
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
	const targetedRuns = failedRuns.slice(0, MAX_FAILED_RUNS);
	if (targetedRuns.length === 0) {
		return Effect.succeed({
			state: 'Observed',
			targetedRuns: 0,
			evidence: [],
			truncated: false,
			detail: 'No failed workflow runs required annotation collection.'
		});
	}
	return Effect.promise(() =>
		Promise.all(targetedRuns.map((run) => collectRunAnnotations(fetch, token, run)))
	).pipe(
		Effect.map((results): WorkflowAnnotationCoverageInput => {
			const permissionLimited = results.some((result) => result.limitation === 'PermissionLimited');
			const unavailable = results.some((result) => result.limitation !== null);
			const evidence = results
				.flatMap((result) => result.evidence)
				.sort(
					(left, right) =>
						annotationRank(left) - annotationRank(right) ||
						right.runId - left.runId ||
						left.jobName.localeCompare(right.jobName)
				)
				.slice(0, MAX_EVIDENCE);
			const truncated =
				failedRuns.length > MAX_FAILED_RUNS ||
				results.some((result) => result.truncated) ||
				results.reduce((total, result) => total + result.evidence.length, 0) > evidence.length;
			return {
				state: unavailable ? 'Unavailable' : 'Observed',
				targetedRuns: targetedRuns.length,
				evidence,
				truncated,
				detail: annotationCoverageDetail(
					permissionLimited,
					unavailable,
					evidence.length,
					targetedRuns.length
				)
			};
		}),
		Effect.catchAll(() =>
			Effect.succeed({
				state: 'Unavailable' as const,
				targetedRuns: targetedRuns.length,
				evidence: [],
				truncated: false,
				detail: 'Check-run annotation collection failed before evidence could be parsed.'
			})
		)
	);
}
