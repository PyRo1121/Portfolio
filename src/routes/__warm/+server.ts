import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { Effect } from 'effect';
import type { RequestHandler } from './$types';
import { loadLiveDashboardSnapshot } from '$lib/server/dashboard-loader';
import { dashboardSnapshotCacheFor } from '$lib/server/dashboard-snapshot-cache';
import { parseGitHubChecksAppConfig } from '$lib/server/github-app-auth';
import { loadCloudflareUsageSnapshot } from '$lib/server/cloudflare-api';
import { cloudflareUsageCacheFor } from '$lib/server/cloudflare-usage-cache';
import { loadCloudflareDeploymentSnapshot } from '$lib/server/cloudflare-deployments-api';
import { cloudflareDeploymentCacheFor } from '$lib/server/cloudflare-deployment-cache';
import { configuredOwnerEmail } from '$lib/server/owner-access';
import { loadOwnerProjectSnapshot } from '$lib/server/owner-project-store';

const DEFAULT_USERNAME = 'PyRo1121';

/**
 * Server-only warm-refresh endpoint. A separate scheduled Worker calls this on a
 * cron, so visitors always land on a warm cache and rarely experience the 504
 * that occurred when a request arrived while the GitHub snapshot was collecting.
 * Guarded by a shared secret so anonymous clients cannot burn GitHub quota.
 */
export const GET: RequestHandler = async ({ platform, request, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });

	const expectedSecret = platform?.env.WARM_SECRET?.trim() || env['WARM_SECRET']?.trim();
	if (expectedSecret === undefined || expectedSecret.length === 0) {
		return json({ ok: false, reason: 'Warm refresh secret is not configured.' }, { status: 503 });
	}
	if (request.headers.get('x-warm-secret')?.trim() !== expectedSecret) {
		return json({ ok: false, reason: 'Warm refresh secret mismatch.' }, { status: 403 });
	}
	if (platform === undefined) {
		return json({ ok: false, reason: 'Cloudflare bindings are unavailable.' }, { status: 503 });
	}

	const now = new Date();
	const username =
		platform.env.GITHUB_USERNAME?.trim() || env['GITHUB_USERNAME']?.trim() || DEFAULT_USERNAME;
	const token = platform.env.GITHUB_TOKEN?.trim() || env['GITHUB_TOKEN']?.trim();
	const checksApp = parseGitHubChecksAppConfig({
		appId: platform.env.GITHUB_CHECKS_APP_ID?.trim() || env['GITHUB_CHECKS_APP_ID']?.trim(),
		installationId:
			platform.env.GITHUB_CHECKS_INSTALLATION_ID?.trim() ||
			env['GITHUB_CHECKS_INSTALLATION_ID']?.trim(),
		privateKey:
			platform.env.GITHUB_CHECKS_APP_PRIVATE_KEY?.trim() ||
			env['GITHUB_CHECKS_APP_PRIVATE_KEY']?.trim()
	});
	const cloudflareAccountId =
		platform.env.CLOUDFLARE_ACCOUNT_ID?.trim() || env['CLOUDFLARE_ACCOUNT_ID']?.trim();
	const cloudflareToken =
		platform.env.CLOUDFLARE_API_TOKEN?.trim() || env['CLOUDFLARE_API_TOKEN']?.trim();

	const dashboardCache = dashboardSnapshotCacheFor(platform.env.WEEKNOTE_CACHE);
	const cachedDashboard = await dashboardCache.read(username);
	const dashboardRefresh =
		token === undefined || token.length === 0
			? Promise.resolve<Awaited<ReturnType<typeof dashboardCache.refresh>>>({
					_tag: 'Unavailable',
					attemptedAt: now.toISOString(),
					reason: 'GitHub authentication is not configured.'
				})
			: dashboardCache.refresh(username, cachedDashboard, now, () =>
					loadLiveDashboardSnapshot({
						fetch: globalThis.fetch,
						username,
						token,
						...(checksApp === undefined ? {} : { checksApp }),
						now,
						cacheStore: platform.env.WEEKNOTE_CACHE
					})
				);

	const usageCache = cloudflareUsageCacheFor(platform.env.WEEKNOTE_CACHE);
	const cachedUsage =
		cloudflareAccountId === undefined ? null : await usageCache.read(cloudflareAccountId);
	const usageRefresh =
		cloudflareToken === undefined ||
		cloudflareToken.length === 0 ||
		cloudflareAccountId === undefined
			? Promise.resolve<Awaited<ReturnType<typeof usageCache.refresh>>>({
					_tag: 'Unavailable',
					attemptedAt: now.toISOString(),
					reason: 'Cloudflare access is not configured.'
				})
			: usageCache.refresh(cloudflareAccountId, cachedUsage, now, () =>
					loadCloudflareUsageSnapshot(globalThis.fetch, cloudflareAccountId, cloudflareToken, now)
				);

	const ownerEmail = configuredOwnerEmail(
		platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	const ownerExit =
		ownerEmail === null
			? null
			: await Effect.runPromiseExit(loadOwnerProjectSnapshot(platform.env.OWNER_DB, ownerEmail));
	const workerNames =
		ownerEmail === null || ownerExit === null || ownerExit._tag === 'Failure'
			? []
			: ownerExit.value.projects.flatMap((project) =>
					project.resources.flatMap((resource) =>
						resource.kind === 'CloudflareWorker' ? [resource.providerId] : []
					)
				);

	const deploymentCache = cloudflareDeploymentCacheFor(platform.env.WEEKNOTE_CACHE);
	const cachedDeployments =
		cloudflareAccountId === undefined || workerNames.length === 0
			? null
			: await deploymentCache.read(cloudflareAccountId, workerNames);
	const deploymentRefresh =
		cloudflareToken === undefined ||
		cloudflareToken.length === 0 ||
		cloudflareAccountId === undefined ||
		workerNames.length === 0
			? Promise.resolve<Awaited<ReturnType<typeof deploymentCache.refresh>>>({
					_tag: 'Unavailable',
					attemptedAt: now.toISOString(),
					reason: 'Cloudflare deployment collection is not configured.'
				})
			: deploymentCache.refresh(cloudflareAccountId, workerNames, cachedDeployments, now, () =>
					loadCloudflareDeploymentSnapshot(
						globalThis.fetch,
						cloudflareAccountId,
						cloudflareToken,
						workerNames,
						now
					)
				);

	const [dashboard, usage, deployments] = await Promise.all([
		dashboardRefresh,
		usageRefresh,
		deploymentRefresh
	]);

	return json({
		ok: true,
		checkedAt: now.toISOString(),
		dashboard: {
			state: dashboard._tag,
			reason: dashboard._tag === 'Unavailable' ? dashboard.reason : undefined
		},
		usage: { state: usage._tag, reason: usage._tag === 'Unavailable' ? usage.reason : undefined },
		deployments: {
			state: deployments._tag,
			reason: deployments._tag === 'Unavailable' ? deployments.reason : undefined
		}
	});
};
