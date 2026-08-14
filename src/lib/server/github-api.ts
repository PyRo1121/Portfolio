import { Effect, Either, Redacted, Schema } from 'effect';
import { addZonedDays, COLLECTION_TIME_ZONE } from '$lib/domain/dashboard-time';
import {
	createDemoSnapshot,
	createWeeklySnapshot,
	startOfRollingWeek,
	type GitHubActivityEvent,
	type GitHubProfile,
	type GitHubRepository,
	type PushMeasurement
} from '$lib/domain/github-stats';
import {
	createDemoIntelligence,
	createGitHubDashboardSnapshot,
	type GitHubDashboardSnapshot
} from '$lib/domain/github-intelligence';
import { fetchWorkflowCoverage } from './github-actions';
import { fetchGitHubChecksToken, type GitHubChecksAppConfig } from './github-app-auth';
import { fetchGitHubIntelligence, GitHubGraphQLError } from './github-graphql';
import type { GitHubRepositorySliceCache } from './github-repository-slice-cache';

const MAX_PUSH_LOOKUPS = 25;
const MAX_EVENT_PAGES = 3;
const EVENTS_PER_PAGE = 100;
const ZERO_SHA_PATTERN = /^0+$/;

const UserSchema = Schema.Struct({
	login: Schema.String,
	node_id: Schema.String,
	name: Schema.NullOr(Schema.String),
	avatar_url: Schema.String,
	html_url: Schema.String,
	public_repos: Schema.Number,
	followers: Schema.Number
});

const RepositorySchema = Schema.Struct({
	full_name: Schema.String,
	name: Schema.String,
	created_at: Schema.DateFromString,
	language: Schema.NullOr(Schema.String),
	stargazers_count: Schema.Number,
	forks_count: Schema.Number,
	html_url: Schema.String,
	private: Schema.Boolean
});

const EventSchema = Schema.Struct({
	type: Schema.String,
	created_at: Schema.DateFromString,
	repo: Schema.Struct({ name: Schema.String }),
	payload: Schema.Unknown
});

const PushPayloadSchema = Schema.Struct({
	before: Schema.String,
	head: Schema.String,
	ref: Schema.String
});

const CreatePayloadSchema = Schema.Struct({
	ref_type: Schema.String
});

const PullRequestPayloadSchema = Schema.Struct({
	action: Schema.String,
	pull_request: Schema.Struct({ merged: Schema.Boolean })
});

const ActionPayloadSchema = Schema.Struct({
	action: Schema.String
});

const FileChangeSchema = Schema.Struct({
	additions: Schema.Number,
	deletions: Schema.Number
});

const CompareSchema = Schema.Struct({
	total_commits: Schema.Number,
	files: Schema.optional(Schema.Array(FileChangeSchema))
});

const CommitSchema = Schema.Struct({
	stats: Schema.Struct({
		additions: Schema.Number,
		deletions: Schema.Number
	})
});

class GitHubRequestError extends Error {
	readonly _tag = 'GitHubRequestError';

	constructor(
		readonly path: string,
		readonly status: number | null,
		override readonly cause: unknown
	) {
		super(
			status === null
				? `GitHub request failed for ${path}`
				: `GitHub returned ${status} for ${path}`
		);
	}
}

class GitHubResponseParseError extends Error {
	readonly _tag = 'GitHubResponseParseError';

	constructor(
		readonly resource: string,
		override readonly cause: unknown
	) {
		super(`GitHub returned an unexpected ${resource} response`);
	}
}

class GitHubIdentityMismatchError extends Error {
	readonly _tag = 'GitHubIdentityMismatchError';

	constructor(
		readonly configuredUsername: string,
		readonly authenticatedUsername: string
	) {
		super('The GitHub token does not belong to the configured dashboard user');
	}
}

/** Expected failures produced by the GitHub statistics adapter. */
export type GitHubStatsError =
	GitHubRequestError | GitHubResponseParseError | GitHubIdentityMismatchError | GitHubGraphQLError;

/** Runtime configuration for the GitHub statistics adapter. */
export type GitHubStatsConfig = {
	readonly username: string;
	readonly token?: Redacted.Redacted<string>;
	readonly checksApp?: GitHubChecksAppConfig;
};

type Fetch = typeof globalThis.fetch;
type RawEvent = Schema.Schema.Type<typeof EventSchema>;
type RawRepository = Schema.Schema.Type<typeof RepositorySchema>;

function requestJson(
	fetch: Fetch,
	path: string,
	token: Redacted.Redacted<string> | undefined
): Effect.Effect<unknown, GitHubRequestError> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
	if (token !== undefined) headers['Authorization'] = `Bearer ${Redacted.value(token)}`;

	return Effect.tryPromise({
		try: () => fetch(`https://api.github.com${path}`, { headers }),
		catch: (cause) => new GitHubRequestError(path, null, cause)
	}).pipe(
		Effect.flatMap((response) =>
			response.ok
				? Effect.tryPromise({
						try: () => response.json(),
						catch: (cause) => new GitHubRequestError(path, response.status, cause)
					})
				: Effect.fail(new GitHubRequestError(path, response.status, null))
		)
	);
}

function parseActionEvent(raw: RawEvent, tag: 'Issue'): GitHubActivityEvent {
	const decoded = Schema.decodeUnknownEither(ActionPayloadSchema)(raw.payload);
	return Either.isRight(decoded)
		? {
				_tag: tag,
				createdAt: raw.created_at,
				repo: raw.repo.name,
				action: decoded.right.action
			}
		: {
				_tag: 'Other',
				createdAt: raw.created_at,
				repo: raw.repo.name,
				eventType: raw.type
			};
}

function parseEvent(raw: RawEvent): GitHubActivityEvent {
	switch (raw.type) {
		case 'PushEvent': {
			const decoded = Schema.decodeUnknownEither(PushPayloadSchema)(raw.payload);
			return Either.isRight(decoded)
				? {
						_tag: 'Push',
						createdAt: raw.created_at,
						repo: raw.repo.name,
						before: decoded.right.before,
						head: decoded.right.head
					}
				: {
						_tag: 'Other',
						createdAt: raw.created_at,
						repo: raw.repo.name,
						eventType: raw.type
					};
		}
		case 'CreateEvent': {
			const decoded = Schema.decodeUnknownEither(CreatePayloadSchema)(raw.payload);
			return Either.isRight(decoded) && decoded.right.ref_type === 'repository'
				? { _tag: 'RepositoryCreated', createdAt: raw.created_at, repo: raw.repo.name }
				: {
						_tag: 'Other',
						createdAt: raw.created_at,
						repo: raw.repo.name,
						eventType: raw.type
					};
		}
		case 'PullRequestEvent': {
			const decoded = Schema.decodeUnknownEither(PullRequestPayloadSchema)(raw.payload);
			return Either.isRight(decoded)
				? {
						_tag: 'PullRequest',
						createdAt: raw.created_at,
						repo: raw.repo.name,
						action: decoded.right.action,
						merged: decoded.right.pull_request.merged
					}
				: {
						_tag: 'Other',
						createdAt: raw.created_at,
						repo: raw.repo.name,
						eventType: raw.type
					};
		}
		case 'IssuesEvent':
			return parseActionEvent(raw, 'Issue');
		case 'IssueCommentEvent':
		case 'PullRequestReviewCommentEvent':
		case 'CommitCommentEvent':
			return { _tag: 'Comment', createdAt: raw.created_at, repo: raw.repo.name };
		case 'WatchEvent':
			return { _tag: 'Starred', createdAt: raw.created_at, repo: raw.repo.name };
		case 'ForkEvent':
			return { _tag: 'Forked', createdAt: raw.created_at, repo: raw.repo.name };
		default:
			return {
				_tag: 'Other',
				createdAt: raw.created_at,
				repo: raw.repo.name,
				eventType: raw.type
			};
	}
}

function toProfile(raw: Schema.Schema.Type<typeof UserSchema>): GitHubProfile {
	return {
		login: raw.login,
		name: raw.name ?? raw.login,
		avatarUrl: raw.avatar_url,
		profileUrl: raw.html_url,
		publicRepos: raw.public_repos,
		followers: raw.followers
	};
}

function toRepository(raw: RawRepository): GitHubRepository {
	return {
		fullName: raw.full_name,
		name: raw.name,
		createdAt: raw.created_at,
		language: raw.language,
		stars: raw.stargazers_count,
		forks: raw.forks_count,
		url: raw.html_url
	};
}

function encodeRepositoryPath(fullName: string): string {
	return fullName
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
}

function unavailableMeasurement(
	event: Extract<GitHubActivityEvent, { readonly _tag: 'Push' }>
): PushMeasurement {
	return {
		repo: event.repo,
		head: event.head,
		createdAt: event.createdAt,
		commits: null,
		additions: null,
		deletions: null
	};
}

function fetchPushMeasurement(
	fetch: Fetch,
	event: Extract<GitHubActivityEvent, { readonly _tag: 'Push' }>,
	token: Redacted.Redacted<string> | undefined
): Effect.Effect<PushMeasurement, GitHubStatsError> {
	const repository = encodeRepositoryPath(event.repo);
	if (ZERO_SHA_PATTERN.test(event.before)) {
		const path = `/repos/${repository}/commits/${encodeURIComponent(event.head)}`;
		return requestJson(fetch, path, token).pipe(
			Effect.flatMap((body) =>
				Schema.decodeUnknown(CommitSchema)(body).pipe(
					Effect.mapError((cause) => new GitHubResponseParseError('commit', cause))
				)
			),
			Effect.map((commit) => ({
				repo: event.repo,
				head: event.head,
				createdAt: event.createdAt,
				commits: 1,
				additions: commit.stats.additions,
				deletions: commit.stats.deletions
			}))
		);
	}

	const comparison = `${encodeURIComponent(event.before)}...${encodeURIComponent(event.head)}`;
	const path = `/repos/${repository}/compare/${comparison}`;
	return requestJson(fetch, path, token).pipe(
		Effect.flatMap((body) =>
			Schema.decodeUnknown(CompareSchema)(body).pipe(
				Effect.mapError((cause) => new GitHubResponseParseError('comparison', cause))
			)
		),
		Effect.map((result) => ({
			repo: event.repo,
			head: event.head,
			createdAt: event.createdAt,
			commits: result.total_commits,
			additions: (result.files ?? []).reduce((total, file) => total + file.additions, 0),
			deletions: (result.files ?? []).reduce((total, file) => total + file.deletions, 0)
		}))
	);
}

/** Fetch, parse, and summarize one user's current GitHub week. */
export function fetchWeeklySnapshot(
	fetch: Fetch,
	config: GitHubStatsConfig,
	now: Date,
	repositoryCache: GitHubRepositorySliceCache
): Effect.Effect<GitHubDashboardSnapshot, GitHubStatsError> {
	const username = encodeURIComponent(config.username);
	return Effect.gen(function* () {
		const userPath = config.token === undefined ? `/users/${username}` : '/user';
		const userBody = yield* requestJson(fetch, userPath, config.token);
		const user = yield* Schema.decodeUnknown(UserSchema)(userBody).pipe(
			Effect.mapError((cause) => new GitHubResponseParseError('user', cause))
		);
		if (user.login.toLocaleLowerCase() !== config.username.toLocaleLowerCase()) {
			yield* Effect.fail(new GitHubIdentityMismatchError(config.username, user.login));
		}

		const eventPath =
			config.token === undefined ? `/users/${username}/events/public` : `/users/${username}/events`;
		const rawEvents: RawEvent[] = [];
		for (let page = 1; page <= MAX_EVENT_PAGES; page += 1) {
			const eventBody = yield* requestJson(
				fetch,
				`${eventPath}?per_page=${EVENTS_PER_PAGE}&page=${page}`,
				config.token
			);
			const eventPage = yield* Schema.decodeUnknown(Schema.Array(EventSchema))(eventBody).pipe(
				Effect.mapError((cause) => new GitHubResponseParseError('events', cause))
			);
			rawEvents.push(...eventPage);
			if (eventPage.length < EVENTS_PER_PAGE) break;
		}
		const events = rawEvents.map(parseEvent);

		const repositoryPath =
			config.token === undefined
				? `/users/${username}/repos?type=owner&sort=created&direction=desc&per_page=100`
				: '/user/repos?affiliation=owner&sort=created&direction=desc&per_page=100';
		const repositoryBody = yield* requestJson(fetch, repositoryPath, config.token);
		const rawRepositories = yield* Schema.decodeUnknown(Schema.Array(RepositorySchema))(
			repositoryBody
		).pipe(Effect.mapError((cause) => new GitHubResponseParseError('repositories', cause)));
		const repositories = rawRepositories.map(toRepository);

		const weekStart = startOfRollingWeek(now);
		const pushes = events.filter(
			(event): event is Extract<GitHubActivityEvent, { readonly _tag: 'Push' }> =>
				event._tag === 'Push' && event.createdAt >= weekStart && event.createdAt <= now
		);
		const pushMeasurements: PushMeasurement[] = [];
		if (config.token === undefined) {
			for (const [index, push] of pushes.entries()) {
				if (index >= MAX_PUSH_LOOKUPS) {
					pushMeasurements.push(unavailableMeasurement(push));
					continue;
				}
				const measurement = yield* fetchPushMeasurement(fetch, push, config.token).pipe(
					Effect.catchAll(() => Effect.succeed(unavailableMeasurement(push)))
				);
				pushMeasurements.push(measurement);
			}
		}

		const snapshot = createWeeklySnapshot({
			now,
			profile: toProfile(user),
			repositories,
			events,
			pushMeasurements
		});
		if (config.token === undefined) {
			return createDemoIntelligence(
				createDemoSnapshot(
					now,
					config.username,
					'Add GITHUB_TOKEN to unlock private account intelligence.'
				)
			);
		}
		const weekEnd = addZonedDays(weekStart, 7, COLLECTION_TIME_ZONE);
		const intelligence = yield* fetchGitHubIntelligence({
			fetch,
			token: config.token,
			username: config.username,
			authorId: user.node_id,
			weekStart,
			weekEnd,
			now,
			repositoryInventory: rawRepositories.map((repository) => ({
				fullName: repository.full_name,
				isPrivate: repository.private
			})),
			repositoryCache
		});
		const checksToken = yield* config.checksApp === undefined
			? Effect.succeed<Redacted.Redacted<string> | undefined>(undefined)
			: fetchGitHubChecksToken(fetch, config.checksApp, now).pipe(
					Effect.catchAll(() => Effect.succeed(undefined))
				);
		const workflows = yield* fetchWorkflowCoverage(
			fetch,
			config.token,
			checksToken,
			config.username,
			intelligence.repositories,
			weekStart,
			weekEnd
		);
		return {
			...createGitHubDashboardSnapshot(snapshot, {
				...intelligence,
				delivery: { ...intelligence.delivery, workflows }
			}),
			source: { _tag: 'Live' as const, label: 'Private account signal' }
		};
	});
}
