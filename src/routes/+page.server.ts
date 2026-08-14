import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import type { CloudflareUsageRefreshResult } from '$lib/domain/cloudflare-usage';
import type { DashboardRefreshResult } from '$lib/domain/dashboard-hydration';
import { createDemoIntelligence } from '$lib/domain/github-intelligence';
import { createDemoSnapshot } from '$lib/domain/github-stats';
import { loadCloudflareUsageSnapshot } from '$lib/server/cloudflare-api';
import { cloudflareUsageCacheFor } from '$lib/server/cloudflare-usage-cache';
import { loadLiveDashboardSnapshot } from '$lib/server/dashboard-loader';
import { dashboardSnapshotCacheFor } from '$lib/server/dashboard-snapshot-cache';

const DEFAULT_USERNAME = 'PyRo1121';

export const load: PageServerLoad = async ({ platform, setHeaders }) => {
	const username = env['GITHUB_USERNAME']?.trim() || DEFAULT_USERNAME;
	const token = env['GITHUB_TOKEN']?.trim();
	const now = new Date();

	setHeaders({
		'cache-control': 'private, no-store'
	});

	if (platform === undefined) {
		throw new Error('WEEKNOTE_CACHE is unavailable outside the configured Cloudflare runtime.');
	}

	const cloudflareToken =
		platform.env.CLOUDFLARE_API_TOKEN?.trim() || env['CLOUDFLARE_API_TOKEN']?.trim();
	const cloudflareAccountId =
		platform.env.CLOUDFLARE_ACCOUNT_ID?.trim() || env['CLOUDFLARE_ACCOUNT_ID']?.trim();
	const cloudflareCache = cloudflareUsageCacheFor(platform.env.WEEKNOTE_CACHE);
	const cachedCloudflare =
		cloudflareAccountId === undefined ? null : await cloudflareCache.read(cloudflareAccountId);
	let cloudflareRefresh: Promise<CloudflareUsageRefreshResult>;

	if (
		cloudflareToken === undefined ||
		cloudflareToken.length === 0 ||
		cloudflareAccountId === undefined ||
		cloudflareAccountId.length === 0
	) {
		cloudflareRefresh = Promise.resolve({
			_tag: 'Unavailable',
			attemptedAt: now.toISOString(),
			reason: 'Cloudflare account collection is not configured.'
		});
	} else {
		const refresh = cloudflareCache.refresh(cloudflareAccountId, cachedCloudflare, now, () =>
			loadCloudflareUsageSnapshot(globalThis.fetch, cloudflareAccountId, cloudflareToken, now)
		);
		if (cachedCloudflare !== null) {
			platform.ctx.waitUntil(refresh.then(() => undefined));
			cloudflareRefresh = Promise.resolve({ _tag: 'Current', checkedAt: now.toISOString() });
		} else {
			cloudflareRefresh = refresh;
		}
	}

	const cloudflareData = {
		cloudflare: cachedCloudflare?.snapshot ?? null,
		cloudflareCache: {
			_tag: cachedCloudflare === null ? ('Cold' as const) : ('Cached' as const),
			cachedAt: cachedCloudflare?.cachedAt ?? null
		},
		cloudflareRefresh
	};

	if (token === undefined || token.length === 0) {
		const snapshot = createDemoIntelligence(
			createDemoSnapshot(now, username, 'Add GITHUB_TOKEN to unlock private account intelligence.')
		);
		return {
			snapshot,
			cache: { _tag: 'Cold' as const, cachedAt: null },
			refresh: Promise.resolve<DashboardRefreshResult>({
				_tag: 'Unavailable',
				attemptedAt: now.toISOString(),
				reason: 'GitHub authentication is not configured.'
			}),
			...cloudflareData
		};
	}

	const dashboardSnapshotCache = dashboardSnapshotCacheFor(platform.env.WEEKNOTE_CACHE);
	const cached = await dashboardSnapshotCache.read(username);
	const refresh = dashboardSnapshotCache.refresh(username, cached, now, () =>
		loadLiveDashboardSnapshot(globalThis.fetch, username, token, now)
	);

	if (cached !== null) {
		platform.ctx.waitUntil(refresh.then(() => undefined));
		return {
			snapshot: cached.snapshot,
			cache: { _tag: 'Cached' as const, cachedAt: cached.cachedAt },
			refresh: Promise.resolve<DashboardRefreshResult>({
				_tag: 'Current',
				checkedAt: now.toISOString()
			}),
			...cloudflareData
		};
	}

	return {
		snapshot: null,
		cache: { _tag: 'Cold' as const, cachedAt: null },
		refresh,
		...cloudflareData
	};
};
