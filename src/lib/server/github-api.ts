import { Effect, Either, Redacted, Schema } from 'effect';
import { addZonedDays, COLLECTION_TIME_ZONE } from '$lib/domain/dashboard-time';
import {
	createWeeklySnapshot,
	startOfRollingWeek,
	type GitHubActivityEvent,
	type GitHubProfile,
	type GitHubRepository
} from '$lib/domain/github-stats';
import {
	createGitHubDashboardSnapshot,
	type GitHubDashboardSnapshot
} from '$lib/domain/github-intelligence';
import { fetchWorkflowCoverage } from './github-actions';
import { fetchGitHubChecksToken, type GitHubChecksAppConfig } from './github-app-auth';
import { fetchGitHubIntelligence, GitHubGraphQLError } from './github-graphql';
import { githubFetch, githubRequestHeaders } from './github-http';
import type { GitHubRepositorySliceCache } from './github-repository-slice-cache';

const MAX_EVENT_PAGES = 3;
const EVENTS_PER_PAGE = 100;
const REPOSITORY_AFFILIATIONS = 'owner,collaborator,organization_member';

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
	readonly token: Redacted.Redacted<string>;
	readonly checksApp?: GitHubChecksAppConfig;
};

type Fetch = typeof globalThis.fetch;
type RawEvent = Schema.Schema.Type<typeof EventSchema>;
type RawRepository = Schema.Schema.Type<typeof RepositorySchema>;

function requestJson(
	fetch: Fetch,
	path: string,
	token: Redacted.Redacted<string>
): Effect.Effect<unknown, GitHubRequestError> {
	const headers = githubRequestHeaders({ authorization: `Bearer ${Redacted.value(token)}` });

	return Effect.tryPromise({
		try: () => githubFetch(fetch, path, { headers }),
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

/** Fetch, parse, and summarize one user's current GitHub week. */
export function fetchWeeklySnapshot(
	fetch: Fetch,
	config: GitHubStatsConfig,
	now: Date,
	repositoryCache: GitHubRepositorySliceCache
): Effect.Effect<GitHubDashboardSnapshot, GitHubStatsError> {
	const username = encodeURIComponent(config.username);
	return Effect.gen(function* () {
		const userBody = yield* requestJson(fetch, '/user', config.token);
		const user = yield* Schema.decodeUnknown(UserSchema)(userBody).pipe(
			Effect.mapError((cause) => new GitHubResponseParseError('user', cause))
		);
		if (user.login.toLocaleLowerCase() !== config.username.toLocaleLowerCase()) {
			yield* Effect.fail(new GitHubIdentityMismatchError(config.username, user.login));
		}

		const eventPath = `/users/${username}/events`;
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

		const rawRepositories: RawRepository[] = [];
		for (let page = 1; page <= 100; page += 1) {
			const repositoryBody = yield* requestJson(
				fetch,
				`/user/repos?affiliation=${REPOSITORY_AFFILIATIONS}&sort=created&direction=desc&per_page=100&page=${String(page)}`,
				config.token
			);
			const repositoryPage = yield* Schema.decodeUnknown(Schema.Array(RepositorySchema))(
				repositoryBody
			).pipe(Effect.mapError((cause) => new GitHubResponseParseError('repositories', cause)));
			rawRepositories.push(...repositoryPage);
			if (repositoryPage.length < 100) break;
			if (page === 100) {
				yield* Effect.fail(
					new GitHubResponseParseError(
						'repositories',
						new Error('GitHub repository inventory exceeded the bounded 10,000 repository limit.')
					)
				);
			}
		}
		const repositories = rawRepositories.map(toRepository);

		const weekStart = startOfRollingWeek(now);
		const snapshot = createWeeklySnapshot({
			now,
			profile: toProfile(user),
			repositories,
			events,
			pushMeasurements: []
		});
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
					Effect.tapError((cause) =>
						Effect.sync(() =>
							console.warn('GitHub Checks app authentication failed:', cause.message)
						)
					),
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
