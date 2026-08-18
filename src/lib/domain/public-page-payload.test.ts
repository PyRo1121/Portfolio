import { describe, expect, it } from 'vitest';
import { forbiddenPublicPageKeys } from './public-page-payload';

describe('forbiddenPublicPageKeys', () => {
	it('reports Career, usage, telemetry, and Access-session keys', () => {
		expect(
			forbiddenPublicPageKeys({
				snapshot: null,
				career: null,
				cloudflareRefresh: Promise.resolve(null),
				ownerAuthorized: true
			})
		).toEqual(['career', 'ownerAuthorized', 'cloudflareRefresh']);
	});

	it('accepts a public payload with shipping and GitHub snapshot only', () => {
		expect(
			forbiddenPublicPageKeys({
				snapshot: null,
				cache: { _tag: 'Cold', cachedAt: null },
				refresh: Promise.resolve(null),
				shipping: { _tag: 'Current', reason: 'Public shipping links.', projects: [] }
			})
		).toEqual([]);
	});
});
