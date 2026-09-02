import { Effect, Redacted, Schema } from 'effect';
import { addZonedDays, COLLECTION_TIME_ZONE } from '$lib/domain/dashboard-time';
import type {
	CollaborationItem,
	CommitIntelligenceInput,
	DeliveryOutcomeInput,
	GitHubIntelligenceInput,
	ReleaseInput,
	RepositoryIntelligenceInput
} from '$lib/domain/github-intelligence';
import { githubRequestHeaders } from '$lib/server/github-http';
import { collectGitHubRepositorySlices } from '$lib/server/github-repository-collector';
import type { GitHubRepositoryRefresh } from '$lib/server/github-repository-collector';
import type {
	GitHubRepositorySlice,
	GitHubRepositorySliceCache
} from '$lib/server/github-repository-slice-cache';

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const COMMIT_PAGE_SIZE = 100;
const SEARCH_PAGE_SIZE = 20;
const GRAPHQL_TIMEOUT_MS = 15_000;

const LanguageSchema = Schema.Struct({
	name: Schema.String,
	color: Schema.NullOr(Schema.String)
});

const LanguageEdgeSchema = Schema.Struct({
	size: Schema.Number,
	node: LanguageSchema
});

const CommitSchema = Schema.Struct({
	oid: Schema.String,
	committedDate: Schema.DateFromString,
	additions: Schema.Number,
	deletions: Schema.Number,
	changedFilesIfAvailable: Schema.NullOr(Schema.Number),
	messageHeadline: Schema.String,
	url: Schema.String
});

const PageInfoSchema = Schema.Struct({
	hasNextPage: Schema.Boolean,
	endCursor: Schema.NullOr(Schema.String)
});

const HistorySchema = Schema.Struct({
	totalCount: Schema.Number,
	pageInfo: PageInfoSchema,
	nodes: Schema.Array(Schema.NullOr(CommitSchema))
});

const PreviousHistorySchema = Schema.Struct({
	totalCount: Schema.Number
});

const BranchTargetSchema = Schema.Struct({
	current: HistorySchema,
	previous: PreviousHistorySchema
});

const ReleaseSchema = Schema.Struct({
	name: Schema.NullOr(Schema.String),
	tagName: Schema.String,
	url: Schema.String,
	createdAt: Schema.String,
	publishedAt: Schema.NullOr(Schema.String),
	isDraft: Schema.Boolean,
	isPrerelease: Schema.Boolean
});

const RepositorySchema = Schema.Struct({
	name: Schema.String,
	nameWithOwner: Schema.String,
	url: Schema.String,
	isPrivate: Schema.Boolean,
	isFork: Schema.Boolean,
	isArchived: Schema.Boolean,
	openGraphImageUrl: Schema.String,
	createdAt: Schema.DateFromString,
	pushedAt: Schema.NullOr(Schema.DateFromString),
	stargazerCount: Schema.Number,
	forkCount: Schema.Number,
	diskUsage: Schema.Number,
	description: Schema.NullOr(Schema.String),
	primaryLanguage: Schema.NullOr(LanguageSchema),
	languages: Schema.Struct({ edges: Schema.Array(Schema.NullOr(LanguageEdgeSchema)) }),
	issues: Schema.Struct({ totalCount: Schema.Number }),
	pullRequests: Schema.Struct({ totalCount: Schema.Number }),
	releases: Schema.Struct({ nodes: Schema.Array(Schema.NullOr(ReleaseSchema)) }),
	defaultBranchRef: Schema.NullOr(
		Schema.Struct({
			name: Schema.String,
			target: Schema.NullOr(BranchTargetSchema)
		})
	)
});

const ContributionDaySchema = Schema.Struct({
	date: Schema.String,
	contributionCount: Schema.Number
});

const ContributionWeekSchema = Schema.Struct({
	contributionDays: Schema.Array(ContributionDaySchema)
});

const ContributionCollectionSchema = Schema.Struct({
	restrictedContributionsCount: Schema.Number,
	totalCommitContributions: Schema.Number,
	totalIssueContributions: Schema.Number,
	totalPullRequestContributions: Schema.Number,
	totalPullRequestReviewContributions: Schema.Number,
	totalRepositoryContributions: Schema.Number,
	contributionCalendar: Schema.Struct({
		totalContributions: Schema.Number,
		weeks: Schema.Array(ContributionWeekSchema)
	})
});

const SearchRepositorySchema = Schema.Struct({
	nameWithOwner: Schema.String,
	isPrivate: Schema.Boolean
});

const SearchActorSchema = Schema.Struct({
	__typename: Schema.String,
	login: Schema.String
});

const PullRequestSearchResultSchema = Schema.Struct({
	__typename: Schema.Literal('PullRequest'),
	title: Schema.String,
	number: Schema.Number,
	url: Schema.String,
	state: Schema.String,
	createdAt: Schema.String,
	mergedAt: Schema.NullOr(Schema.String),
	additions: Schema.Number,
	deletions: Schema.Number,
	changedFiles: Schema.Number,
	comments: Schema.Struct({ totalCount: Schema.Number }),
	reviews: Schema.Struct({ totalCount: Schema.Number }),
	author: Schema.NullOr(SearchActorSchema),
	mergedBy: Schema.NullOr(SearchActorSchema),
	mergeCommit: Schema.NullOr(Schema.Struct({ oid: Schema.String })),
	repository: SearchRepositorySchema
});

const ClosedEventCloserSchema = Schema.Struct({
	__typename: Schema.String,
	number: Schema.optional(Schema.Number),
	url: Schema.optional(Schema.String),
	mergedAt: Schema.optional(Schema.NullOr(Schema.String)),
	mergedBy: Schema.optional(Schema.NullOr(SearchActorSchema))
});

const ClosedEventSchema = Schema.Struct({
	__typename: Schema.Literal('ClosedEvent'),
	createdAt: Schema.String,
	actor: Schema.NullOr(SearchActorSchema),
	closer: Schema.NullOr(ClosedEventCloserSchema)
});

const IssueSearchResultSchema = Schema.Struct({
	__typename: Schema.Literal('Issue'),
	title: Schema.String,
	number: Schema.Number,
	url: Schema.String,
	state: Schema.String,
	createdAt: Schema.String,
	closedAt: Schema.NullOr(Schema.String),
	comments: Schema.Struct({ totalCount: Schema.Number }),
	author: Schema.NullOr(SearchActorSchema),
	timelineItems: Schema.Struct({ nodes: Schema.Array(Schema.NullOr(ClosedEventSchema)) }),
	repository: SearchRepositorySchema
});

const SearchResultSchema = Schema.Union(PullRequestSearchResultSchema, IssueSearchResultSchema);

const SearchConnectionSchema = Schema.Struct({
	issueCount: Schema.Number,
	nodes: Schema.Array(Schema.NullOr(SearchResultSchema))
});

const GraphQLRateLimitSchema = Schema.Struct({
	cost: Schema.Number,
	limit: Schema.Number,
	remaining: Schema.Number,
	resetAt: Schema.String
});

const CoreDataSchema = Schema.Struct({
	viewer: Schema.Struct({
		current: ContributionCollectionSchema,
		previous: ContributionCollectionSchema,
		year: ContributionCollectionSchema
	}),
	rateLimit: GraphQLRateLimitSchema
});
const SearchDataSchema = Schema.Struct({
	authoredPullRequests: SearchConnectionSchema,
	mergedPullRequests: SearchConnectionSchema,
	reviewedPullRequests: SearchConnectionSchema,
	authoredIssues: SearchConnectionSchema,
	commentedItems: SearchConnectionSchema,
	currentMergedPullRequests: SearchConnectionSchema,
	currentMaintainerMergedPullRequests: SearchConnectionSchema,
	currentClosedIssues: SearchConnectionSchema,
	currentMaintainerClosedIssues: SearchConnectionSchema,
	previousMergedPullRequests: SearchConnectionSchema,
	previousMaintainerMergedPullRequests: SearchConnectionSchema,
	previousClosedIssues: SearchConnectionSchema,
	previousMaintainerClosedIssues: SearchConnectionSchema,
	rateLimit: GraphQLRateLimitSchema
});

const GraphQLErrorSchema = Schema.Struct({ message: Schema.String });
const CoreResponseSchema = Schema.Struct({
	data: Schema.optional(Schema.NullOr(CoreDataSchema)),
	errors: Schema.optional(Schema.Array(GraphQLErrorSchema))
});
const SearchResponseSchema = Schema.Struct({
	data: Schema.optional(Schema.NullOr(SearchDataSchema)),
	errors: Schema.optional(Schema.Array(GraphQLErrorSchema))
});
const RepositoryResponseSchema = Schema.Struct({
	data: Schema.optional(
		Schema.NullOr(
			Schema.Struct({
				repository: Schema.NullOr(RepositorySchema),
				rateLimit: GraphQLRateLimitSchema
			})
		)
	),
	errors: Schema.optional(Schema.Array(GraphQLErrorSchema))
});

const CommitPageDataSchema = Schema.Struct({
	repository: Schema.NullOr(
		Schema.Struct({
			defaultBranchRef: Schema.NullOr(
				Schema.Struct({ target: Schema.NullOr(Schema.Struct({ history: HistorySchema })) })
			)
		})
	),
	rateLimit: GraphQLRateLimitSchema
});

const CommitPageResponseSchema = Schema.Struct({
	data: Schema.optional(Schema.NullOr(CommitPageDataSchema)),
	errors: Schema.optional(Schema.Array(GraphQLErrorSchema))
});

const ACCOUNT_QUERY = `
query GitHubSignalAccount(
  $contributionWeekStart: DateTime!
  $contributionWeekEnd: DateTime!
  $contributionPreviousStart: DateTime!
  $yearStart: DateTime!
  $now: DateTime!
) {
  viewer {
    current: contributionsCollection(from: $contributionWeekStart, to: $contributionWeekEnd) {
      ...ContributionFields
    }
    previous: contributionsCollection(from: $contributionPreviousStart, to: $contributionWeekStart) {
      ...ContributionFields
    }
    year: contributionsCollection(from: $yearStart, to: $now) {
      ...ContributionFields
    }
  }
  rateLimit { cost limit remaining resetAt }
}

fragment ContributionFields on ContributionsCollection {
  restrictedContributionsCount
  totalCommitContributions
  totalIssueContributions
  totalPullRequestContributions
  totalPullRequestReviewContributions
  totalRepositoryContributions
  contributionCalendar {
    totalContributions
    weeks { contributionDays { date contributionCount } }
  }
}

`;

const SEARCH_QUERY = `
query GitHubSignalSearches(
  $authoredPullRequests: String!
  $mergedPullRequests: String!
  $reviewedPullRequests: String!
  $authoredIssues: String!
  $commentedItems: String!
  $currentMergedPullRequests: String!
  $currentMaintainerMergedPullRequests: String!
  $currentClosedIssues: String!
  $currentMaintainerClosedIssues: String!
  $previousMergedPullRequests: String!
  $previousMaintainerMergedPullRequests: String!
  $previousClosedIssues: String!
  $previousMaintainerClosedIssues: String!
) {
  authoredPullRequests: search(query: $authoredPullRequests, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  mergedPullRequests: search(query: $mergedPullRequests, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  reviewedPullRequests: search(query: $reviewedPullRequests, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  authoredIssues: search(query: $authoredIssues, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  commentedItems: search(query: $commentedItems, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  currentMergedPullRequests: search(query: $currentMergedPullRequests, type: ISSUE, first: 100) { ...SearchFields }
  currentMaintainerMergedPullRequests: search(query: $currentMaintainerMergedPullRequests, type: ISSUE, first: 100) { ...SearchFields }
  currentClosedIssues: search(query: $currentClosedIssues, type: ISSUE, first: 100) { ...SearchFields }
  currentMaintainerClosedIssues: search(query: $currentMaintainerClosedIssues, type: ISSUE, first: 100) { ...SearchFields }
  previousMergedPullRequests: search(query: $previousMergedPullRequests, type: ISSUE, first: 100) { ...SearchFields }
  previousMaintainerMergedPullRequests: search(query: $previousMaintainerMergedPullRequests, type: ISSUE, first: 100) { ...SearchFields }
  previousClosedIssues: search(query: $previousClosedIssues, type: ISSUE, first: 100) { ...SearchFields }
  previousMaintainerClosedIssues: search(query: $previousMaintainerClosedIssues, type: ISSUE, first: 100) { ...SearchFields }
  rateLimit { cost limit remaining resetAt }
}

fragment SearchFields on SearchResultItemConnection {
  issueCount
  nodes {
    __typename
    ... on PullRequest {
      title number url state createdAt mergedAt additions deletions changedFiles
      comments { totalCount }
      reviews { totalCount }
      author { __typename login }
      mergedBy { __typename login }
      mergeCommit { oid }
      repository { nameWithOwner isPrivate }
    }
    ... on Issue {
      title number url state createdAt closedAt
      comments { totalCount }
      author { __typename login }
      timelineItems(itemTypes: [CLOSED_EVENT], last: 1) {
        nodes {
          __typename
          ... on ClosedEvent {
            createdAt
            actor { __typename login }
            closer {
              __typename
              ... on PullRequest {
                number url mergedAt
                mergedBy { __typename login }
              }
            }
          }
        }
      }
      repository { nameWithOwner isPrivate }
    }
  }
}`;

const REPOSITORY_QUERY = `
query GitHubRepositorySlice(
  $owner: String!
  $name: String!
  $author: ID!
  $weekStart: GitTimestamp!
  $weekEnd: GitTimestamp!
  $previousStart: GitTimestamp!
) {
  rateLimit { cost limit remaining resetAt }
  repository(owner: $owner, name: $name) {
    name
    nameWithOwner
    url
    isPrivate
    isFork
    isArchived
    openGraphImageUrl
    createdAt
    pushedAt
    stargazerCount
    forkCount
    diskUsage
    description
    primaryLanguage { name color }
    languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
      edges { size node { name color } }
    }
    issues(states: OPEN) { totalCount }
    pullRequests(states: OPEN) { totalCount }
    releases(first: 20, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { name tagName url createdAt publishedAt isDraft isPrerelease }
    }
    defaultBranchRef {
      name
      target {
        ... on Commit {
          current: history(first: ${COMMIT_PAGE_SIZE}, since: $weekStart, until: $weekEnd, author: { id: $author }) {
            ...HistoryFields
          }
          previous: history(first: 1, since: $previousStart, until: $weekStart, author: { id: $author }) {
            totalCount
          }
        }
      }
    }
  }
}

fragment HistoryFields on CommitHistoryConnection {
  totalCount
  pageInfo { hasNextPage endCursor }
  nodes {
    oid committedDate additions deletions changedFilesIfAvailable messageHeadline url
  }
}
`;

const COMMIT_PAGE_QUERY = `
query RepositoryCommitPage(
  $owner: String!
  $name: String!
  $author: ID!
  $weekStart: GitTimestamp!
  $weekEnd: GitTimestamp!
  $after: String!
) {
  rateLimit { cost limit remaining resetAt }
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: ${COMMIT_PAGE_SIZE}, after: $after, since: $weekStart, until: $weekEnd, author: { id: $author }) {
            totalCount
            pageInfo { hasNextPage endCursor }
            nodes {
              oid committedDate additions deletions changedFilesIfAvailable messageHeadline url
            }
          }
        }
      }
    }
  }
}`;

/** A typed GraphQL transport or response failure. */
export class GitHubGraphQLError extends Error {
	readonly _tag = 'GitHubGraphQLError';

	constructor(
		readonly operation: string,
		override readonly cause: unknown,
		readonly status: number | null = null,
		readonly graphQLCost = 0,
		readonly successfulGraphQLRequests = 0
	) {
		super(
			`GitHub GraphQL failed during ${operation}${status === null ? '' : ` with HTTP ${status}`}`,
			{ cause }
		);
	}

	withObservation(graphQLCost: number, successfulGraphQLRequests: number): GitHubGraphQLError {
		return new GitHubGraphQLError(
			this.operation,
			this.cause,
			this.status,
			this.graphQLCost + graphQLCost,
			this.successfulGraphQLRequests + successfulGraphQLRequests
		);
	}
}

type Fetch = typeof globalThis.fetch;
type DecodedRepository = Schema.Schema.Type<typeof RepositorySchema>;
type DecodedCommit = Schema.Schema.Type<typeof CommitSchema>;
type SearchConnection = Schema.Schema.Type<typeof SearchConnectionSchema>;
type SearchData = Schema.Schema.Type<typeof SearchDataSchema>;

function graphQLRequest(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	query: string,
	variables: Readonly<Record<string, unknown>>,
	operation: string
): Effect.Effect<unknown, GitHubGraphQLError> {
	return Effect.tryPromise({
		try: async () => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), GRAPHQL_TIMEOUT_MS);
			try {
				const response = await fetch(GRAPHQL_ENDPOINT, {
					method: 'POST',
					headers: githubRequestHeaders({
						authorization: `Bearer ${Redacted.value(token)}`,
						json: true
					}),
					body: JSON.stringify({ query, variables }),
					signal: controller.signal
				});
				const body = await response.text();
				if (!response.ok) {
					throw new GitHubGraphQLError(operation, body.slice(0, 500), response.status);
				}
				try {
					return JSON.parse(body) as unknown;
				} catch (cause) {
					throw new GitHubGraphQLError(operation, cause, response.status);
				}
			} finally {
				clearTimeout(timeout);
			}
		},
		catch: (cause) =>
			cause instanceof GitHubGraphQLError ? cause : new GitHubGraphQLError(operation, cause)
	});
}

function toCommit(commit: DecodedCommit): CommitIntelligenceInput {
	return {
		sha: commit.oid,
		message: commit.messageHeadline,
		committedAt: commit.committedDate,
		url: commit.url,
		additions: commit.additions,
		deletions: commit.deletions,
		changedFiles: commit.changedFilesIfAvailable
	};
}

function repositoryParts(fullName: string): readonly [string, string] | null {
	const separator = fullName.indexOf('/');
	if (separator <= 0 || separator === fullName.length - 1) return null;
	return [fullName.slice(0, separator), fullName.slice(separator + 1)];
}

type CommitPaginationRequest = {
	readonly fetch: Fetch;
	readonly token: Redacted.Redacted<string>;
	readonly repository: DecodedRepository;
	readonly authorId: string;
	readonly weekStart: string;
	readonly weekEnd: string;
};

type CommitPaginationResult = {
	readonly commits: ReadonlyArray<DecodedCommit>;
	readonly graphQLCost: number;
	readonly successfulGraphQLRequests: number;
};

function fetchRemainingCommits(
	request: CommitPaginationRequest
): Effect.Effect<CommitPaginationResult, GitHubGraphQLError> {
	const { fetch, token, repository, authorId, weekStart, weekEnd } = request;
	const initialHistory = repository.defaultBranchRef?.target?.current;
	if (!initialHistory?.pageInfo.hasNextPage || initialHistory.pageInfo.endCursor === null) {
		return Effect.succeed({ commits: [], graphQLCost: 0, successfulGraphQLRequests: 0 });
	}
	const parts = repositoryParts(repository.nameWithOwner);
	if (parts === null) {
		return Effect.succeed({ commits: [], graphQLCost: 0, successfulGraphQLRequests: 0 });
	}
	const [owner, name] = parts;
	let graphQLCost = 0;
	let successfulGraphQLRequests = 0;
	return Effect.gen(function* () {
		const commits: DecodedCommit[] = [];
		let cursor: string | null = initialHistory.pageInfo.endCursor;
		let hasNextPage = true;
		while (hasNextPage && cursor !== null) {
			const body = yield* graphQLRequest(
				fetch,
				token,
				COMMIT_PAGE_QUERY,
				{ owner, name, author: authorId, weekStart, weekEnd, after: cursor },
				`commit pagination for ${repository.nameWithOwner}`
			);
			const response = yield* Schema.decodeUnknown(CommitPageResponseSchema)(body).pipe(
				Effect.mapError((cause) => new GitHubGraphQLError('commit pagination parsing', cause))
			);
			if (response.errors?.length || response.data == null) {
				return yield* Effect.fail(
					new GitHubGraphQLError(
						'commit pagination response',
						response.errors,
						null,
						response.data?.rateLimit.cost ?? 0,
						response.data === null || response.data === undefined ? 0 : 1
					)
				);
			}
			graphQLCost += response.data.rateLimit.cost;
			successfulGraphQLRequests += 1;
			const history = response.data.repository?.defaultBranchRef?.target?.history;
			if (history === undefined) break;
			commits.push(...history.nodes.filter((commit) => commit !== null));
			hasNextPage = history.pageInfo.hasNextPage;
			cursor = history.pageInfo.endCursor;
		}
		return { commits, graphQLCost, successfulGraphQLRequests };
	}).pipe(
		Effect.mapError((cause) => cause.withObservation(graphQLCost, successfulGraphQLRequests))
	);
}

function toRepository(
	repository: DecodedRepository,
	additionalCommits: ReadonlyArray<DecodedCommit>
): RepositoryIntelligenceInput {
	const history = repository.defaultBranchRef?.target;
	const initialCommits = history?.current.nodes.filter((commit) => commit !== null) ?? [];
	return {
		name: repository.name,
		fullName: repository.nameWithOwner,
		url: repository.url,
		description: repository.description,
		isPrivate: repository.isPrivate,
		isFork: repository.isFork,
		isArchived: repository.isArchived,
		imageUrl: repository.openGraphImageUrl,
		createdAt: repository.createdAt,
		pushedAt: repository.pushedAt,
		primaryLanguage: repository.primaryLanguage?.name ?? null,
		primaryLanguageColor: repository.primaryLanguage?.color ?? null,
		languages: repository.languages.edges.flatMap((edge) =>
			edge === null ? [] : [{ name: edge.node.name, color: edge.node.color, bytes: edge.size }]
		),
		stars: repository.stargazerCount,
		forks: repository.forkCount,
		diskUsageKb: repository.diskUsage,
		openIssues: repository.issues.totalCount,
		openPullRequests: repository.pullRequests.totalCount,
		defaultBranch: repository.defaultBranchRef?.name ?? null,
		previousCommits: history?.previous.totalCount ?? 0,
		commits: [...initialCommits, ...additionalCommits].map(toCommit)
	};
}

type RepositorySliceRequest = {
	readonly fetch: Fetch;
	readonly token: Redacted.Redacted<string>;
	readonly fullName: string;
	readonly authorId: string;
	readonly weekStart: string;
	readonly weekEnd: string;
	readonly previousStart: string;
};

function repositoryReleaseEvidence(
	repository: DecodedRepository,
	request: RepositorySliceRequest
): Pick<GitHubRepositorySlice, 'releases' | 'previousReleaseCount'> {
	const releases: ReleaseInput[] = [];
	let previousReleaseCount = 0;
	for (const release of repository.releases.nodes) {
		if (release === null || release.isDraft) continue;
		const occurredAt = release.publishedAt ?? release.createdAt;
		if (occurredAt >= request.weekStart && occurredAt < request.weekEnd) {
			releases.push({
				name: release.name ?? release.tagName,
				tagName: release.tagName,
				repository: repository.nameWithOwner,
				url: release.url,
				createdAt: release.createdAt,
				publishedAt: release.publishedAt,
				isPrerelease: release.isPrerelease
			});
		} else if (occurredAt >= request.previousStart && occurredAt < request.weekStart) {
			previousReleaseCount += 1;
		}
	}
	return { releases, previousReleaseCount };
}

/** Fetch one complete repository evidence slice for independent caching. */
export function fetchGitHubRepositorySlice(
	request: RepositorySliceRequest
): Effect.Effect<GitHubRepositoryRefresh, GitHubGraphQLError> {
	const parts = repositoryParts(request.fullName);
	if (parts === null) {
		return Effect.fail(
			new GitHubGraphQLError(`repository name parsing for ${request.fullName}`, request.fullName)
		);
	}
	const [owner, name] = parts;
	return Effect.gen(function* () {
		const body = yield* graphQLRequest(
			request.fetch,
			request.token,
			REPOSITORY_QUERY,
			{
				owner,
				name,
				author: request.authorId,
				weekStart: request.weekStart,
				weekEnd: request.weekEnd,
				previousStart: request.previousStart
			},
			`repository slice for ${request.fullName}`
		);
		const response = yield* Schema.decodeUnknown(RepositoryResponseSchema)(body).pipe(
			Effect.mapError(
				(cause) => new GitHubGraphQLError(`repository slice parsing for ${request.fullName}`, cause)
			)
		);
		if (response.errors?.length || response.data?.repository == null) {
			return yield* Effect.fail(
				new GitHubGraphQLError(
					`repository slice response for ${request.fullName}`,
					response.errors,
					null,
					response.data?.rateLimit.cost ?? 0,
					response.data === null || response.data === undefined ? 0 : 1
				)
			);
		}
		const repository = response.data.repository;
		const repositoryRateLimit = response.data.rateLimit;
		const additionalCommits = yield* fetchRemainingCommits({
			fetch: request.fetch,
			token: request.token,
			repository,
			authorId: request.authorId,
			weekStart: request.weekStart,
			weekEnd: request.weekEnd
		}).pipe(Effect.mapError((cause) => cause.withObservation(repositoryRateLimit.cost, 1)));
		return {
			slice: {
				repository: toRepository(repository, additionalCommits.commits),
				...repositoryReleaseEvidence(repository, request)
			},
			graphQLCost: repositoryRateLimit.cost + additionalCommits.graphQLCost,
			successfulGraphQLRequests: 1 + additionalCommits.successfulGraphQLRequests
		};
	});
}

function toCollaborationItem(
	item: Schema.Schema.Type<typeof SearchResultSchema>
): CollaborationItem {
	if (item.__typename === 'Issue') {
		return {
			kind: 'Issue',
			title: item.title,
			number: item.number,
			url: item.url,
			repository: item.repository.nameWithOwner,
			isPrivate: item.repository.isPrivate,
			state: item.state,
			createdAt: item.createdAt,
			mergedAt: null,
			additions: 0,
			deletions: 0,
			changedFiles: 0,
			comments: item.comments.totalCount,
			reviews: 0
		};
	}
	return {
		kind: 'PullRequest',
		title: item.title,
		number: item.number,
		url: item.url,
		repository: item.repository.nameWithOwner,
		isPrivate: item.repository.isPrivate,
		state: item.state,
		createdAt: item.createdAt,
		mergedAt: item.mergedAt,
		additions: item.additions,
		deletions: item.deletions,
		changedFiles: item.changedFiles,
		comments: item.comments.totalCount,
		reviews: item.reviews.totalCount
	};
}

function collectCollaborationItems(
	connections: ReadonlyArray<SearchConnection>
): ReadonlyArray<CollaborationItem> {
	const items = new Map<string, CollaborationItem>();
	for (const connection of connections) {
		for (const item of connection.nodes) {
			if (item === null) continue;
			const projected = toCollaborationItem(item);
			items.set(projected.url, projected);
		}
	}
	return [...items.values()]
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
		.slice(0, 24);
}

type SearchResult = Schema.Schema.Type<typeof SearchResultSchema>;
type PullRequestSearchResult = Extract<SearchResult, { readonly __typename: 'PullRequest' }>;
type IssueSearchResult = Extract<SearchResult, { readonly __typename: 'Issue' }>;

type DeliveryPullRequestCollection = {
	readonly outcomes: ReadonlyArray<DeliveryOutcomeInput>;
	readonly mergedPullRequests: number;
	readonly authoredMergedPullRequests: number;
	readonly maintainerMergedPullRequests: number;
	readonly automatedMergedPullRequests: number;
	readonly truncated: boolean;
};

function pullRequestNodes(connection: SearchConnection): ReadonlyArray<PullRequestSearchResult> {
	return connection.nodes.flatMap((item) =>
		item?.__typename === 'PullRequest' && item.mergedAt !== null ? [item] : []
	);
}

function sameLogin(left: string | null | undefined, right: string): boolean {
	return left?.toLocaleLowerCase() === right.toLocaleLowerCase();
}

function collectDeliveryPullRequests(
	authored: SearchConnection,
	maintained: SearchConnection,
	username: string
): DeliveryPullRequestCollection {
	const merged = new Map<string, PullRequestSearchResult>();
	for (const pullRequest of pullRequestNodes(authored)) merged.set(pullRequest.url, pullRequest);
	for (const pullRequest of pullRequestNodes(maintained)) {
		if (sameLogin(pullRequest.mergedBy?.login, username)) merged.set(pullRequest.url, pullRequest);
	}
	const pullRequests = [...merged.values()].sort((left, right) =>
		(right.mergedAt ?? '').localeCompare(left.mergedAt ?? '')
	);
	const responsibility = (pullRequest: PullRequestSearchResult) => {
		if (sameLogin(pullRequest.author?.login, username)) return 'Authored' as const;
		return pullRequest.author?.__typename === 'Bot'
			? ('Automated' as const)
			: ('Maintainer' as const);
	};
	const outcomes: ReadonlyArray<DeliveryOutcomeInput> = pullRequests.map((pullRequest) => ({
		kind: 'PullRequest',
		title: pullRequest.title,
		number: pullRequest.number,
		repository: pullRequest.repository.nameWithOwner,
		url: pullRequest.url,
		occurredAt: pullRequest.mergedAt ?? pullRequest.createdAt,
		isPrivate: pullRequest.repository.isPrivate,
		mergeCommitSha: pullRequest.mergeCommit?.oid ?? null,
		responsibility: responsibility(pullRequest)
	}));
	const authoredMergedPullRequests = outcomes.filter(
		(outcome) => outcome.responsibility === 'Authored'
	).length;
	const maintainerMergedPullRequests = outcomes.filter(
		(outcome) => outcome.responsibility === 'Maintainer'
	).length;
	const automatedMergedPullRequests = outcomes.filter(
		(outcome) => outcome.responsibility === 'Automated'
	).length;
	return {
		outcomes,
		mergedPullRequests: outcomes.length,
		authoredMergedPullRequests,
		maintainerMergedPullRequests,
		automatedMergedPullRequests,
		truncated: authored.issueCount > 100 || maintained.issueCount > 100
	};
}

type DeliveryIssueCollection = {
	readonly outcomes: ReadonlyArray<DeliveryOutcomeInput>;
	readonly closedIssues: number;
	readonly authoredClosedIssues: number;
	readonly ownerClosedIssues: number;
	readonly pullRequestClosedIssues: number;
	readonly truncated: boolean;
};

function issueNodes(connection: SearchConnection): ReadonlyArray<IssueSearchResult> {
	return connection.nodes.flatMap((item) =>
		item?.__typename === 'Issue' && item.closedAt !== null ? [item] : []
	);
}

function issueResponsibility(
	issue: IssueSearchResult,
	username: string
): DeliveryOutcomeInput['responsibility'] | null {
	if (sameLogin(issue.author?.login, username)) return 'Authored';
	const closedEvent = issue.timelineItems.nodes[0];
	if (sameLogin(closedEvent?.actor?.login, username)) return 'ClosedByOwner';
	if (
		closedEvent?.closer?.__typename === 'PullRequest' &&
		sameLogin(closedEvent.closer.mergedBy?.login, username)
	) {
		return 'ClosedByPullRequest';
	}
	return null;
}

function collectDeliveryIssues(
	authored: SearchConnection,
	maintained: SearchConnection,
	username: string
): DeliveryIssueCollection {
	const closed = new Map<string, IssueSearchResult>();
	for (const issue of issueNodes(authored)) closed.set(issue.url, issue);
	for (const issue of issueNodes(maintained)) {
		if (issueResponsibility(issue, username) !== null) closed.set(issue.url, issue);
	}
	const outcomes = [...closed.values()]
		.map((issue): DeliveryOutcomeInput | null => {
			const responsibility = issueResponsibility(issue, username);
			return responsibility === null
				? null
				: {
						kind: 'Issue',
						title: issue.title,
						number: issue.number,
						repository: issue.repository.nameWithOwner,
						url: issue.url,
						occurredAt: issue.closedAt ?? issue.createdAt,
						isPrivate: issue.repository.isPrivate,
						mergeCommitSha: null,
						responsibility
					};
		})
		.filter((outcome): outcome is DeliveryOutcomeInput => outcome !== null)
		.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
	return {
		outcomes,
		closedIssues: outcomes.length,
		authoredClosedIssues: outcomes.filter((outcome) => outcome.responsibility === 'Authored')
			.length,
		ownerClosedIssues: outcomes.filter((outcome) => outcome.responsibility === 'ClosedByOwner')
			.length,
		pullRequestClosedIssues: outcomes.filter(
			(outcome) => outcome.responsibility === 'ClosedByPullRequest'
		).length,
		truncated: authored.issueCount > 100 || maintained.issueCount > 100
	};
}

function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function scopedSearch(query: string, scope: string): string {
	return scope.length === 0 ? query : `${query} ${scope}`;
}

function searchVariables(
	username: string,
	searchDate: string,
	weekStart: Date,
	weekEnd: Date,
	previousStart: Date,
	scope: string,
	repositoryScoped: boolean
): Record<string, string> {
	return {
		authoredPullRequests: scopedSearch(`is:pr author:${username} created:>=${searchDate}`, scope),
		mergedPullRequests: scopedSearch(`is:pr author:${username} merged:>=${searchDate}`, scope),
		reviewedPullRequests: scopedSearch(
			`is:pr reviewed-by:${username} updated:>=${searchDate}`,
			scope
		),
		authoredIssues: scopedSearch(`is:issue author:${username} created:>=${searchDate}`, scope),
		commentedItems: scopedSearch(`commenter:${username} updated:>=${searchDate}`, scope),
		currentMergedPullRequests: scopedSearch(
			`is:pr author:${username} merged:${weekStart.toISOString()}..${weekEnd.toISOString()}`,
			scope
		),
		currentMaintainerMergedPullRequests: scopedSearch(
			`is:pr ${repositoryScoped ? '' : `user:${username} `}is:merged merged:${weekStart.toISOString()}..${weekEnd.toISOString()}`,
			scope
		),
		currentClosedIssues: scopedSearch(
			`is:issue author:${username} closed:${weekStart.toISOString()}..${weekEnd.toISOString()}`,
			scope
		),
		currentMaintainerClosedIssues: scopedSearch(
			`is:issue ${repositoryScoped ? '' : `user:${username} `}is:closed closed:${weekStart.toISOString()}..${weekEnd.toISOString()}`,
			scope
		),
		previousMergedPullRequests: scopedSearch(
			`is:pr author:${username} merged:${previousStart.toISOString()}..${weekStart.toISOString()}`,
			scope
		),
		previousMaintainerMergedPullRequests: scopedSearch(
			`is:pr ${repositoryScoped ? '' : `user:${username} `}is:merged merged:${previousStart.toISOString()}..${weekStart.toISOString()}`,
			scope
		),
		previousClosedIssues: scopedSearch(
			`is:issue author:${username} closed:${previousStart.toISOString()}..${weekStart.toISOString()}`,
			scope
		),
		previousMaintainerClosedIssues: scopedSearch(
			`is:issue ${repositoryScoped ? '' : `user:${username} `}is:closed closed:${previousStart.toISOString()}..${weekStart.toISOString()}`,
			scope
		)
	};
}

function mergeSearchConnection(connections: ReadonlyArray<SearchConnection>): SearchConnection {
	return {
		issueCount: connections.reduce((total, connection) => total + connection.issueCount, 0),
		nodes: connections.flatMap((connection) => connection.nodes)
	};
}

function mergeSearchData(responses: readonly [SearchData, ...SearchData[]]): SearchData {
	const connections = <Key extends Exclude<keyof SearchData, 'rateLimit'>>(
		key: Key
	): SearchConnection => mergeSearchConnection(responses.map((response) => response[key]));
	const first = responses[0];
	return {
		authoredPullRequests: connections('authoredPullRequests'),
		mergedPullRequests: connections('mergedPullRequests'),
		reviewedPullRequests: connections('reviewedPullRequests'),
		authoredIssues: connections('authoredIssues'),
		commentedItems: connections('commentedItems'),
		currentMergedPullRequests: connections('currentMergedPullRequests'),
		currentMaintainerMergedPullRequests: connections('currentMaintainerMergedPullRequests'),
		currentClosedIssues: connections('currentClosedIssues'),
		currentMaintainerClosedIssues: connections('currentMaintainerClosedIssues'),
		previousMergedPullRequests: connections('previousMergedPullRequests'),
		previousMaintainerMergedPullRequests: connections('previousMaintainerMergedPullRequests'),
		previousClosedIssues: connections('previousClosedIssues'),
		previousMaintainerClosedIssues: connections('previousMaintainerClosedIssues'),
		rateLimit: {
			cost: responses.reduce((total, response) => total + response.rateLimit.cost, 0),
			limit: first.rateLimit.limit,
			remaining: Math.min(...responses.map((response) => response.rateLimit.remaining)),
			resetAt:
				[...responses]
					.map((response) => response.rateLimit.resetAt)
					.sort((left, right) => left.localeCompare(right))[0] ?? first.rateLimit.resetAt
		}
	};
}

export type GitHubIntelligenceRequest = {
	readonly fetch: Fetch;
	readonly token: Redacted.Redacted<string>;
	readonly username: string;
	readonly authorId: string;
	readonly weekStart: Date;
	readonly weekEnd: Date;
	readonly now: Date;
	readonly repositoryInventory: ReadonlyArray<{
		readonly fullName: string;
		readonly isPrivate: boolean;
		readonly token: Redacted.Redacted<string>;
	}>;
	readonly additionalSearchRepositories?: ReadonlyArray<{
		readonly repository: string;
		readonly token: Redacted.Redacted<string>;
	}>;
	readonly repositoryCache: GitHubRepositorySliceCache;
};

/** Fetch private-aware repository, commit, calendar, and collaboration intelligence. */
export function fetchGitHubIntelligence(
	request: GitHubIntelligenceRequest
): Effect.Effect<GitHubIntelligenceInput, GitHubGraphQLError> {
	const {
		fetch,
		token,
		username,
		authorId,
		weekStart,
		weekEnd,
		now,
		repositoryInventory,
		additionalSearchRepositories = [],
		repositoryCache
	} = request;
	const previousStart = addZonedDays(weekStart, -7, COLLECTION_TIME_ZONE);
	const yearStart = new Date(now);
	yearStart.setUTCFullYear(yearStart.getUTCFullYear() - 1);
	const collaborationStart = new Date(now.getTime() - 30 * 86_400_000);
	const searchDate = isoDate(collaborationStart);
	const accountVariables = {
		contributionWeekStart: weekStart.toISOString(),
		contributionWeekEnd: weekEnd.toISOString(),
		contributionPreviousStart: previousStart.toISOString(),
		yearStart: yearStart.toISOString(),
		now: now.toISOString()
	};
	const primarySearchScope = additionalSearchRepositories
		.map(({ repository }) => `-repo:${repository}`)
		.join(' ');
	const searchRequests = [
		{
			token,
			variables: searchVariables(
				username,
				searchDate,
				weekStart,
				weekEnd,
				previousStart,
				primarySearchScope,
				false
			),
			resource: 'dashboard search query'
		},
		...additionalSearchRepositories.map(({ repository, token: repositoryToken }) => ({
			token: repositoryToken,
			variables: searchVariables(
				username,
				searchDate,
				weekStart,
				weekEnd,
				previousStart,
				`repo:${repository}`,
				true
			),
			resource: 'organization repository search query'
		}))
	];
	const repositoryTokens = new Map(
		repositoryInventory.map((repository) => [
			repository.fullName.toLocaleLowerCase(),
			repository.token
		])
	);

	return Effect.gen(function* () {
		const [accountBody, searchBodies, repositoryCollection] = yield* Effect.all(
			[
				graphQLRequest(fetch, token, ACCOUNT_QUERY, accountVariables, 'account dashboard query'),
				Effect.forEach(
					searchRequests,
					(search) =>
						graphQLRequest(fetch, search.token, SEARCH_QUERY, search.variables, search.resource),
					{ concurrency: 3 }
				),
				collectGitHubRepositorySlices<GitHubGraphQLError>({
					username,
					repositoryNames: repositoryInventory.map((repository) => repository.fullName),
					windowStart: weekStart.toISOString(),
					windowEnd: weekEnd.toISOString(),
					now,
					cache: repositoryCache,
					observeFailure: (failure) => ({
						graphQLCost: failure.graphQLCost,
						successfulGraphQLRequests: failure.successfulGraphQLRequests
					}),
					load: (fullName) => {
						const repositoryToken = repositoryTokens.get(fullName.toLocaleLowerCase());
						if (repositoryToken === undefined) {
							return Effect.fail(
								new GitHubGraphQLError(
									'repository credential resolution',
									new Error('Repository inventory did not retain its credential.')
								)
							);
						}
						return fetchGitHubRepositorySlice({
							fetch,
							token: repositoryToken,
							fullName,
							authorId,
							weekStart: weekStart.toISOString(),
							weekEnd: weekEnd.toISOString(),
							previousStart: previousStart.toISOString()
						});
					}
				})
			],
			{ concurrency: 3 }
		);
		const accountResponse = yield* Schema.decodeUnknown(CoreResponseSchema)(accountBody).pipe(
			Effect.mapError((cause) => new GitHubGraphQLError('account response parsing', cause))
		);
		if (accountResponse.errors?.length || accountResponse.data == null) {
			return yield* Effect.fail(
				new GitHubGraphQLError('account dashboard response', accountResponse.errors)
			);
		}
		const decodedSearches: SearchData[] = [];
		for (const searchBody of searchBodies) {
			const searchResponse = yield* Schema.decodeUnknown(SearchResponseSchema)(searchBody).pipe(
				Effect.mapError((cause) => new GitHubGraphQLError('search response parsing', cause))
			);
			if (searchResponse.errors?.length || searchResponse.data == null) {
				return yield* Effect.fail(
					new GitHubGraphQLError('dashboard search response', searchResponse.errors)
				);
			}
			decodedSearches.push(searchResponse.data);
		}
		const primarySearch = decodedSearches[0];
		if (primarySearch === undefined) {
			return yield* Effect.fail(
				new GitHubGraphQLError(
					'dashboard search response',
					new Error('Primary GitHub search response was absent.')
				)
			);
		}
		const account = accountResponse.data;
		const searches = mergeSearchData([primarySearch, ...decodedSearches.slice(1)]);
		const repositories = repositoryCollection.repositories;
		const collaborationConnections = [
			searches.authoredPullRequests,
			searches.mergedPullRequests,
			searches.reviewedPullRequests,
			searches.authoredIssues,
			searches.commentedItems
		];
		const currentPullRequests = collectDeliveryPullRequests(
			searches.currentMergedPullRequests,
			searches.currentMaintainerMergedPullRequests,
			username
		);
		const previousPullRequests = collectDeliveryPullRequests(
			searches.previousMergedPullRequests,
			searches.previousMaintainerMergedPullRequests,
			username
		);
		const currentIssues = collectDeliveryIssues(
			searches.currentClosedIssues,
			searches.currentMaintainerClosedIssues,
			username
		);
		const previousIssues = collectDeliveryIssues(
			searches.previousClosedIssues,
			searches.previousMaintainerClosedIssues,
			username
		);
		const deliveryOutcomes = [...currentPullRequests.outcomes, ...currentIssues.outcomes].sort(
			(left, right) => right.occurredAt.localeCompare(left.occurredAt)
		);
		const releases = repositoryCollection.releases;
		const previousReleaseCount = repositoryCollection.previousReleaseCount;
		return {
			repositories,
			repositoryCollection: {
				totalRepositories: repositoryInventory.length,
				privateRepositories: repositoryInventory.filter((repository) => repository.isPrivate)
					.length,
				publicRepositories: repositoryInventory.filter((repository) => !repository.isPrivate)
					.length,
				freshRepositories: repositoryCollection.freshRepositories,
				staleRepositories: repositoryCollection.staleRepositories,
				graphQLCost:
					account.rateLimit.cost + searches.rateLimit.cost + repositoryCollection.graphQLCost,
				successfulGraphQLRequests:
					1 + decodedSearches.length + repositoryCollection.successfulGraphQLRequests
			},
			contributionDays: account.viewer.year.contributionCalendar.weeks.flatMap((week) =>
				week.contributionDays.map((day) => ({
					date: day.date,
					count: day.contributionCount
				}))
			),
			totalYearContributions: account.viewer.year.contributionCalendar.totalContributions,
			restrictedWeekContributions: account.viewer.current.restrictedContributionsCount,
			previousWeekContributions: account.viewer.previous.contributionCalendar.totalContributions,
			collaboration: {
				authoredPullRequests: searches.authoredPullRequests.issueCount,
				mergedPullRequests: searches.mergedPullRequests.issueCount,
				reviewedPullRequests: searches.reviewedPullRequests.issueCount,
				authoredIssues: searches.authoredIssues.issueCount,
				commentedItems: searches.commentedItems.issueCount,
				items: collectCollaborationItems(collaborationConnections)
			},
			delivery: {
				mergedPullRequests: currentPullRequests.mergedPullRequests,
				authoredMergedPullRequests: currentPullRequests.authoredMergedPullRequests,
				maintainerMergedPullRequests: currentPullRequests.maintainerMergedPullRequests,
				automatedMergedPullRequests: currentPullRequests.automatedMergedPullRequests,
				mergedPullRequestsTruncated: currentPullRequests.truncated,
				closedIssues: currentIssues.closedIssues,
				authoredClosedIssues: currentIssues.authoredClosedIssues,
				ownerClosedIssues: currentIssues.ownerClosedIssues,
				pullRequestClosedIssues: currentIssues.pullRequestClosedIssues,
				closedIssuesTruncated: currentIssues.truncated,
				previousHumanMergedPullRequests:
					previousPullRequests.authoredMergedPullRequests +
					previousPullRequests.maintainerMergedPullRequests,
				previousClosedIssues: previousIssues.closedIssues,
				outcomes: deliveryOutcomes,
				releases,
				previousReleaseCount,
				workflows: {
					coveredRepositories: 0,
					totalRepositories: repositories.filter((repository) => repository.commits.length > 0)
						.length,
					unavailableRepositories: [],
					truncated: false,
					current: {
						total: 0,
						successful: 0,
						failed: 0,
						cancelled: 0,
						other: 0,
						repositories: [],
						recent: [],
						annotations: {
							state: 'Unavailable',
							targetedRuns: 0,
							evidence: [],
							truncated: false,
							detail: 'Check-run annotations require the isolated Actions collector.'
						}
					},
					previous: { total: 0, successful: 0, failed: 0, cancelled: 0, other: 0 }
				}
			},
			rateLimit: {
				remaining: account.rateLimit.remaining,
				limit: account.rateLimit.limit,
				resetAt: account.rateLimit.resetAt
			}
		};
	});
}
