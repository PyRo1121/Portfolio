import { envBinding } from '$lib/server/env-binding';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { Effect } from 'effect';
import type { RequestHandler } from './$types';
import { PUBLIC_SHIPPING_RESOURCE_KINDS } from '$lib/domain/owner-project';
import { loadLiveDashboardSnapshot } from '$lib/server/dashboard-loader';
import { dashboardSnapshotCacheFor } from '$lib/server/dashboard-snapshot-cache';
import { parseGitHubChecksAppConfig } from '$lib/server/github-app-auth';
import { parseGitHubOrganizationAccessConfig } from '$lib/server/github-organization-access';
import { loadCloudflareUsageSnapshot } from '$lib/server/cloudflare-api';
import { cloudflareUsageCacheFor } from '$lib/server/cloudflare-usage-cache';
import { loadCloudflareDeploymentSnapshot } from '$lib/server/cloudflare-deployments-api';
import { cloudflareDeploymentCacheFor } from '$lib/server/cloudflare-deployment-cache';
import { configuredGitHubUsername } from '$lib/server/github-dashboard-page';
import { configuredOwnerEmail } from '$lib/server/owner-access';
import { loadOwnerProjectSnapshot } from '$lib/server/owner-project-store';
import { deleteExpiredTelemetryEvents } from '$lib/server/telemetry-store';
import { refreshLeaseClientFor } from '$lib/server/refresh-lease-client';

/**
 * Server-only warm-refresh endpoint. A separate scheduled Worker calls this on a
 * cron, so visitors always land on a warm cache and rarely experience the 504
 * that occurred when a request arrived while the GitHub snapshot was collecting.
 * Guarded by a shared secret so anonymous clients cannot burn GitHub quota.
 */
export const GET: RequestHandler = async ({ platform, request, setHeaders, url }) => {
	setHeaders({ 'cache-control': 'no-store' });

	const expectedSecret = envBinding(platform, 'WARM_SECRET');
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
	const refreshLeaseClient = refreshLeaseClientFor(platform.env.REFRESH_COORDINATOR);
	const username = configuredGitHubUsername(env['GITHUB_USERNAME'], platform.env.GITHUB_USERNAME);
	const token = envBinding(platform, 'GITHUB_TOKEN');
	const checksAppState = parseGitHubChecksAppConfig({
		appId: envBinding(platform, 'GITHUB_CHECKS_APP_ID'),
		installationId:
			platform.env.GITHUB_CHECKS_INSTALLATION_ID?.trim() ||
			env['GITHUB_CHECKS_INSTALLATION_ID']?.trim(),
		privateKey:
			platform.env.GITHUB_CHECKS_APP_PRIVATE_KEY?.trim() ||
			env['GITHUB_CHECKS_APP_PRIVATE_KEY']?.trim()
	});
	const organizationState = parseGitHubOrganizationAccessConfig({
		token: envBinding(platform, 'GITHUB_ORGANIZATION_TOKEN'),
		repositories:
			platform.env.GITHUB_ORGANIZATION_REPOSITORIES?.trim() ||
			env['GITHUB_ORGANIZATION_REPOSITORIES']?.trim()
	});
	const cloudflareAccountId = envBinding(platform, 'CLOUDFLARE_ACCOUNT_ID');
	const cloudflareToken = envBinding(platform, 'CLOUDFLARE_API_TOKEN');

	const dashboardCache = dashboardSnapshotCacheFor(platform.env.WEEKNOTE_CACHE, refreshLeaseClient);
	const cachedDashboard = await dashboardCache.read(username);
	const githubConfigurationError =
		checksAppState._tag === 'Invalid'
			? checksAppState.reason
			: organizationState._tag === 'Invalid'
				? organizationState.reason
				: null;
	let dashboardRefresh: Promise<Awaited<ReturnType<typeof dashboardCache.refresh>>>;
	if (token === undefined || token.length === 0) {
		dashboardRefresh = Promise.resolve({
			_tag: 'Unavailable',
			attemptedAt: now.toISOString(),
			reason: 'GitHub authentication is not configured.'
		});
	} else if (githubConfigurationError !== null) {
		dashboardRefresh = Promise.resolve({
			_tag: 'Unavailable',
			attemptedAt: now.toISOString(),
			reason: githubConfigurationError
		});
	} else {
		dashboardRefresh = dashboardCache.refresh(username, cachedDashboard, now, () =>
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
	}

	const usageCache = cloudflareUsageCacheFor(platform.env.WEEKNOTE_CACHE, refreshLeaseClient);
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

	const ownerEmail = configuredOwnerEmail(envBinding(platform, 'CAREER_OWNER_EMAIL'));
	const maintenanceRequested = url.searchParams.get('maintenance') === '1';
	const retentionExit =
		ownerEmail === null || maintenanceRequested === false
			? null
			: await Effect.runPromiseExit(
					deleteExpiredTelemetryEvents(
						platform.env.OWNER_DB,
						ownerEmail,
						new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
					)
				);
	const ownerExit =
		ownerEmail === null
			? null
			: await Effect.runPromiseExit(
					loadOwnerProjectSnapshot(
						platform.env.OWNER_DB,
						ownerEmail,
						PUBLIC_SHIPPING_RESOURCE_KINDS
					)
				);
	const workerNames =
		ownerEmail === null || ownerExit === null || ownerExit._tag === 'Failure'
			? []
			: ownerExit.value.projects.flatMap((project) =>
					project.resources.flatMap((resource) =>
						resource.kind === 'CloudflareWorker' ? [resource.providerId] : []
					)
				);

	const deploymentCache = cloudflareDeploymentCacheFor(
		platform.env.WEEKNOTE_CACHE,
		refreshLeaseClient
	);
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
	const ok =
		dashboard._tag !== 'Unavailable' &&
		usage._tag !== 'Unavailable' &&
		deployments._tag !== 'Unavailable' &&
		(retentionExit === null || retentionExit._tag === 'Success');

	return json(
		{
			ok,
			checkedAt: now.toISOString(),
			dashboard: {
				state: dashboard._tag,
				reason: dashboard._tag === 'Unavailable' ? dashboard.reason : undefined
			},
			usage: { state: usage._tag, reason: usage._tag === 'Unavailable' ? usage.reason : undefined },
			deployments: {
				state: deployments._tag,
				reason: deployments._tag === 'Unavailable' ? deployments.reason : undefined
			},
			maintenance:
				retentionExit === null
					? { state: 'Skipped' }
					: retentionExit._tag === 'Success'
						? { state: 'Fresh', deletedEvents: retentionExit.value }
						: { state: 'Unavailable', reason: 'Telemetry retention cleanup failed.' }
		},
		{ status: ok ? 200 : 503 }
	);
};
