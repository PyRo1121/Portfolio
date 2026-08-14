import { Effect, Redacted } from 'effect';
import { describe, expect, it } from 'vitest';
import { fetchGitHubIntelligence } from './github-graphql';
import { createGitHubRepositorySliceCache } from './github-repository-slice-cache';

type GraphQLPayload = {
	readonly query: string;
	readonly variables: Record<string, unknown>;
};

function contributionCollection(total: number) {
	return {
		restrictedContributionsCount: 0,
		totalCommitContributions: total,
		totalIssueContributions: 0,
		totalPullRequestContributions: 0,
		totalPullRequestReviewContributions: 0,
		totalRepositoryContributions: 0,
		contributionCalendar: {
			totalContributions: total,
			weeks: [{ contributionDays: [{ date: '2026-08-14', contributionCount: total }] }]
		}
	};
}

function accountResponse() {
	return {
		data: {
			viewer: {
				current: contributionCollection(2),
				previous: contributionCollection(1),
				year: contributionCollection(20)
			},
			rateLimit: { cost: 1, limit: 5000, remaining: 4900, resetAt: '2026-08-14T21:00:00Z' }
		}
	};
}

function searchResponse() {
	const empty = { issueCount: 0, nodes: [] };
	return {
		data: {
			authoredPullRequests: empty,
			mergedPullRequests: empty,
			reviewedPullRequests: empty,
			authoredIssues: empty,
			commentedItems: empty,
			currentMergedPullRequests: empty,
			currentClosedIssues: empty,
			previousMergedPullRequests: empty,
			previousClosedIssues: empty,
			rateLimit: { cost: 9, limit: 5000, remaining: 4891, resetAt: '2026-08-14T21:00:00Z' }
		}
	};
}

function repositoryResponse(fullName: string, paginated: boolean) {
	const [owner, name = fullName] = fullName.split('/');
	return {
		data: {
			rateLimit: { cost: 1, limit: 5000, remaining: 4890, resetAt: '2026-08-14T21:00:00Z' },
			repository: {
				name,
				nameWithOwner: fullName,
				url: `https://github.com/${fullName}`,
				isPrivate: name.endsWith('private'),
				isFork: false,
				isArchived: false,
				openGraphImageUrl: 'https://example.test/repository.png',
				createdAt: '2026-01-01T00:00:00Z',
				pushedAt: '2026-08-14T12:00:00Z',
				stargazerCount: 0,
				forkCount: 0,
				diskUsage: 100,
				description: `${owner} repository`,
				primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
				languages: { edges: [{ size: 100, node: { name: 'TypeScript', color: '#3178c6' } }] },
				issues: { totalCount: 0 },
				pullRequests: { totalCount: 0 },
				releases: { nodes: [] },
				defaultBranchRef: {
					name: 'main',
					target: {
						current: {
							totalCount: paginated ? 2 : 1,
							pageInfo: {
								hasNextPage: paginated,
								endCursor: paginated ? 'next-page' : null
							},
							nodes: [
								{
									oid: `${name}-sha`,
									committedDate: '2026-08-14T11:00:00Z',
									additions: 10,
									deletions: 2,
									changedFilesIfAvailable: 2,
									messageHeadline: `Ship ${name}`,
									url: `https://github.com/${fullName}/commit/sha`
								}
							]
						},
						previous: { totalCount: 0 }
					}
				}
			}
		}
	};
}

function commitPageResponse(fullName: string) {
	return {
		data: {
			rateLimit: { cost: 2, limit: 5000, remaining: 4888, resetAt: '2026-08-14T21:00:00Z' },
			repository: {
				defaultBranchRef: {
					target: {
						history: {
							totalCount: 2,
							pageInfo: { hasNextPage: false, endCursor: null },
							nodes: [
								{
									oid: 'paginated-sha',
									committedDate: '2026-08-14T10:00:00Z',
									additions: 4,
									deletions: 1,
									changedFilesIfAvailable: 1,
									messageHeadline: 'Paginated commit',
									url: `https://github.com/${fullName}/commit/paginated-sha`
								}
							]
						}
					}
				}
			}
		}
	};
}

function parsePayload(init: RequestInit | undefined): GraphQLPayload {
	if (typeof init?.body !== 'string') throw new Error('Expected a GraphQL JSON body.');
	try {
		return JSON.parse(init.body) as GraphQLPayload;
	} catch (cause) {
		throw new Error('GraphQL test request was not valid JSON.', { cause });
	}
}

function githubFetch(
	accountQueries: string[],
	repositoryQueries: string[],
	failingRepository: string | null,
	paginatedRepository: string | null = null,
	failingPaginationRepository: string | null = null
): typeof globalThis.fetch {
	return (async (_input: RequestInfo | URL, init?: RequestInit) => {
		const payload = parsePayload(init);
		if (payload.query.includes('GitHubSignalAccount')) {
			accountQueries.push(payload.query);
			return Response.json(accountResponse());
		}
		if (payload.query.includes('GitHubSignalSearches')) return Response.json(searchResponse());
		if (payload.query.includes('GitHubRepositorySlice')) {
			const fullName = `${String(payload.variables['owner'])}/${String(payload.variables['name'])}`;
			repositoryQueries.push(fullName);
			return fullName === failingRepository
				? new Response('upstream timeout', { status: 502 })
				: Response.json(repositoryResponse(fullName, fullName === paginatedRepository));
		}
		if (payload.query.includes('RepositoryCommitPage')) {
			const fullName = `${String(payload.variables['owner'])}/${String(payload.variables['name'])}`;
			return fullName === failingPaginationRepository
				? new Response('pagination timeout', { status: 502 })
				: Response.json(commitPageResponse(fullName));
		}
		throw new Error('Unexpected GraphQL operation.');
	}) as typeof globalThis.fetch;
}

function cacheFixture() {
	const values = new Map<string, string>();
	return createGitHubRepositorySliceCache({
		get: async (key) => values.get(key) ?? null,
		put: async (key, value) => {
			values.set(key, value);
		}
	});
}

const inventory = [
	{ fullName: 'octocat/product', isPrivate: false },
	{ fullName: 'octocat/product-private', isPrivate: true }
];
const requestWindow = {
	token: Redacted.make('secret'),
	username: 'octocat',
	authorId: 'MDQ6VXNlcjE=',
	weekStart: new Date('2026-08-08T00:00:00.000Z'),
	weekEnd: new Date('2026-08-15T00:00:00.000Z'),
	now: new Date('2026-08-14T20:00:00.000Z'),
	repositoryInventory: inventory
};

describe('incremental GitHub GraphQL intelligence', () => {
	it('uses a small account query and retains one failed repository slice', async () => {
		const cache = cacheFixture();
		const accountQueries: string[] = [];
		const repositoryQueries: string[] = [];
		const first = await Effect.runPromise(
			fetchGitHubIntelligence({
				...requestWindow,
				fetch: githubFetch(accountQueries, repositoryQueries, null, 'octocat/product'),
				repositoryCache: cache
			})
		);
		expect(first.repositoryCollection).toMatchObject({
			totalRepositories: 2,
			freshRepositories: 2,
			staleRepositories: [],
			graphQLCost: 14,
			successfulGraphQLRequests: 5
		});
		expect(accountQueries).toHaveLength(1);
		expect(accountQueries[0]).not.toContain('ownerAffiliations: OWNER');
		expect(repositoryQueries).toHaveLength(2);

		const second = await Effect.runPromise(
			fetchGitHubIntelligence({
				...requestWindow,
				fetch: githubFetch([], [], 'octocat/product-private'),
				repositoryCache: cache
			})
		);
		expect(second.repositories).toHaveLength(2);
		expect(second.repositoryCollection).toMatchObject({
			freshRepositories: 1,
			staleRepositories: [
				{
					repository: 'octocat/product-private',
					cachedAt: '2026-08-14T20:00:00.000Z'
				}
			],
			graphQLCost: 11,
			successfulGraphQLRequests: 3
		});

		const paginationFailure = await Effect.runPromise(
			fetchGitHubIntelligence({
				...requestWindow,
				fetch: githubFetch([], [], null, 'octocat/product', 'octocat/product'),
				repositoryCache: cache
			})
		);
		expect(paginationFailure.repositoryCollection).toMatchObject({
			freshRepositories: 1,
			staleRepositories: [
				{
					repository: 'octocat/product',
					cachedAt: '2026-08-14T20:00:00.000Z'
				}
			],
			graphQLCost: 12,
			successfulGraphQLRequests: 4
		});
	});
});
