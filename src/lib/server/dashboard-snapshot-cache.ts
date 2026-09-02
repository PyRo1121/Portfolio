import { createHash } from 'node:crypto';
import { Schema } from 'effect';
import type { DashboardRefreshResult } from '$lib/domain/dashboard-hydration';
import { runWithRefreshLease, type RefreshLeaseClient } from '$lib/server/refresh-lease-client';
import type {
	GitHubDashboardSnapshot,
	RepositoryCollectionEvidence,
	WorkflowAnnotationCoverageInput
} from '$lib/domain/github-intelligence';

const CACHE_VERSION = 1;
const DEFAULT_FRESHNESS_MS = 15 * 60_000;

const SnapshotSourceSchema = Schema.Union(
	Schema.Struct({ _tag: Schema.Literal('Live'), label: Schema.String }),
	Schema.Struct({ _tag: Schema.Literal('Demo'), label: Schema.String, reason: Schema.String })
);
const ProfileSchema = Schema.Struct({
	login: Schema.String,
	name: Schema.String,
	avatarUrl: Schema.String,
	profileUrl: Schema.String,
	publicRepos: Schema.Number,
	followers: Schema.Number
});
const TotalsSchema = Schema.Struct({
	commits: Schema.Number,
	pushes: Schema.Number,
	additions: Schema.Number,
	deletions: Schema.Number,
	churn: Schema.Number,
	repositoriesCreated: Schema.Number,
	pullRequestsOpened: Schema.Number,
	pullRequestsMerged: Schema.Number,
	issuesClosed: Schema.Number,
	comments: Schema.Number,
	repositoriesStarred: Schema.Number,
	forks: Schema.Number,
	events: Schema.Number
});
const DailyActivitySchema = Schema.Struct({
	label: Schema.String,
	longLabel: Schema.String,
	activity: Schema.Number,
	commits: Schema.Number,
	barHeight: Schema.String,
	intensity: Schema.Number
});
const RepositorySignalSchema = Schema.Struct({
	name: Schema.String,
	fullName: Schema.String,
	url: Schema.String,
	language: Schema.String,
	stars: Schema.Number,
	commits: Schema.Number,
	events: Schema.Number,
	score: Schema.Number,
	signalWidth: Schema.String
});
const WeeklyInsightSchema = Schema.Struct({
	label: Schema.String,
	value: Schema.String,
	detail: Schema.String
});
const LanguageSignalSchema = Schema.Struct({
	name: Schema.String,
	color: Schema.String,
	bytes: Schema.Number,
	share: Schema.Number,
	width: Schema.String
});
const RepositoryIntelligenceSchema = Schema.Struct({
	name: Schema.String,
	fullName: Schema.String,
	url: Schema.String,
	description: Schema.String,
	isPrivate: Schema.Boolean,
	isFork: Schema.Boolean,
	isArchived: Schema.Boolean,
	imageUrl: Schema.optional(Schema.String),
	primaryLanguage: Schema.String,
	languageColor: Schema.String,
	stars: Schema.Number,
	forks: Schema.Number,
	diskUsageKb: Schema.Number,
	openIssues: Schema.Number,
	openPullRequests: Schema.Number,
	defaultBranch: Schema.NullOr(Schema.String),
	commits: Schema.Number,
	previousCommits: Schema.Number,
	additions: Schema.Number,
	deletions: Schema.Number,
	changedFiles: Schema.Number,
	pushedAt: Schema.NullOr(Schema.String),
	createdAt: Schema.String,
	activityShare: Schema.Number,
	activityWidth: Schema.String
});
const CommitSignalSchema = Schema.Struct({
	sha: Schema.String,
	shortSha: Schema.String,
	message: Schema.String,
	committedAt: Schema.String,
	repository: Schema.String,
	repositoryUrl: Schema.String,
	url: Schema.String,
	isPrivate: Schema.Boolean,
	additions: Schema.Number,
	deletions: Schema.Number,
	changedFiles: Schema.Number
});
const ContributionDaySchema = Schema.Struct({
	date: Schema.String,
	count: Schema.Number,
	level: Schema.Union(
		Schema.Literal(0),
		Schema.Literal(1),
		Schema.Literal(2),
		Schema.Literal(3),
		Schema.Literal(4)
	)
});
const EngineeringDaySchema = Schema.Struct({
	date: Schema.String,
	label: Schema.String,
	longLabel: Schema.String,
	commits: Schema.Number,
	additions: Schema.Number,
	deletions: Schema.Number,
	totalChanges: Schema.Number,
	height: Schema.String
});
const HourlySignalSchema = Schema.Struct({
	hour: Schema.Number,
	label: Schema.String,
	commits: Schema.Number,
	height: Schema.String
});
const CollaborationItemSchema = Schema.Struct({
	kind: Schema.Union(Schema.Literal('Issue'), Schema.Literal('PullRequest')),
	title: Schema.String,
	number: Schema.Number,
	url: Schema.String,
	repository: Schema.String,
	isPrivate: Schema.Boolean,
	state: Schema.String,
	createdAt: Schema.String,
	mergedAt: Schema.NullOr(Schema.String),
	additions: Schema.Number,
	deletions: Schema.Number,
	changedFiles: Schema.Number,
	comments: Schema.Number,
	reviews: Schema.Number
});
const WorkflowRunSchema = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
	title: Schema.String,
	repository: Schema.String,
	url: Schema.String,
	event: Schema.String,
	status: Schema.String,
	conclusion: Schema.NullOr(Schema.String),
	branch: Schema.NullOr(Schema.String),
	headSha: Schema.optional(Schema.String),
	createdAt: Schema.String
});
const RepositoryWorkflowSummarySchema = Schema.Struct({
	repository: Schema.String,
	total: Schema.Number,
	successful: Schema.Number,
	failed: Schema.Number,
	cancelled: Schema.Number,
	other: Schema.Number,
	latestRuns: Schema.optional(Schema.Array(WorkflowRunSchema)),
	recoveredFailures: Schema.optional(Schema.Number)
});
const WorkflowTotalsSchema = Schema.Struct({
	total: Schema.Number,
	successful: Schema.Number,
	failed: Schema.Number,
	cancelled: Schema.Number,
	other: Schema.Number
});
const WorkflowCheckAnnotationSchema = Schema.Struct({
	runId: Schema.Number,
	runTitle: Schema.String,
	runUrl: Schema.String,
	repository: Schema.String,
	jobName: Schema.String,
	jobUrl: Schema.String,
	level: Schema.Union(
		Schema.Literal('notice'),
		Schema.Literal('warning'),
		Schema.Literal('failure')
	),
	path: Schema.String,
	startLine: Schema.Number,
	endLine: Schema.Number,
	title: Schema.String,
	message: Schema.String,
	messageTruncated: Schema.Boolean
});
const WorkflowAnnotationCoverageSchema = Schema.Struct({
	state: Schema.Union(Schema.Literal('Observed'), Schema.Literal('Unavailable')),
	targetedRuns: Schema.Number,
	evidence: Schema.Array(WorkflowCheckAnnotationSchema),
	truncated: Schema.Boolean,
	detail: Schema.String
});
const WorkflowCoverageSchema = Schema.Struct({
	coveredRepositories: Schema.Number,
	totalRepositories: Schema.Number,
	unavailableRepositories: Schema.Array(Schema.String),
	truncated: Schema.Boolean,
	current: Schema.Struct({
		...WorkflowTotalsSchema.fields,
		repositories: Schema.Array(RepositoryWorkflowSummarySchema),
		recent: Schema.Array(WorkflowRunSchema),
		annotations: Schema.optional(WorkflowAnnotationCoverageSchema)
	}),
	previous: WorkflowTotalsSchema
});
const PullRequestMergeEvidenceSchema = Schema.Struct({
	title: Schema.String,
	number: Schema.Number,
	repository: Schema.String,
	url: Schema.String,
	mergeCommitSha: Schema.String
});
const DeliveryArtifactSchema = Schema.Struct({
	kind: Schema.Union(
		Schema.Literal('PullRequest'),
		Schema.Literal('Issue'),
		Schema.Literal('Release'),
		Schema.Literal('WorkflowRun')
	),
	title: Schema.String,
	repository: Schema.String,
	url: Schema.String,
	occurredAt: Schema.String,
	status: Schema.Union(
		Schema.Literal('shipped'),
		Schema.Literal('passed'),
		Schema.Literal('failed'),
		Schema.Literal('cancelled'),
		Schema.Literal('running')
	),
	commitSha: Schema.optional(Schema.NullOr(Schema.String)),
	detail: Schema.String
});
const DashboardSnapshotSchema = Schema.Struct({
	source: SnapshotSourceSchema,
	profile: ProfileSchema,
	period: Schema.Struct({ startIso: Schema.String, endIso: Schema.String, label: Schema.String }),
	generatedAt: Schema.String,
	totals: TotalsSchema,
	coverage: Schema.Struct({ measuredPushes: Schema.Number, totalPushes: Schema.Number }),
	dailyActivity: Schema.Array(DailyActivitySchema),
	topRepositories: Schema.Array(RepositorySignalSchema),
	insights: Schema.Array(WeeklyInsightSchema),
	intelligence: Schema.Struct({
		account: Schema.Struct({
			ownedRepositories: Schema.Number,
			privateRepositories: Schema.Number,
			publicRepositories: Schema.Number,
			activeRepositories: Schema.Number,
			totalStars: Schema.Number,
			totalForks: Schema.Number,
			totalDiskUsageKb: Schema.Number,
			openIssues: Schema.Number,
			openPullRequests: Schema.Number
		}),
		repositoryCollection: Schema.optional(
			Schema.Struct({
				state: Schema.Union(Schema.Literal('Observed'), Schema.Literal('Unavailable')),
				totalRepositories: Schema.Number,
				freshRepositories: Schema.Number,
				staleRepositories: Schema.Array(Schema.String),
				oldestStaleAt: Schema.optional(Schema.NullOr(Schema.String)),
				graphQL: Schema.optional(
					Schema.Struct({
						state: Schema.Union(Schema.Literal('Measured'), Schema.Literal('Unavailable')),
						points: Schema.Number,
						successfulRequests: Schema.Number,
						detail: Schema.String
					})
				),
				detail: Schema.String
			})
		),
		comparison: Schema.Struct({
			currentCommits: Schema.Number,
			previousCommits: Schema.Number,
			commitDelta: Schema.Number,
			changePercent: Schema.NullOr(Schema.Number),
			direction: Schema.Union(Schema.Literal('up'), Schema.Literal('down'), Schema.Literal('flat')),
			label: Schema.String
		}),
		year: Schema.Struct({
			totalContributions: Schema.Number,
			activeDays: Schema.Number,
			currentStreak: Schema.Number,
			longestStreak: Schema.Number,
			busiestDay: Schema.NullOr(ContributionDaySchema),
			averagePerActiveDay: Schema.Number,
			days: Schema.Array(ContributionDaySchema)
		}),
		restrictedWeekContributions: Schema.Number,
		languages: Schema.Array(LanguageSignalSchema),
		repositories: Schema.Array(RepositoryIntelligenceSchema),
		commits: Schema.Array(CommitSignalSchema),
		engineeringDays: Schema.Array(EngineeringDaySchema),
		hourlyActivity: Schema.Array(HourlySignalSchema),
		peakHour: Schema.String,
		weekendCommitShare: Schema.Number,
		collaboration: Schema.Struct({
			authoredPullRequests: Schema.Number,
			mergedPullRequests: Schema.Number,
			reviewedPullRequests: Schema.Number,
			authoredIssues: Schema.Number,
			commentedItems: Schema.Number,
			items: Schema.Array(CollaborationItemSchema)
		}),
		delivery: Schema.Struct({
			mergedPullRequests: Schema.Number,
			authoredMergedPullRequests: Schema.optional(Schema.Number),
			maintainerMergedPullRequests: Schema.optional(Schema.Number),
			automatedMergedPullRequests: Schema.optional(Schema.Number),
			mergedPullRequestsTruncated: Schema.optional(Schema.Boolean),
			closedIssues: Schema.Number,
			authoredClosedIssues: Schema.optional(Schema.Number),
			ownerClosedIssues: Schema.optional(Schema.Number),
			pullRequestClosedIssues: Schema.optional(Schema.Number),
			closedIssuesTruncated: Schema.optional(Schema.Boolean),
			releases: Schema.Number,
			prereleaseBuilds: Schema.Number,
			outcomes: Schema.Number,
			previousOutcomes: Schema.Number,
			outcomeDelta: Schema.Number,
			pullRequestMerges: Schema.optional(Schema.Array(PullRequestMergeEvidenceSchema)),
			artifacts: Schema.Array(DeliveryArtifactSchema),
			workflows: WorkflowCoverageSchema
		}),
		rateLimit: Schema.Struct({
			remaining: Schema.Number,
			limit: Schema.Number,
			resetAt: Schema.String
		})
	})
});
const CacheEnvelopeSchema = Schema.Struct({
	version: Schema.Literal(CACHE_VERSION),
	username: Schema.String,
	cachedAt: Schema.String,
	snapshot: DashboardSnapshotSchema
});

type CacheEnvelope = Schema.Schema.Type<typeof CacheEnvelopeSchema>;

export type DashboardCacheRecord = {
	readonly snapshot: GitHubDashboardSnapshot;
	readonly cachedAt: string;
};

type SnapshotLoader = () => Promise<GitHubDashboardSnapshot>;

export type DashboardCacheStore = {
	readonly get: (key: string) => Promise<string | null>;
	readonly put: (key: string, value: string) => Promise<void>;
};

type DashboardSnapshotCacheOptions = {
	readonly freshnessMs?: number;
	readonly leaseClient?: RefreshLeaseClient;
};

function cacheKey(username: string): string {
	return createHash('sha256').update(username.toLocaleLowerCase()).digest('hex');
}

function errorMessage(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/** Versioned, private, last-known-good dashboard cache with single-flight refreshes. */
export class DashboardSnapshotCache {
	readonly #store: DashboardCacheStore;
	readonly #freshnessMs: number;
	readonly #leaseClient: RefreshLeaseClient | undefined;
	readonly #refreshes = new Map<string, Promise<DashboardRefreshResult>>();

	constructor(store: DashboardCacheStore, options: DashboardSnapshotCacheOptions = {}) {
		this.#store = store;
		this.#freshnessMs = options.freshnessMs ?? DEFAULT_FRESHNESS_MS;
		this.#leaseClient = options.leaseClient;
	}

	async read(username: string): Promise<DashboardCacheRecord | null> {
		try {
			const encoded = await this.#store.get(this.#key(username));
			if (encoded === null) return null;
			const parsed: unknown = JSON.parse(encoded);
			const envelope = Schema.decodeUnknownSync(CacheEnvelopeSchema)(parsed);
			if (envelope.username.toLocaleLowerCase() !== username.toLocaleLowerCase()) return null;
			if (envelope.snapshot.source._tag !== 'Live') return null;
			const storedCollection = envelope.snapshot.intelligence.repositoryCollection;
			const unavailableGraphQL: RepositoryCollectionEvidence['graphQL'] = {
				state: 'Unavailable',
				points: 0,
				successfulRequests: 0,
				detail: 'GraphQL collection cost is unavailable for this legacy snapshot.'
			};
			const repositoryCollection: RepositoryCollectionEvidence =
				storedCollection === undefined
					? {
							state: 'Unavailable',
							totalRepositories: envelope.snapshot.intelligence.account.ownedRepositories,
							freshRepositories: 0,
							staleRepositories: [],
							oldestStaleAt: null,
							graphQL: unavailableGraphQL,
							detail: 'Repository collection health is unavailable for this legacy snapshot.'
						}
					: {
							...storedCollection,
							oldestStaleAt: storedCollection.oldestStaleAt ?? null,
							graphQL: storedCollection.graphQL ?? unavailableGraphQL
						};
			const storedDelivery = envelope.snapshot.intelligence.delivery;
			const storedWorkflows = storedDelivery.workflows;
			const unavailableAnnotations: WorkflowAnnotationCoverageInput = {
				state: 'Unavailable',
				targetedRuns: 0,
				evidence: [],
				truncated: false,
				detail: 'Check-run annotations are unavailable for this legacy snapshot.'
			};
			const snapshot: GitHubDashboardSnapshot = {
				...envelope.snapshot,
				intelligence: {
					...envelope.snapshot.intelligence,
					repositoryCollection,
					delivery: {
						...storedDelivery,
						authoredMergedPullRequests:
							storedDelivery.authoredMergedPullRequests ?? storedDelivery.mergedPullRequests,
						maintainerMergedPullRequests: storedDelivery.maintainerMergedPullRequests ?? 0,
						automatedMergedPullRequests: storedDelivery.automatedMergedPullRequests ?? 0,
						mergedPullRequestsTruncated: storedDelivery.mergedPullRequestsTruncated ?? false,
						authoredClosedIssues:
							storedDelivery.authoredClosedIssues ?? storedDelivery.closedIssues,
						ownerClosedIssues: storedDelivery.ownerClosedIssues ?? 0,
						pullRequestClosedIssues: storedDelivery.pullRequestClosedIssues ?? 0,
						closedIssuesTruncated: storedDelivery.closedIssuesTruncated ?? false,
						pullRequestMerges: storedDelivery.pullRequestMerges ?? [],
						artifacts: storedDelivery.artifacts.map((artifact) => ({
							...artifact,
							commitSha: artifact.commitSha ?? null
						})),
						workflows: {
							...storedWorkflows,
							current: {
								...storedWorkflows.current,
								repositories: storedWorkflows.current.repositories.map((repository) => ({
									...repository,
									latestRuns: (repository.latestRuns ?? []).map((run) => ({
										...run,
										headSha: run.headSha ?? ''
									})),
									recoveredFailures: repository.recoveredFailures ?? 0
								})),
								recent: storedWorkflows.current.recent.map((run) => ({
									...run,
									headSha: run.headSha ?? ''
								})),
								annotations: storedWorkflows.current.annotations ?? unavailableAnnotations
							}
						}
					},
					repositories: envelope.snapshot.intelligence.repositories.map((repository) => ({
						...repository,
						imageUrl: repository.imageUrl ?? envelope.snapshot.profile.avatarUrl
					}))
				}
			};
			return { snapshot, cachedAt: envelope.cachedAt };
		} catch (cause) {
			console.warn('Ignoring unreadable Weeknote cache:', errorMessage(cause));
			return null;
		}
	}

	refresh(
		username: string,
		cached: DashboardCacheRecord | null,
		now: Date,
		loader: SnapshotLoader,
		force = false
	): Promise<DashboardRefreshResult> {
		if (
			!force &&
			cached !== null &&
			now.getTime() - Date.parse(cached.cachedAt) < this.#freshnessMs
		) {
			return Promise.resolve({ _tag: 'Current', checkedAt: now.toISOString() });
		}
		const key = cacheKey(username);
		const active = this.#refreshes.get(key);
		if (active !== undefined) return active;
		const refresh = runWithRefreshLease<DashboardRefreshResult>({
			client: this.#leaseClient,
			key: `github:${key}`,
			work: () => this.#runRefresh(username, loader),
			deferred: (retryAfterMs) => ({
				_tag: 'Deferred',
				deferredAt: new Date().toISOString(),
				retryAfterMs
			})
		}).finally(() => this.#refreshes.delete(key));
		this.#refreshes.set(key, refresh);
		return refresh;
	}

	async #runRefresh(username: string, loader: SnapshotLoader): Promise<DashboardRefreshResult> {
		const attemptedAt = new Date().toISOString();
		try {
			const snapshot = await loader();
			if (snapshot.source._tag !== 'Live') {
				return { _tag: 'Unavailable', attemptedAt, reason: 'GitHub returned non-live data.' };
			}
			const refreshedAt = new Date().toISOString();
			await this.#write({ version: CACHE_VERSION, username, cachedAt: refreshedAt, snapshot });
			return { _tag: 'Fresh', snapshot, refreshedAt };
		} catch (cause) {
			console.warn('Weeknote GitHub refresh failed:', errorMessage(cause));
			return {
				_tag: 'Unavailable',
				attemptedAt,
				reason: 'GitHub refresh is delayed. Last-known-good data remains available.'
			};
		}
	}

	async #write(envelope: CacheEnvelope): Promise<void> {
		await this.#store.put(this.#key(envelope.username), JSON.stringify(envelope));
	}

	#key(username: string): string {
		return `${cacheKey(username)}.json`;
	}
}

const uncoordinatedCachesByStore = new WeakMap<DashboardCacheStore, DashboardSnapshotCache>();
const coordinatedCachesByStore = new WeakMap<
	DashboardCacheStore,
	WeakMap<RefreshLeaseClient, DashboardSnapshotCache>
>();

/** Return one process-local cache, optionally backed by cross-isolate coordination. */
export function dashboardSnapshotCacheFor(
	store: DashboardCacheStore,
	leaseClient?: RefreshLeaseClient
): DashboardSnapshotCache {
	if (leaseClient === undefined) {
		const existing = uncoordinatedCachesByStore.get(store);
		if (existing !== undefined) return existing;
		const cache = new DashboardSnapshotCache(store);
		uncoordinatedCachesByStore.set(store, cache);
		return cache;
	}
	let cachesByClient = coordinatedCachesByStore.get(store);
	if (cachesByClient === undefined) {
		cachesByClient = new WeakMap();
		coordinatedCachesByStore.set(store, cachesByClient);
	}
	const existing = cachesByClient.get(leaseClient);
	if (existing !== undefined) return existing;
	const cache = new DashboardSnapshotCache(store, { leaseClient });
	cachesByClient.set(leaseClient, cache);
	return cache;
}
