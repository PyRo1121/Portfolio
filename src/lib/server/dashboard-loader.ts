import { Effect, Redacted, Schedule } from 'effect';
import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
import type { DashboardCacheStore } from './dashboard-snapshot-cache';
import { fetchWeeklySnapshot } from './github-api';
import type { GitHubChecksAppConfig } from './github-app-auth';
import type { GitHubOrganizationAccessConfig } from './github-organization-access';
import { createGitHubRepositorySliceCache } from './github-repository-slice-cache';

const RETRY_DELAYS_MS = [700, 1_600] as const;

type Fetch = typeof globalThis.fetch;

export type DashboardLoadRequest = {
	readonly fetch: Fetch;
	readonly username: string;
	readonly token: string;
	readonly organization?: GitHubOrganizationAccessConfig;
	readonly checksApp?: GitHubChecksAppConfig;
	readonly now: Date;
	readonly cacheStore: DashboardCacheStore;
};

/** Load one live private snapshot with bounded retries around the upstream collection pipeline. */
export function loadLiveDashboardSnapshot(
	request: DashboardLoadRequest
): Promise<GitHubDashboardSnapshot> {
	const { fetch, username, token, organization, checksApp, now, cacheStore } = request;
	const repositoryCache = createGitHubRepositorySliceCache(cacheStore);
	const load = fetchWeeklySnapshot(
		fetch,
		{
			username,
			token: Redacted.make(token),
			...(organization === undefined ? {} : { organization }),
			...(checksApp === undefined ? {} : { checksApp })
		},
		now,
		repositoryCache
	);
	const boundedRetries = Schedule.intersect(
		Schedule.recurs(RETRY_DELAYS_MS.length),
		Schedule.fromDelays(...RETRY_DELAYS_MS)
	);
	return Effect.runPromise(Effect.retry(load, boundedRetries));
}
