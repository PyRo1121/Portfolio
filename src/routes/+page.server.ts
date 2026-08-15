import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import { Effect, Either } from 'effect';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import {
	parseCommitmentStatus,
	parseCreateCommitment,
	parseCreateOpportunity,
	parseCreateStory,
	parseStageTransition,
	parseUpdateOpportunity,
	parseUpdateStory
} from '$lib/domain/career-accountability';
import type { CloudflareDeploymentRefreshResult } from '$lib/domain/cloudflare-deployments';
import type { CloudflareUsageRefreshResult } from '$lib/domain/cloudflare-usage';
import type { DashboardRefreshResult } from '$lib/domain/dashboard-hydration';
import {
	parseAddOwnerProjectResource,
	parseCreateOwnerProject,
	parseRemoveOwnerProjectResource,
	parseUpdateOwnerProject
} from '$lib/domain/owner-project';
import {
	configuredOwnerEmail,
	isOwnerMutationPath,
	resolveOwnerAccess
} from '$lib/server/owner-access';
import {
	createCareerCommitment,
	createCareerOpportunity,
	loadCareerSnapshot,
	setCareerCommitmentStatus,
	transitionCareerOpportunity,
	updateCareerOpportunity
} from '$lib/server/career-store';
import { resolveObservedCareerStoryEvidence } from '$lib/server/career-story-evidence';
import { createCareerStory, updateCareerStory } from '$lib/server/career-story-store';
import { loadCloudflareUsageSnapshot } from '$lib/server/cloudflare-api';
import { cloudflareDeploymentCacheFor } from '$lib/server/cloudflare-deployment-cache';
import { loadCloudflareDeploymentSnapshot } from '$lib/server/cloudflare-deployments-api';
import { cloudflareUsageCacheFor } from '$lib/server/cloudflare-usage-cache';
import { loadLiveDashboardSnapshot } from '$lib/server/dashboard-loader';
import { parseGitHubChecksAppConfig } from '$lib/server/github-app-auth';
import { dashboardSnapshotCacheFor } from '$lib/server/dashboard-snapshot-cache';
import {
	addOwnerProjectResource,
	createOwnerProject,
	loadOwnerProjectSnapshot,
	removeOwnerProjectResource,
	updateOwnerProject
} from '$lib/server/owner-project-store';

const DEFAULT_USERNAME = 'PyRo1121';

export const load: PageServerLoad = async ({ platform, request, setHeaders }) => {
	const username = env['GITHUB_USERNAME']?.trim() || DEFAULT_USERNAME;
	const token = env['GITHUB_TOKEN']?.trim();
	const now = new Date();

	setHeaders({
		'cache-control': 'private, no-store'
	});

	if (platform === undefined) {
		throw new Error('Weeknote bindings are unavailable outside the configured Cloudflare runtime.');
	}

	const checksApp = parseGitHubChecksAppConfig({
		appId: platform.env.GITHUB_CHECKS_APP_ID?.trim() || env['GITHUB_CHECKS_APP_ID']?.trim(),
		installationId:
			platform.env.GITHUB_CHECKS_INSTALLATION_ID?.trim() ||
			env['GITHUB_CHECKS_INSTALLATION_ID']?.trim(),
		privateKey:
			platform.env.GITHUB_CHECKS_APP_PRIVATE_KEY?.trim() ||
			env['GITHUB_CHECKS_APP_PRIVATE_KEY']?.trim()
	});

	const expectedOwnerEmail = configuredOwnerEmail(
		platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	const ownerAccess = resolveOwnerAccess(request.headers, expectedOwnerEmail ?? undefined);
	const ownerAuthorized = ownerAccess._tag === 'Allowed';
	let careerData: App.PageData['careerAccess'];
	let career: App.PageData['career'] = null;
	if (expectedOwnerEmail === null) {
		careerData = { _tag: 'Unavailable', reason: 'Owner identity configuration is unavailable.' };
	} else {
		const careerExit = await Effect.runPromiseExit(
			loadCareerSnapshot(platform.env.CAREER_DB, expectedOwnerEmail, now)
		);
		if (careerExit._tag === 'Success') {
			career = careerExit.value;
			careerData = {
				_tag: 'Current',
				reason: ownerAuthorized
					? 'Owner Access identity verified; editing is available.'
					: 'Public read-only records; editing requires owner Access.'
			};
		} else {
			careerData = {
				_tag: 'Unavailable',
				reason: 'Career storage is temporarily unavailable.'
			};
		}
	}
	const careerPageData = { career, careerAccess: careerData, ownerAuthorized };
	let ownerProjects: App.PageData['ownerProjects'] = null;
	let ownerProjectAccess: App.PageData['ownerProjectAccess'];
	if (expectedOwnerEmail === null) {
		ownerProjectAccess = {
			_tag: 'Unavailable',
			reason: 'Owner identity configuration is unavailable.'
		};
	} else {
		const ownerProjectExit = await Effect.runPromiseExit(
			loadOwnerProjectSnapshot(platform.env.OWNER_DB, expectedOwnerEmail)
		);
		if (ownerProjectExit._tag === 'Success') {
			ownerProjects = ownerProjectExit.value;
			ownerProjectAccess = {
				_tag: 'Current',
				reason: ownerAuthorized
					? 'Owner Access identity verified; editing is available.'
					: 'Public read-only records; editing requires owner Access.'
			};
		} else {
			console.warn('Owner project registry load failed:', ownerProjectExit.cause);
			ownerProjectAccess = {
				_tag: 'Unavailable',
				reason: 'Owner project storage is temporarily unavailable.'
			};
		}
	}
	const ownerProjectData = { ownerProjects, ownerProjectAccess };

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
		if (cachedCloudflare !== null) platform.ctx.waitUntil(refresh.then(() => undefined));
		cloudflareRefresh = refresh;
	}

	const deploymentWorkerNames =
		ownerProjects?.projects.flatMap((project) =>
			project.resources.flatMap((resource) =>
				resource.kind === 'CloudflareWorker' ? [resource.providerId] : []
			)
		) ?? [];
	const deploymentCache = cloudflareDeploymentCacheFor(platform.env.WEEKNOTE_CACHE);
	const cachedDeployments =
		cloudflareAccountId === undefined || deploymentWorkerNames.length === 0
			? null
			: await deploymentCache.read(cloudflareAccountId, deploymentWorkerNames);
	let cloudflareDeploymentRefresh: Promise<CloudflareDeploymentRefreshResult>;
	if (
		cloudflareToken === undefined ||
		cloudflareToken.length === 0 ||
		cloudflareAccountId === undefined ||
		cloudflareAccountId.length === 0
	) {
		cloudflareDeploymentRefresh = Promise.resolve({
			_tag: 'Unavailable',
			attemptedAt: now.toISOString(),
			reason: 'Cloudflare deployment collection is not configured.'
		});
	} else if (deploymentWorkerNames.length === 0) {
		cloudflareDeploymentRefresh = Promise.resolve({
			_tag: 'Unavailable',
			attemptedAt: now.toISOString(),
			reason: 'No owner-confirmed Worker links are available.'
		});
	} else {
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
		if (cachedDeployments !== null) platform.ctx.waitUntil(refresh.then(() => undefined));
		cloudflareDeploymentRefresh = refresh;
	}

	const cloudflareData = {
		cloudflare: cachedCloudflare?.snapshot ?? null,
		cloudflareCache: {
			_tag: cachedCloudflare === null ? ('Cold' as const) : ('Cached' as const),
			cachedAt: cachedCloudflare?.cachedAt ?? null
		},
		cloudflareRefresh,
		cloudflareDeployments: cachedDeployments?.snapshot ?? null,
		cloudflareDeploymentCache: {
			_tag: cachedDeployments === null ? ('Cold' as const) : ('Cached' as const),
			cachedAt: cachedDeployments?.cachedAt ?? null
		},
		cloudflareDeploymentRefresh
	};

	if (token === undefined || token.length === 0) {
		return {
			snapshot: null,
			cache: { _tag: 'Cold' as const, cachedAt: null },
			refresh: Promise.resolve<DashboardRefreshResult>({
				_tag: 'Unavailable',
				attemptedAt: now.toISOString(),
				reason: 'GitHub authentication is not configured.'
			}),
			...cloudflareData,
			...careerPageData,
			...ownerProjectData
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
			cache: { _tag: 'Cached' as const, cachedAt: cached.cachedAt },
			refresh,
			...cloudflareData,
			...careerPageData,
			...ownerProjectData
		};
	}

	return {
		snapshot: null,
		cache: { _tag: 'Cold' as const, cachedAt: null },
		refresh,
		...cloudflareData,
		...careerPageData,
		...ownerProjectData
	};
};

type CareerActionEvent = RequestEvent;

function actionAccess(event: CareerActionEvent) {
	if (!isOwnerMutationPath(event.url.pathname)) {
		return {
			_tag: 'Denied' as const,
			reason: 'Editing is available only through the Access-protected owner route.'
		};
	}
	if (event.platform === undefined) {
		return { _tag: 'Denied' as const, reason: 'Career storage is unavailable.' };
	}
	const access = resolveOwnerAccess(
		event.request.headers,
		event.platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	return access._tag === 'Denied'
		? access
		: {
				_tag: 'Allowed' as const,
				ownerEmail: access.ownerEmail,
				database: event.platform.env.CAREER_DB,
				ownerDatabase: event.platform.env.OWNER_DB,
				cache: event.platform.env.WEEKNOTE_CACHE,
				username:
					event.platform.env.GITHUB_USERNAME?.trim() ||
					env['GITHUB_USERNAME']?.trim() ||
					DEFAULT_USERNAME
			};
}

async function actionInput(event: CareerActionEvent): Promise<Record<string, FormDataEntryValue>> {
	return Object.fromEntries(await event.request.formData());
}

export const actions = {
	createOwnerProject: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { ownerProjectMessage: access.reason });
		const parsed = parseCreateOwnerProject(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { ownerProjectMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			createOwnerProject(access.ownerDatabase, access.ownerEmail, parsed.right, new Date())
		);
		return exit._tag === 'Success'
			? { ownerProjectMessage: 'Project added.' }
			: fail(503, { ownerProjectMessage: 'Project could not be saved.' });
	},
	updateOwnerProject: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { ownerProjectMessage: access.reason });
		const parsed = parseUpdateOwnerProject(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { ownerProjectMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			updateOwnerProject(access.ownerDatabase, access.ownerEmail, parsed.right, new Date())
		);
		return exit._tag === 'Success'
			? { ownerProjectMessage: 'Project updated.' }
			: fail(503, { ownerProjectMessage: 'Project could not be updated.' });
	},
	addOwnerProjectResource: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { ownerProjectMessage: access.reason });
		const parsed = parseAddOwnerProjectResource(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { ownerProjectMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			addOwnerProjectResource(access.ownerDatabase, access.ownerEmail, parsed.right, new Date())
		);
		return exit._tag === 'Success'
			? { ownerProjectMessage: 'Resource linked.' }
			: fail(503, { ownerProjectMessage: 'Resource could not be linked.' });
	},
	removeOwnerProjectResource: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { ownerProjectMessage: access.reason });
		const parsed = parseRemoveOwnerProjectResource(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { ownerProjectMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			removeOwnerProjectResource(access.ownerDatabase, access.ownerEmail, parsed.right)
		);
		return exit._tag === 'Success'
			? { ownerProjectMessage: 'Resource link removed.' }
			: fail(503, { ownerProjectMessage: 'Resource link could not be removed.' });
	},
	createOpportunity: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { careerMessage: access.reason });
		const parsed = parseCreateOpportunity(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { careerMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			createCareerOpportunity(access.database, access.ownerEmail, parsed.right, new Date())
		);
		return exit._tag === 'Success'
			? { careerMessage: 'Opportunity added.' }
			: fail(503, { careerMessage: 'Opportunity could not be saved.' });
	},
	updateOpportunity: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { careerMessage: access.reason });
		const parsed = parseUpdateOpportunity(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { careerMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			updateCareerOpportunity(access.database, access.ownerEmail, parsed.right, new Date())
		);
		return exit._tag === 'Success'
			? { careerMessage: 'Opportunity updated.' }
			: fail(503, { careerMessage: 'Opportunity could not be updated.' });
	},
	transitionOpportunity: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { careerMessage: access.reason });
		const parsed = parseStageTransition(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { careerMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			transitionCareerOpportunity(
				access.database,
				access.ownerEmail,
				parsed.right.id,
				parsed.right.stage,
				new Date()
			)
		);
		return exit._tag === 'Success'
			? { careerMessage: 'Opportunity stage updated.' }
			: fail(503, { careerMessage: 'Opportunity stage could not be updated.' });
	},
	createCommitment: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { careerMessage: access.reason });
		const parsed = parseCreateCommitment(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { careerMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			createCareerCommitment(access.database, access.ownerEmail, parsed.right, new Date())
		);
		return exit._tag === 'Success'
			? { careerMessage: 'Commitment added.' }
			: fail(503, { careerMessage: 'Commitment could not be saved.' });
	},
	setCommitmentStatus: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { careerMessage: access.reason });
		const parsed = parseCommitmentStatus(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { careerMessage: parsed.left.reason });
		const exit = await Effect.runPromiseExit(
			setCareerCommitmentStatus(
				access.database,
				access.ownerEmail,
				parsed.right.id,
				parsed.right.status,
				new Date()
			)
		);
		return exit._tag === 'Success'
			? { careerMessage: 'Commitment updated.' }
			: fail(503, { careerMessage: 'Commitment could not be updated.' });
	},
	createStory: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { careerMessage: access.reason });
		const parsed = parseCreateStory(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { careerMessage: parsed.left.reason });
		const now = new Date();
		const evidenceExit = await Effect.runPromiseExit(
			resolveObservedCareerStoryEvidence(
				access.cache,
				access.username,
				parsed.right.evidenceUrl,
				now
			)
		);
		if (evidenceExit._tag === 'Failure') {
			return fail(409, { careerMessage: 'Selected GitHub evidence is no longer retained.' });
		}
		const exit = await Effect.runPromiseExit(
			createCareerStory(access.database, access.ownerEmail, parsed.right, evidenceExit.value, now)
		);
		return exit._tag === 'Success'
			? { careerMessage: 'Interview story saved.' }
			: fail(503, { careerMessage: 'Interview story could not be saved.' });
	},
	updateStory: async (event) => {
		const access = actionAccess(event);
		if (access._tag === 'Denied') return fail(403, { careerMessage: access.reason });
		const parsed = parseUpdateStory(await actionInput(event));
		if (Either.isLeft(parsed)) return fail(400, { careerMessage: parsed.left.reason });
		const now = new Date();
		const evidenceExit = await Effect.runPromiseExit(
			resolveObservedCareerStoryEvidence(
				access.cache,
				access.username,
				parsed.right.evidenceUrl,
				now
			)
		);
		if (evidenceExit._tag === 'Failure') {
			return fail(409, { careerMessage: 'Selected GitHub evidence is no longer retained.' });
		}
		const exit = await Effect.runPromiseExit(
			updateCareerStory(access.database, access.ownerEmail, parsed.right, evidenceExit.value, now)
		);
		return exit._tag === 'Success'
			? { careerMessage: 'Interview story updated.' }
			: fail(503, { careerMessage: 'Interview story could not be updated.' });
	}
} satisfies Actions;
