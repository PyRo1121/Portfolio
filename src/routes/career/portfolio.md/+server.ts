import { env } from '$env/dynamic/private';
import { error, text } from '@sveltejs/kit';
import { Effect } from 'effect';
import type { RequestHandler } from './$types';
import { createCareerPortfolioMarkdown } from '$lib/domain/career-portfolio-export';
import { resolveCareerAccess } from '$lib/server/career-access';
import { loadShareDraftStories } from '$lib/server/career-story-store';

export const GET: RequestHandler = async ({ platform, request, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'x-content-type-options': 'nosniff'
	});
	if (platform === undefined) error(503, 'Career export storage is unavailable.');
	const access = resolveCareerAccess(
		request.headers,
		platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	if (access._tag === 'Denied') error(403, access.reason);

	const stories = await Effect.runPromiseExit(
		loadShareDraftStories(platform.env.CAREER_DB, access.ownerEmail)
	);
	if (stories._tag === 'Failure') error(503, 'Career export could not be generated.');
	const exported = createCareerPortfolioMarkdown(stories.value, new Date());
	return text(exported.body, {
		headers: {
			'content-disposition': `attachment; filename="${exported.filename}"`,
			'content-security-policy': "default-src 'none'; sandbox",
			'content-type': 'text/markdown; charset=utf-8'
		}
	});
};
