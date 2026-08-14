import { Effect, Either } from 'effect';
import type { ReleaseInput, RepositoryIntelligenceInput } from '$lib/domain/github-intelligence';
import type {
	GitHubRepositorySlice,
	GitHubRepositorySliceCache,
	GitHubRepositorySliceKey
} from '$lib/server/github-repository-slice-cache';

const REPOSITORY_REFRESH_CONCURRENCY = 6;

export type GitHubRepositoryCollection = {
	readonly repositories: ReadonlyArray<RepositoryIntelligenceInput>;
	readonly releases: ReadonlyArray<ReleaseInput>;
	readonly previousReleaseCount: number;
	readonly freshRepositories: number;
	readonly staleRepositories: ReadonlyArray<string>;
};

type RepositoryCollectorOptions<Failure> = {
	readonly username: string;
	readonly repositoryNames: ReadonlyArray<string>;
	readonly windowStart: string;
	readonly windowEnd: string;
	readonly now: Date;
	readonly cache: GitHubRepositorySliceCache;
	readonly load: (repository: string) => Effect.Effect<GitHubRepositorySlice, Failure>;
};

type CollectedRepository = {
	readonly slice: GitHubRepositorySlice;
	readonly state: 'Fresh' | 'Stale';
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
				options.cache.write(key, loaded.right, options.now.toISOString())
			);
			return { slice: loaded.right, state: 'Fresh' as const };
		}
		return cached === null
			? yield* Effect.fail(loaded.left)
			: { slice: cached.slice, state: 'Stale' as const };
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
			const repositories: RepositoryIntelligenceInput[] = [];
			const releases: ReleaseInput[] = [];
			const staleRepositories: string[] = [];
			for (const repository of collected) {
				repositories.push(repository.slice.repository);
				releases.push(...repository.slice.releases);
				previousReleaseCount += repository.slice.previousReleaseCount;
				if (repository.state === 'Fresh') freshRepositories += 1;
				else staleRepositories.push(repository.slice.repository.fullName);
			}
			return {
				repositories,
				releases,
				previousReleaseCount,
				freshRepositories,
				staleRepositories
			};
		})
	);
}
