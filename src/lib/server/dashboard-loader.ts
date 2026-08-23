import { Effect, Redacted } from 'effect';
import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
import type { DashboardCacheStore } from './dashboard-snapshot-cache';
import { fetchWeeklySnapshot } from './github-api';
import type { GitHubChecksAppConfig } from './github-app-auth';
import type { GitHubOrganizationAccessConfig } from './github-organization-access';
import { createGitHubRepositorySliceCache } from './github-repository-slice-cache';

const RETRY_DELAYS_MS = [700, 1_600] as const;

type Fetch = typeof globalThis.fetch;

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

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
export async function loadLiveDashboardSnapshot(
	request: DashboardLoadRequest
): Promise<GitHubDashboardSnapshot> {
	const { fetch, username, token, organization, checksApp, now, cacheStore } = request;
	const repositoryCache = createGitHubRepositorySliceCache(cacheStore);
	let lastFailure: unknown = new Error('GitHub refresh did not start.');
	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
		const exit = await Effect.runPromiseExit(
			fetchWeeklySnapshot(
				fetch,
				{
					username,
					token: Redacted.make(token),
					...(organization === undefined ? {} : { organization }),
					...(checksApp === undefined ? {} : { checksApp })
				},
				now,
				repositoryCache
			)
		);
		if (exit._tag === 'Success') return exit.value;
		lastFailure = exit.cause;
		const wait = RETRY_DELAYS_MS[attempt];
		if (wait !== undefined) await delay(wait);
	}
	throw lastFailure;
}
