import { describe, expect, it } from 'vitest';
import {
	aboutSeo,
	homeSeo,
	PUBLIC_IDENTITY_LINE,
	PUBLIC_SEO_SKILLS,
	publicSitemapPaths,
	renderPublicSitemapXml
} from './public-seo';

const publicCopy = [homeSeo.title, homeSeo.description, aboutSeo.title, aboutSeo.description].join(
	' '
);

describe('public SEO copy', () => {
	it('does not mention finance', () => {
		expect(publicCopy.toLocaleLowerCase()).not.toContain('finance');
		expect(homeSeo.jsonLd.toLocaleLowerCase()).not.toContain('finance');
		expect(aboutSeo.jsonLd.toLocaleLowerCase()).not.toContain('finance');
	});

	it('names the software stack recruiters search for', () => {
		for (const skill of PUBLIC_SEO_SKILLS) {
			expect(`${publicCopy} ${homeSeo.jsonLd}`).toContain(skill);
		}
	});

	it('keeps the top-bar identity line on software work', () => {
		expect(PUBLIC_IDENTITY_LINE).toBe('Software developer · TypeScript · Svelte · Cloudflare');
	});

	it('keeps the public sitemap on crawlable URLs only', () => {
		expect(publicSitemapPaths).toEqual(['/', '/about']);
		const xml = renderPublicSitemapXml();
		expect(xml).toContain('<loc>https://latham.cloud/</loc>');
		expect(xml).toContain('<loc>https://latham.cloud/about</loc>');
		expect(xml).not.toContain('/career/portfolio.md');
		expect(xml).not.toContain('/owner');
		expect(xml).not.toContain('/__warm');
	});

	it('points Person JSON-LD at GitHub, X, and LinkedIn', () => {
		expect(homeSeo.jsonLd).toContain('https://github.com/PyRo1121');
		expect(homeSeo.jsonLd).toContain('https://x.com/PyRo1121');
		expect(homeSeo.jsonLd).toContain('https://www.linkedin.com/in/olen-latham-9b647654/');
		expect(homeSeo.jsonLd).toContain('"jobTitle":"Software developer"');
	});
});
