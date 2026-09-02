import { envBinding } from '$lib/server/env-binding';
import {
	PUBLIC_SHIPPING_RESOURCE_KINDS,
	type OwnerProjectSnapshot
} from '$lib/domain/owner-project';
import { createPublicShippingProjection } from '$lib/domain/owner-project-view';
import type { CloudflareDeploymentSnapshot } from '$lib/domain/cloudflare-deployments';
import { Effect } from 'effect';
import { cloudflareDeploymentCacheFor } from './cloudflare-deployment-cache';
import { loadCloudflareDeploymentSnapshot } from './cloudflare-deployments-api';
import { loadGitHubDashboardPageSlice } from './github-dashboard-page';
import { configuredOwnerEmail } from './owner-access';
import { loadOwnerProjectSnapshot } from './owner-project-store';
import { refreshLeaseClientFor } from './refresh-lease-client';

const PUBLIC_REGISTRY_REASON = 'Public shipping links.';

type PublicDashboardPageEvent = {
	readonly platform: App.Platform | undefined;
	readonly setHeaders: (headers: Record<string, string>) => void;
};

type PublicRegistryEvidence = {
	readonly registry: OwnerProjectSnapshot | null;
	readonly access: { readonly _tag: 'Current' | 'Unavailable'; readonly reason: string };
};

type RefreshLeaseClient = ReturnType<typeof refreshLeaseClientFor>;

async function loadPublicRegistry(
	platform: App.Platform,
	expectedOwnerEmail: string | null
): Promise<PublicRegistryEvidence> {
	if (expectedOwnerEmail === null) {
		return {
			registry: null,
			access: {
				_tag: 'Unavailable',
				reason: 'Owner identity configuration is unavailable.'
			}
		};
	}

	const ownerProjectExit = await Effect.runPromiseExit(
		loadOwnerProjectSnapshot(
			platform.env.OWNER_DB,
			expectedOwnerEmail,
			PUBLIC_SHIPPING_RESOURCE_KINDS
		)
	);
	if (ownerProjectExit._tag === 'Success') {
		return {
			registry: ownerProjectExit.value,
			access: { _tag: 'Current', reason: PUBLIC_REGISTRY_REASON }
		};
	}

	console.warn('Owner project registry load failed:', ownerProjectExit.cause);
	return {
		registry: null,
		access: {
			_tag: 'Unavailable',
			reason: 'Owner project storage is temporarily unavailable.'
		}
	};
}

function deploymentWorkerNames(registry: OwnerProjectSnapshot | null): ReadonlyArray<string> {
	return (
		registry?.projects.flatMap((project) =>
			project.resources.flatMap((resource) =>
				resource.kind === 'CloudflareWorker' ? [resource.providerId] : []
			)
		) ?? []
	);
}

async function loadPublicDeployments(
	platform: App.Platform,
	registry: OwnerProjectSnapshot | null,
	refreshLeaseClient: RefreshLeaseClient,
	now: Date
): Promise<CloudflareDeploymentSnapshot | null> {
	const cloudflareToken = envBinding(platform, 'CLOUDFLARE_API_TOKEN');
	const cloudflareAccountId = envBinding(platform, 'CLOUDFLARE_ACCOUNT_ID');
	const workerNames = deploymentWorkerNames(registry);
	if (cloudflareAccountId === undefined || workerNames.length === 0) return null;

	const deploymentCache = cloudflareDeploymentCacheFor(
		platform.env.WEEKNOTE_CACHE,
		refreshLeaseClient
	);
	const cached = await deploymentCache.read(cloudflareAccountId, workerNames);
	if (cloudflareToken !== undefined) {
		const refresh = deploymentCache.refresh(cloudflareAccountId, workerNames, cached, now, () =>
			loadCloudflareDeploymentSnapshot(
				globalThis.fetch,
				cloudflareAccountId,
				cloudflareToken,
				workerNames,
				now
			)
		);
		platform.ctx.waitUntil(refresh.then(() => undefined));
	}
	return cached?.snapshot ?? null;
}

/** Load the verified public GitHub and shipping evidence shared by the portfolio and dashboard. */
export async function loadPublicDashboardPageData({
	platform,
	setHeaders
}: PublicDashboardPageEvent) {
	const now = new Date();
	setHeaders({
		'cache-control': 'private, no-store'
	});
	if (platform === undefined) {
		throw new Error('Weeknote bindings are unavailable outside the configured Cloudflare runtime.');
	}

	const refreshLeaseClient = refreshLeaseClientFor(platform.env.REFRESH_COORDINATOR);
	const github = await loadGitHubDashboardPageSlice(platform, now);
	const expectedOwnerEmail = configuredOwnerEmail(envBinding(platform, 'CAREER_OWNER_EMAIL'));
	const { registry, access } = await loadPublicRegistry(platform, expectedOwnerEmail);
	const deployments = await loadPublicDeployments(platform, registry, refreshLeaseClient, now);

	return {
		...github,
		shipping: createPublicShippingProjection(registry, github.snapshot, deployments, access)
	};
}
