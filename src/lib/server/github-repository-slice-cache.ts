import { Schema } from 'effect';
import type { ReleaseInput, RepositoryIntelligenceInput } from '$lib/domain/github-intelligence';
import type { DashboardCacheStore } from '$lib/server/dashboard-snapshot-cache';

const CACHE_VERSION = 1;
const CommitSchema = Schema.Struct({
	sha: Schema.String,
	message: Schema.String,
	committedAt: Schema.DateFromString,
	url: Schema.String,
	additions: Schema.Number,
	deletions: Schema.Number,
	changedFiles: Schema.NullOr(Schema.Number)
});
const RepositorySliceSchema = Schema.Struct({
	name: Schema.String,
	fullName: Schema.String,
	url: Schema.String,
	description: Schema.NullOr(Schema.String),
	isPrivate: Schema.Boolean,
	isFork: Schema.Boolean,
	isArchived: Schema.Boolean,
	imageUrl: Schema.String,
	createdAt: Schema.DateFromString,
	pushedAt: Schema.NullOr(Schema.DateFromString),
	primaryLanguage: Schema.NullOr(Schema.String),
	primaryLanguageColor: Schema.NullOr(Schema.String),
	languages: Schema.Array(
		Schema.Struct({
			name: Schema.String,
			color: Schema.NullOr(Schema.String),
			bytes: Schema.Number
		})
	),
	stars: Schema.Number,
	forks: Schema.Number,
	diskUsageKb: Schema.Number,
	openIssues: Schema.Number,
	openPullRequests: Schema.Number,
	defaultBranch: Schema.NullOr(Schema.String),
	previousCommits: Schema.Number,
	commits: Schema.Array(CommitSchema)
});
const RepositoryEvidenceSliceSchema = Schema.Struct({
	repository: RepositorySliceSchema,
	releases: Schema.Array(
		Schema.Struct({
			name: Schema.String,
			tagName: Schema.String,
			repository: Schema.String,
			url: Schema.String,
			createdAt: Schema.String,
			publishedAt: Schema.NullOr(Schema.String),
			isPrerelease: Schema.Boolean
		})
	),
	previousReleaseCount: Schema.Number
});
const RepositorySliceEnvelopeSchema = Schema.Struct({
	version: Schema.Literal(CACHE_VERSION),
	username: Schema.String,
	repository: Schema.String,
	windowStart: Schema.String,
	windowEnd: Schema.String,
	cachedAt: Schema.String,
	slice: RepositoryEvidenceSliceSchema
});

export type GitHubRepositorySliceKey = {
	readonly username: string;
	readonly repository: string;
	readonly windowStart: string;
	readonly windowEnd: string;
};

export type GitHubRepositorySlice = {
	readonly repository: RepositoryIntelligenceInput;
	readonly releases: ReadonlyArray<ReleaseInput>;
	readonly previousReleaseCount: number;
};

type GitHubRepositorySliceRecord = {
	readonly slice: GitHubRepositorySlice;
	readonly cachedAt: string;
};

type GitHubRepositorySlicePersistence = 'Persisted' | 'Unavailable';

export type GitHubRepositorySliceCache = {
	readonly read: (key: GitHubRepositorySliceKey) => Promise<GitHubRepositorySliceRecord | null>;
	readonly write: (
		key: GitHubRepositorySliceKey,
		slice: GitHubRepositorySlice,
		cachedAt: string
	) => Promise<GitHubRepositorySlicePersistence>;
};

function cacheKey(key: GitHubRepositorySliceKey): string {
	return `weeknote:github-repository:v${CACHE_VERSION}:${key.username.toLocaleLowerCase()}:${encodeURIComponent(key.repository.toLocaleLowerCase())}`;
}

function matchesKey(
	envelope: Schema.Schema.Type<typeof RepositorySliceEnvelopeSchema>,
	key: GitHubRepositorySliceKey
): boolean {
	return (
		envelope.username.toLocaleLowerCase() === key.username.toLocaleLowerCase() &&
		envelope.repository.toLocaleLowerCase() === key.repository.toLocaleLowerCase() &&
		envelope.windowStart === key.windowStart &&
		envelope.windowEnd === key.windowEnd
	);
}

async function readSlice(
	store: DashboardCacheStore,
	key: GitHubRepositorySliceKey
): Promise<GitHubRepositorySliceRecord | null> {
	try {
		const encoded = await store.get(cacheKey(key));
		if (encoded === null) return null;
		const envelope = Schema.decodeUnknownSync(RepositorySliceEnvelopeSchema)(
			JSON.parse(encoded) as unknown
		);
		return matchesKey(envelope, key)
			? { slice: envelope.slice, cachedAt: envelope.cachedAt }
			: null;
	} catch {
		return null;
	}
}

async function writeSlice(
	store: DashboardCacheStore,
	key: GitHubRepositorySliceKey,
	slice: GitHubRepositorySlice,
	cachedAt: string
): Promise<GitHubRepositorySlicePersistence> {
	try {
		await store.put(
			cacheKey(key),
			JSON.stringify({ version: CACHE_VERSION, ...key, cachedAt, slice })
		);
		return 'Persisted';
	} catch {
		return 'Unavailable';
	}
}

/** Create a versioned same-window repository evidence cache. */
export function createGitHubRepositorySliceCache(
	store: DashboardCacheStore
): GitHubRepositorySliceCache {
	return {
		read: (key) => readSlice(store, key),
		write: (key, slice, cachedAt) => writeSlice(store, key, slice, cachedAt)
	};
}
