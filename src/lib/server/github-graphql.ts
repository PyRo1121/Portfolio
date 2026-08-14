import { Effect, Redacted, Schema } from 'effect';
import { addZonedDays, COLLECTION_TIME_ZONE } from '$lib/domain/dashboard-time';
import type {
	CollaborationItem,
	CommitIntelligenceInput,
	GitHubIntelligenceInput,
	RepositoryIntelligenceInput
} from '$lib/domain/github-intelligence';

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const REPOSITORY_PAGE_SIZE = 100;
const COMMIT_PAGE_SIZE = 100;
const SEARCH_PAGE_SIZE = 20;

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
	repository: SearchRepositorySchema
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
	repository: SearchRepositorySchema
});

const SearchResultSchema = Schema.Union(PullRequestSearchResultSchema, IssueSearchResultSchema);

const SearchConnectionSchema = Schema.Struct({
	issueCount: Schema.Number,
	nodes: Schema.Array(Schema.NullOr(SearchResultSchema))
});

const CoreDataSchema = Schema.Struct({
	viewer: Schema.Struct({
		current: ContributionCollectionSchema,
		previous: ContributionCollectionSchema,
		year: ContributionCollectionSchema,
		repositories: Schema.Struct({
			totalCount: Schema.Number,
			nodes: Schema.Array(Schema.NullOr(RepositorySchema))
		})
	}),
	rateLimit: Schema.Struct({
		limit: Schema.Number,
		remaining: Schema.Number,
		resetAt: Schema.String
	})
});
const SearchDataSchema = Schema.Struct({
	authoredPullRequests: SearchConnectionSchema,
	mergedPullRequests: SearchConnectionSchema,
	reviewedPullRequests: SearchConnectionSchema,
	authoredIssues: SearchConnectionSchema,
	commentedItems: SearchConnectionSchema,
	currentMergedPullRequests: SearchConnectionSchema,
	currentClosedIssues: SearchConnectionSchema,
	previousMergedPullRequests: SearchConnectionSchema,
	previousClosedIssues: SearchConnectionSchema
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

const CommitPageDataSchema = Schema.Struct({
	repository: Schema.NullOr(
		Schema.Struct({
			defaultBranchRef: Schema.NullOr(
				Schema.Struct({ target: Schema.NullOr(Schema.Struct({ history: HistorySchema })) })
			)
		})
	)
});

const CommitPageResponseSchema = Schema.Struct({
	data: Schema.optional(Schema.NullOr(CommitPageDataSchema)),
	errors: Schema.optional(Schema.Array(GraphQLErrorSchema))
});

const CORE_QUERY = `
query GitHubSignalCore(
  $author: ID!
  $weekStart: GitTimestamp!
  $weekEnd: GitTimestamp!
  $previousStart: GitTimestamp!
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
    repositories(first: ${REPOSITORY_PAGE_SIZE}, ownerAffiliations: OWNER, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
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
  }
  rateLimit { limit remaining resetAt }
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

fragment HistoryFields on CommitHistoryConnection {
  totalCount
  pageInfo { hasNextPage endCursor }
  nodes {
    oid
    committedDate
    additions
    deletions
    changedFilesIfAvailable
    messageHeadline
    url
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
  $currentClosedIssues: String!
  $previousMergedPullRequests: String!
  $previousClosedIssues: String!
) {
  authoredPullRequests: search(query: $authoredPullRequests, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  mergedPullRequests: search(query: $mergedPullRequests, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  reviewedPullRequests: search(query: $reviewedPullRequests, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  authoredIssues: search(query: $authoredIssues, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  commentedItems: search(query: $commentedItems, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  currentMergedPullRequests: search(query: $currentMergedPullRequests, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  currentClosedIssues: search(query: $currentClosedIssues, type: ISSUE, first: ${SEARCH_PAGE_SIZE}) { ...SearchFields }
  previousMergedPullRequests: search(query: $previousMergedPullRequests, type: ISSUE, first: 1) { ...SearchFields }
  previousClosedIssues: search(query: $previousClosedIssues, type: ISSUE, first: 1) { ...SearchFields }
}

fragment SearchFields on SearchResultItemConnection {
  issueCount
  nodes {
    __typename
    ... on PullRequest {
      title number url state createdAt mergedAt additions deletions changedFiles
      comments { totalCount }
      reviews { totalCount }
      repository { nameWithOwner isPrivate }
    }
    ... on Issue {
      title number url state createdAt closedAt
      comments { totalCount }
      repository { nameWithOwner isPrivate }
    }
  }
}`;

const COMMIT_PAGE_QUERY = `
query RepositoryCommitPage(
  $owner: String!
  $name: String!
  $author: ID!
  $weekStart: GitTimestamp!
  $weekEnd: GitTimestamp!
  $after: String!
) {
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
		readonly status: number | null = null
	) {
		super(
			`GitHub GraphQL failed during ${operation}${status === null ? '' : ` with HTTP ${status}`}`,
			{ cause }
		);
	}
}

type Fetch = typeof globalThis.fetch;
type DecodedRepository = Schema.Schema.Type<typeof RepositorySchema>;
type DecodedCommit = Schema.Schema.Type<typeof CommitSchema>;
type SearchConnection = Schema.Schema.Type<typeof SearchConnectionSchema>;

function graphQLRequest(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	query: string,
	variables: Readonly<Record<string, unknown>>,
	operation: string
): Effect.Effect<unknown, GitHubGraphQLError> {
	return Effect.tryPromise({
		try: async () => {
			const response = await fetch(GRAPHQL_ENDPOINT, {
				method: 'POST',
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${Redacted.value(token)}`,
					'Content-Type': 'application/json',
					'X-GitHub-Api-Version': '2022-11-28'
				},
				body: JSON.stringify({ query, variables })
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

function fetchRemainingCommits(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	repository: DecodedRepository,
	authorId: string,
	weekStart: string,
	weekEnd: string
): Effect.Effect<ReadonlyArray<DecodedCommit>, GitHubGraphQLError> {
	const initialHistory = repository.defaultBranchRef?.target?.current;
	if (!initialHistory?.pageInfo.hasNextPage || initialHistory.pageInfo.endCursor === null) {
		return Effect.succeed([]);
	}
	const parts = repositoryParts(repository.nameWithOwner);
	if (parts === null) return Effect.succeed([]);
	const [owner, name] = parts;
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
					new GitHubGraphQLError('commit pagination response', response.errors)
				);
			}
			const history = response.data.repository?.defaultBranchRef?.target?.history;
			if (history === undefined) break;
			commits.push(...history.nodes.filter((commit) => commit !== null));
			hasNextPage = history.pageInfo.hasNextPage;
			cursor = history.pageInfo.endCursor;
		}
		return commits;
	});
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
		languages: repository.languages.edges
			.filter((edge) => edge !== null)
			.map((edge) => ({ name: edge.node.name, color: edge.node.color, bytes: edge.size })),
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

function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Fetch private-aware repository, commit, calendar, and collaboration intelligence. */
export function fetchGitHubIntelligence(
	fetch: Fetch,
	token: Redacted.Redacted<string>,
	username: string,
	authorId: string,
	weekStart: Date,
	weekEnd: Date,
	now: Date
): Effect.Effect<GitHubIntelligenceInput, GitHubGraphQLError> {
	const previousStart = addZonedDays(weekStart, -7, COLLECTION_TIME_ZONE);
	const yearStart = new Date(now);
	yearStart.setUTCFullYear(yearStart.getUTCFullYear() - 1);
	const collaborationStart = new Date(now.getTime() - 30 * 86_400_000);
	const searchDate = isoDate(collaborationStart);
	const variables = {
		author: authorId,
		weekStart: weekStart.toISOString(),
		weekEnd: weekEnd.toISOString(),
		previousStart: previousStart.toISOString(),
		contributionWeekStart: weekStart.toISOString(),
		contributionWeekEnd: weekEnd.toISOString(),
		contributionPreviousStart: previousStart.toISOString(),
		yearStart: yearStart.toISOString(),
		now: now.toISOString(),
		authoredPullRequests: `is:pr author:${username} created:>=${searchDate}`,
		mergedPullRequests: `is:pr author:${username} merged:>=${searchDate}`,
		reviewedPullRequests: `is:pr reviewed-by:${username} updated:>=${searchDate}`,
		authoredIssues: `is:issue author:${username} created:>=${searchDate}`,
		commentedItems: `commenter:${username} updated:>=${searchDate}`,
		currentMergedPullRequests: `is:pr author:${username} merged:${weekStart.toISOString()}..${weekEnd.toISOString()}`,
		currentClosedIssues: `is:issue author:${username} closed:${weekStart.toISOString()}..${weekEnd.toISOString()}`,
		previousMergedPullRequests: `is:pr author:${username} merged:${previousStart.toISOString()}..${weekStart.toISOString()}`,
		previousClosedIssues: `is:issue author:${username} closed:${previousStart.toISOString()}..${weekStart.toISOString()}`
	};

	return Effect.gen(function* () {
		const [coreBody, searchBody] = yield* Effect.all(
			[
				graphQLRequest(fetch, token, CORE_QUERY, variables, 'core dashboard query'),
				graphQLRequest(fetch, token, SEARCH_QUERY, variables, 'dashboard search query')
			],
			{ concurrency: 2 }
		);
		const coreResponse = yield* Schema.decodeUnknown(CoreResponseSchema)(coreBody).pipe(
			Effect.mapError((cause) => new GitHubGraphQLError('core response parsing', cause))
		);
		const searchResponse = yield* Schema.decodeUnknown(SearchResponseSchema)(searchBody).pipe(
			Effect.mapError((cause) => new GitHubGraphQLError('search response parsing', cause))
		);
		if (coreResponse.errors?.length || coreResponse.data == null) {
			return yield* Effect.fail(
				new GitHubGraphQLError('core dashboard response', coreResponse.errors)
			);
		}
		if (searchResponse.errors?.length || searchResponse.data == null) {
			return yield* Effect.fail(
				new GitHubGraphQLError('dashboard search response', searchResponse.errors)
			);
		}
		const core = coreResponse.data;
		const searches = searchResponse.data;
		const decodedRepositories = core.viewer.repositories.nodes.filter(
			(repository) => repository !== null
		);
		const repositories: RepositoryIntelligenceInput[] = [];
		for (const repository of decodedRepositories) {
			const additionalCommits = yield* fetchRemainingCommits(
				fetch,
				token,
				repository,
				authorId,
				weekStart.toISOString(),
				weekEnd.toISOString()
			);
			repositories.push(toRepository(repository, additionalCommits));
		}
		const collaborationConnections = [
			searches.authoredPullRequests,
			searches.mergedPullRequests,
			searches.reviewedPullRequests,
			searches.authoredIssues,
			searches.commentedItems
		];
		const deliveryOutcomes = [
			...searches.currentMergedPullRequests.nodes.flatMap((item) =>
				item?.__typename === 'PullRequest' && item.mergedAt !== null
					? [
							{
								kind: 'PullRequest' as const,
								title: item.title,
								number: item.number,
								repository: item.repository.nameWithOwner,
								url: item.url,
								occurredAt: item.mergedAt,
								isPrivate: item.repository.isPrivate
							}
						]
					: []
			),
			...searches.currentClosedIssues.nodes.flatMap((item) =>
				item?.__typename === 'Issue' && item.closedAt !== null
					? [
							{
								kind: 'Issue' as const,
								title: item.title,
								number: item.number,
								repository: item.repository.nameWithOwner,
								url: item.url,
								occurredAt: item.closedAt,
								isPrivate: item.repository.isPrivate
							}
						]
					: []
			)
		].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
		const releases = decodedRepositories.flatMap((repository) =>
			repository.releases.nodes.flatMap((release) => {
				if (release === null || release.isDraft) return [];
				const occurredAt = release.publishedAt ?? release.createdAt;
				return occurredAt >= weekStart.toISOString() && occurredAt < weekEnd.toISOString()
					? [
							{
								name: release.name ?? release.tagName,
								tagName: release.tagName,
								repository: repository.nameWithOwner,
								url: release.url,
								createdAt: release.createdAt,
								publishedAt: release.publishedAt,
								isPrerelease: release.isPrerelease
							}
						]
					: [];
			})
		);
		const previousReleaseCount = decodedRepositories.reduce(
			(total, repository) =>
				total +
				repository.releases.nodes.filter((release) => {
					if (release === null || release.isDraft) return false;
					const occurredAt = release.publishedAt ?? release.createdAt;
					return occurredAt >= previousStart.toISOString() && occurredAt < weekStart.toISOString();
				}).length,
			0
		);
		return {
			repositories,
			contributionDays: core.viewer.year.contributionCalendar.weeks.flatMap((week) =>
				week.contributionDays.map((day) => ({
					date: day.date,
					count: day.contributionCount
				}))
			),
			totalYearContributions: core.viewer.year.contributionCalendar.totalContributions,
			restrictedWeekContributions: core.viewer.current.restrictedContributionsCount,
			previousWeekContributions: core.viewer.previous.contributionCalendar.totalContributions,
			collaboration: {
				authoredPullRequests: searches.authoredPullRequests.issueCount,
				mergedPullRequests: searches.mergedPullRequests.issueCount,
				reviewedPullRequests: searches.reviewedPullRequests.issueCount,
				authoredIssues: searches.authoredIssues.issueCount,
				commentedItems: searches.commentedItems.issueCount,
				items: collectCollaborationItems(collaborationConnections)
			},
			delivery: {
				mergedPullRequests: searches.currentMergedPullRequests.issueCount,
				closedIssues: searches.currentClosedIssues.issueCount,
				previousMergedPullRequests: searches.previousMergedPullRequests.issueCount,
				previousClosedIssues: searches.previousClosedIssues.issueCount,
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
						recent: []
					},
					previous: { total: 0, successful: 0, failed: 0, cancelled: 0, other: 0 }
				}
			},
			rateLimit: core.rateLimit
		};
	});
}
