import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { renderPublicSitemapXml } from '$lib/domain/public-seo';

export const prerender = true;

/** Public crawl map. Owner and warm routes stay out. */
export const GET: RequestHandler = () =>
	text(renderPublicSitemapXml(), {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
