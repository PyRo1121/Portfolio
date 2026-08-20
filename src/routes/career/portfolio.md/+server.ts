import { env } from '$env/dynamic/private';
import { error, text } from '@sveltejs/kit';
import { Effect } from 'effect';
import type { RequestHandler } from './$types';
import { createCareerPortfolioMarkdown } from '$lib/domain/career-portfolio-export';
import { configuredOwnerEmail } from '$lib/server/owner-access';
import { loadShareDraftStories } from '$lib/server/career-story-store';

export const GET: RequestHandler = async ({ platform, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'x-content-type-options': 'nosniff',
		'x-robots-tag': 'noindex, nofollow'
	});
	if (platform === undefined) error(503, 'Career export storage is unavailable.');
	const ownerEmail = configuredOwnerEmail(
		platform.env.CAREER_OWNER_EMAIL?.trim() || env['CAREER_OWNER_EMAIL']?.trim()
	);
	if (ownerEmail === null) error(503, 'Career export owner configuration is unavailable.');

	const stories = await Effect.runPromiseExit(
		loadShareDraftStories(platform.env.CAREER_DB, ownerEmail)
	);
	if (stories._tag === 'Failure') error(503, 'Career export could not be generated.');
	const exported = createCareerPortfolioMarkdown(stories.value, new Date());
	if (exported.storyCount === 0) error(404, 'No share-ready Career stories are available.');
	return text(exported.body, {
		headers: {
			'content-disposition': `attachment; filename="${exported.filename}"`,
			'content-security-policy': "default-src 'none'; sandbox",
			'content-type': 'text/markdown; charset=utf-8'
		}
	});
};
