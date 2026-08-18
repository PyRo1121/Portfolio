import { env } from '$env/dynamic/private';
import type { DashboardCacheState, DashboardRefreshResult } from '$lib/domain/dashboard-hydration';
import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
import { loadLiveDashboardSnapshot } from '$lib/server/dashboard-loader';
import { parseGitHubChecksAppConfig } from '$lib/server/github-app-auth';
import { dashboardSnapshotCacheFor } from '$lib/server/dashboard-snapshot-cache';

const DEFAULT_USERNAME = 'PyRo1121';

export type GitHubDashboardPageSlice = {
	readonly snapshot: GitHubDashboardSnapshot | null;
	readonly cache: DashboardCacheState;
	readonly refresh: Promise<DashboardRefreshResult>;
};

type Platform = App.Platform;

/** Load the GitHub snapshot slice shared by public `/` and `/owner`. */
export async function loadGitHubDashboardPageSlice(
	platform: Platform,
	now: Date
): Promise<GitHubDashboardPageSlice> {
	const username = env['GITHUB_USERNAME']?.trim() || DEFAULT_USERNAME;
	const token = env['GITHUB_TOKEN']?.trim();
	const checksApp = parseGitHubChecksAppConfig({
		appId: platform.env.GITHUB_CHECKS_APP_ID?.trim() || env['GITHUB_CHECKS_APP_ID']?.trim(),
		installationId:
			platform.env.GITHUB_CHECKS_INSTALLATION_ID?.trim() ||
			env['GITHUB_CHECKS_INSTALLATION_ID']?.trim(),
		privateKey:
			platform.env.GITHUB_CHECKS_APP_PRIVATE_KEY?.trim() ||
			env['GITHUB_CHECKS_APP_PRIVATE_KEY']?.trim()
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
	const dashboardSnapshotCache = dashboardSnapshotCacheFor(platform.env.WEEKNOTE_CACHE);
	const cached = await dashboardSnapshotCache.read(username);
	const refresh = dashboardSnapshotCache.refresh(username, cached, now, () =>
		loadLiveDashboardSnapshot({
			fetch: globalThis.fetch,
			username,
			token,
			...(checksApp === undefined ? {} : { checksApp }),
			now,
			cacheStore: platform.env.WEEKNOTE_CACHE
		})
	);
	if (cached !== null) {
		platform.ctx.waitUntil(refresh.then(() => undefined));
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
