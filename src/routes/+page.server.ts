import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';
import { Effect, Either } from 'effect';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import {
	parseCommitmentStatus,
	parseCreateCommitment,
	parseCreateOpportunity,
	parseCreateStory,
	parseStageTransition
} from '$lib/domain/career-accountability';
import type { CloudflareUsageRefreshResult } from '$lib/domain/cloudflare-usage';
import type { DashboardRefreshResult } from '$lib/domain/dashboard-hydration';
import { createDemoIntelligence } from '$lib/domain/github-intelligence';
import { createDemoSnapshot } from '$lib/domain/github-stats';
import { resolveCareerAccess } from '$lib/server/career-access';
import {
	createCareerCommitment,
	createCareerOpportunity,
	createCareerStory,
	loadCareerSnapshot,
	setCareerCommitmentStatus,
	transitionCareerOpportunity
} from '$lib/server/career-store';
import { loadCloudflareUsageSnapshot } from '$lib/server/cloudflare-api';
import { cloudflareUsageCacheFor } from '$lib/server/cloudflare-usage-cache';
import { loadLiveDashboardSnapshot } from '$lib/server/dashboard-loader';
import { dashboardSnapshotCacheFor } from '$lib/server/dashboard-snapshot-cache';

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

	const careerAccess = resolveCareerAccess(
		request.headers,
		platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	let careerData: App.PageData['careerAccess'];
	let career: App.PageData['career'] = null;
	if (careerAccess._tag === 'Denied') {
		careerData = { _tag: 'Unavailable', reason: careerAccess.reason };
	} else {
		const careerExit = await Effect.runPromiseExit(
			loadCareerSnapshot(platform.env.CAREER_DB, careerAccess.ownerEmail, now)
		);
		if (careerExit._tag === 'Success') {
			career = careerExit.value;
			careerData = { _tag: 'Current', reason: 'Exact-owner Access identity verified.' };
		} else {
			careerData = {
				_tag: 'Unavailable',
				reason: 'Career storage is temporarily unavailable.'
			};
		}
	}
	const careerPageData = { career, careerAccess: careerData };

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
			...cloudflareData,
			...careerPageData
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
			...cloudflareData,
			...careerPageData
		};
	}

	return {
		snapshot: null,
		cache: { _tag: 'Cold' as const, cachedAt: null },
		refresh,
		...cloudflareData,
		...careerPageData
	};
};

type CareerActionEvent = RequestEvent;

function actionAccess(event: CareerActionEvent) {
	if (event.platform === undefined) {
		return { _tag: 'Denied' as const, reason: 'Career storage is unavailable.' };
	}
	const access = resolveCareerAccess(
		event.request.headers,
		event.platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	return access._tag === 'Denied'
		? access
		: {
				_tag: 'Allowed' as const,
				ownerEmail: access.ownerEmail,
				database: event.platform.env.CAREER_DB
			};
}

async function actionInput(event: CareerActionEvent): Promise<Record<string, FormDataEntryValue>> {
	return Object.fromEntries(await event.request.formData());
}

export const actions = {
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
		const exit = await Effect.runPromiseExit(
			createCareerStory(access.database, access.ownerEmail, parsed.right, new Date())
		);
		return exit._tag === 'Success'
			? { careerMessage: 'Interview story saved.' }
			: fail(503, { careerMessage: 'Interview story could not be saved.' });
	}
} satisfies Actions;
