import { Effect, Either } from 'effect';
import type { ReleaseInput, RepositoryIntelligenceInput } from '$lib/domain/github-intelligence';
import type {
	GitHubRepositorySlice,
	GitHubRepositorySliceCache,
	GitHubRepositorySliceKey
} from '$lib/server/github-repository-slice-cache';

const REPOSITORY_REFRESH_CONCURRENCY = 6;

export type GitHubGraphQLObservation = {
	readonly graphQLCost: number;
	readonly successfulGraphQLRequests: number;
};

export type GitHubRepositoryRefresh = GitHubGraphQLObservation & {
	readonly slice: GitHubRepositorySlice;
};

export type StaleGitHubRepository = {
	readonly repository: string;
	readonly cachedAt: string;
};

export type GitHubRepositoryCollection = {
	readonly repositories: ReadonlyArray<RepositoryIntelligenceInput>;
	readonly releases: ReadonlyArray<ReleaseInput>;
	readonly previousReleaseCount: number;
	readonly freshRepositories: number;
	readonly staleRepositories: ReadonlyArray<StaleGitHubRepository>;
	readonly graphQLCost: number;
	readonly successfulGraphQLRequests: number;
};

type RepositoryCollectorOptions<Failure> = {
	readonly username: string;
	readonly repositoryNames: ReadonlyArray<string>;
	readonly windowStart: string;
	readonly windowEnd: string;
	readonly now: Date;
	readonly cache: GitHubRepositorySliceCache;
	readonly load: (repository: string) => Effect.Effect<GitHubRepositoryRefresh, Failure>;
	readonly observeFailure?: (failure: Failure) => GitHubGraphQLObservation;
};

type CollectedRepository = {
	readonly slice: GitHubRepositorySlice;
	readonly state: 'Fresh' | 'Stale';
	readonly cachedAt: string | null;
	readonly graphQLCost: number;
	readonly successfulGraphQLRequests: number;
};

function sliceKey<Failure>(
	options: RepositoryCollectorOptions<Failure>,
	repository: string
): GitHubRepositorySliceKey {
	return {
		username: options.username,
		repository,
		windowStart: options.windowStart,
		windowEnd: options.windowEnd
	};
}

function collectRepository<Failure>(
	options: RepositoryCollectorOptions<Failure>,
	repository: string
): Effect.Effect<CollectedRepository, Failure> {
	const key = sliceKey(options, repository);
	return Effect.gen(function* () {
		const cached = yield* Effect.promise(() => options.cache.read(key));
		const loaded = yield* options.load(repository).pipe(Effect.either);
		if (Either.isRight(loaded)) {
			yield* Effect.promise(() =>
				options.cache.write(key, loaded.right.slice, options.now.toISOString())
			);
			return {
				...loaded.right,
				state: 'Fresh' as const,
				cachedAt: null
			};
		}
		const failureObservation = options.observeFailure?.(loaded.left) ?? {
			graphQLCost: 0,
			successfulGraphQLRequests: 0
		};
		return cached === null
			? yield* Effect.fail(loaded.left)
			: {
					slice: cached.slice,
					state: 'Stale' as const,
					cachedAt: cached.cachedAt,
					...failureObservation
				};
	});
}

/** Refresh repository evidence with bounded concurrency and exact-window stale fallback. */
export function collectGitHubRepositorySlices<Failure>(
	options: RepositoryCollectorOptions<Failure>
): Effect.Effect<GitHubRepositoryCollection, Failure> {
	return Effect.forEach(
		options.repositoryNames,
		(repository) => collectRepository(options, repository),
		{ concurrency: REPOSITORY_REFRESH_CONCURRENCY }
	).pipe(
		Effect.map((collected) => {
			let freshRepositories = 0;
			let previousReleaseCount = 0;
			let graphQLCost = 0;
			let successfulGraphQLRequests = 0;
			const repositories: RepositoryIntelligenceInput[] = [];
			const releases: ReleaseInput[] = [];
			const staleRepositories: StaleGitHubRepository[] = [];
			for (const repository of collected) {
				repositories.push(repository.slice.repository);
				releases.push(...repository.slice.releases);
				previousReleaseCount += repository.slice.previousReleaseCount;
				graphQLCost += repository.graphQLCost;
				successfulGraphQLRequests += repository.successfulGraphQLRequests;
				if (repository.state === 'Fresh') {
					freshRepositories += 1;
				} else if (repository.cachedAt !== null) {
					staleRepositories.push({
						repository: repository.slice.repository.fullName,
						cachedAt: repository.cachedAt
					});
				}
			}
			return {
				repositories,
				releases,
				previousReleaseCount,
				freshRepositories,
				staleRepositories,
				graphQLCost,
				successfulGraphQLRequests
			};
		})
	);
}
