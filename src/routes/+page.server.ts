import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import { PUBLIC_SHIPPING_RESOURCE_KINDS } from '$lib/domain/owner-project';
import { createPublicShippingProjection } from '$lib/domain/owner-project-view';
import { configuredOwnerEmail } from '$lib/server/owner-access';
import { loadGitHubDashboardPageSlice } from '$lib/server/github-dashboard-page';
import { cloudflareDeploymentCacheFor } from '$lib/server/cloudflare-deployment-cache';
import { loadCloudflareDeploymentSnapshot } from '$lib/server/cloudflare-deployments-api';
import { loadOwnerProjectSnapshot } from '$lib/server/owner-project-store';
import { Effect } from 'effect';

const PUBLIC_REGISTRY_REASON = 'Public shipping links.';

export const load: PageServerLoad = async ({ platform, setHeaders }) => {
	const now = new Date();
	setHeaders({
		'cache-control': 'private, no-store'
	});
	if (platform === undefined) {
		throw new Error('Weeknote bindings are unavailable outside the configured Cloudflare runtime.');
	}

	const github = await loadGitHubDashboardPageSlice(platform, now);
	const expectedOwnerEmail = configuredOwnerEmail(
		platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	let registry = null;
	let access: { readonly _tag: 'Current' | 'Unavailable'; readonly reason: string } = {
		_tag: 'Unavailable',
		reason: 'Owner identity configuration is unavailable.'
	};
	if (expectedOwnerEmail !== null) {
		const ownerProjectExit = await Effect.runPromiseExit(
			loadOwnerProjectSnapshot(
				platform.env.OWNER_DB,
				expectedOwnerEmail,
				PUBLIC_SHIPPING_RESOURCE_KINDS
			)
		);
		if (ownerProjectExit._tag === 'Success') {
			registry = ownerProjectExit.value;
			access = { _tag: 'Current', reason: PUBLIC_REGISTRY_REASON };
		} else {
			console.warn('Owner project registry load failed:', ownerProjectExit.cause);
			access = {
				_tag: 'Unavailable',
				reason: 'Owner project storage is temporarily unavailable.'
			};
		}
	}

	const cloudflareToken =
		platform.env.CLOUDFLARE_API_TOKEN?.trim() || env['CLOUDFLARE_API_TOKEN']?.trim();
	const cloudflareAccountId =
		platform.env.CLOUDFLARE_ACCOUNT_ID?.trim() || env['CLOUDFLARE_ACCOUNT_ID']?.trim();
	const deploymentWorkerNames =
		registry?.projects.flatMap((project) =>
			project.resources.flatMap((resource) =>
				resource.kind === 'CloudflareWorker' ? [resource.providerId] : []
			)
		) ?? [];
	const deploymentCache = cloudflareDeploymentCacheFor(platform.env.WEEKNOTE_CACHE);
	const cachedDeployments =
		cloudflareAccountId === undefined || deploymentWorkerNames.length === 0
			? null
			: await deploymentCache.read(cloudflareAccountId, deploymentWorkerNames);
	if (
		cloudflareToken !== undefined &&
		cloudflareToken.length > 0 &&
		cloudflareAccountId !== undefined &&
		cloudflareAccountId.length > 0 &&
		deploymentWorkerNames.length > 0
	) {
		const refresh = deploymentCache.refresh(
			cloudflareAccountId,
			deploymentWorkerNames,
			cachedDeployments,
			now,
			() =>
				loadCloudflareDeploymentSnapshot(
					globalThis.fetch,
					cloudflareAccountId,
					cloudflareToken,
					deploymentWorkerNames,
					now
				)
		);
		platform.ctx.waitUntil(refresh.then(() => undefined));
	}

	return {
		...github,
		shipping: createPublicShippingProjection(
			registry,
			github.snapshot,
			cachedDeployments?.snapshot ?? null,
			access
		)
	};
};
