import { envBinding } from '$lib/server/env-binding';
import { env } from '$env/dynamic/private';
import type { DashboardCacheState, DashboardRefreshResult } from '$lib/domain/dashboard-hydration';
import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
import { loadLiveDashboardSnapshot } from '$lib/server/dashboard-loader';
import { parseGitHubChecksAppConfig } from '$lib/server/github-app-auth';
import { dashboardSnapshotCacheFor } from '$lib/server/dashboard-snapshot-cache';
import { parseGitHubOrganizationAccessConfig } from '$lib/server/github-organization-access';
import { refreshLeaseClientFor } from '$lib/server/refresh-lease-client';

const DEFAULT_USERNAME = 'PyRo1121';

export type GitHubDashboardPageSlice = {
	readonly snapshot: GitHubDashboardSnapshot | null;
	readonly cache: DashboardCacheState;
	readonly refresh: Promise<DashboardRefreshResult>;
};

type Platform = App.Platform;

/** Resolve the GitHub user used by dashboard load and owner story actions. */
export function configuredGitHubUsername(
	envUsername: string | undefined,
	platformUsername: string | undefined
): string {
	const fromEnv = envUsername?.trim();
	if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv;
	const fromPlatform = platformUsername?.trim();
	if (fromPlatform !== undefined && fromPlatform.length > 0) return fromPlatform;
	return DEFAULT_USERNAME;
}

/** Load the GitHub snapshot slice shared by public `/` and `/owner`. */
export async function loadGitHubDashboardPageSlice(
	platform: Platform,
	now: Date
): Promise<GitHubDashboardPageSlice> {
	const username = configuredGitHubUsername(env['GITHUB_USERNAME'], platform.env.GITHUB_USERNAME);
	const token = env['GITHUB_TOKEN']?.trim();
	const checksAppState = parseGitHubChecksAppConfig({
		appId: envBinding(platform, 'GITHUB_CHECKS_APP_ID'),
		installationId:
			platform.env.GITHUB_CHECKS_INSTALLATION_ID?.trim() ||
			env['GITHUB_CHECKS_INSTALLATION_ID']?.trim(),
		privateKey:
			platform.env.GITHUB_CHECKS_APP_PRIVATE_KEY?.trim() ||
			env['GITHUB_CHECKS_APP_PRIVATE_KEY']?.trim()
	});
	const organizationToken = envBinding(platform, 'GITHUB_ORGANIZATION_TOKEN');
	const organizationRepositories =
		platform.env.GITHUB_ORGANIZATION_REPOSITORIES?.trim() ||
		env['GITHUB_ORGANIZATION_REPOSITORIES']?.trim();
	const organizationState = parseGitHubOrganizationAccessConfig({
		token: organizationToken,
		repositories: organizationRepositories
	});
	if (token === undefined || token.length === 0) {
		return {
			snapshot: null,
			cache: { _tag: 'Cold', cachedAt: null },
			refresh: Promise.resolve({
				_tag: 'Unavailable',
				attemptedAt: now.toISOString(),
				reason: 'GitHub authentication is not configured.'
			})
		};
	}
	const refreshLeaseClient = refreshLeaseClientFor(platform.env.REFRESH_COORDINATOR);
	const dashboardSnapshotCache = dashboardSnapshotCacheFor(
		platform.env.WEEKNOTE_CACHE,
		refreshLeaseClient
	);
	const cached = await dashboardSnapshotCache.read(username);
	const invalidReason =
		checksAppState._tag === 'Invalid'
			? checksAppState.reason
			: organizationState._tag === 'Invalid'
				? organizationState.reason
				: null;
	const refresh: Promise<DashboardRefreshResult> =
		invalidReason !== null
			? Promise.resolve({
					_tag: 'Unavailable',
					attemptedAt: now.toISOString(),
					reason: invalidReason
				})
			: dashboardSnapshotCache.refresh(username, cached, now, () =>
					loadLiveDashboardSnapshot({
						fetch: globalThis.fetch,
						username,
						token,
						...(organizationState._tag === 'Configured'
							? { organization: organizationState.config }
							: {}),
						...(checksAppState._tag === 'Configured' ? { checksApp: checksAppState.config } : {}),
						now,
						cacheStore: platform.env.WEEKNOTE_CACHE
					})
				);
	platform.ctx.waitUntil(refresh.then(() => undefined));
	if (cached !== null) {
		return {
			snapshot: cached.snapshot,
			cache: { _tag: 'Cached', cachedAt: cached.cachedAt },
			refresh
		};
	}
	return {
		snapshot: null,
		cache: { _tag: 'Cold', cachedAt: null },
		refresh
	};
}

export { DEFAULT_USERNAME };
