import { describe, expect, it } from 'vitest';
import {
	aboutSeo,
	homeSeo,
	PUBLIC_AVAILABILITY_LINE,
	PUBLIC_CONTACT_EMAIL,
	PUBLIC_CONTACT_MAILTO,
	PUBLIC_IDENTITY_LINE,
	PUBLIC_RESUME_LINE,
	PUBLIC_SEO_SKILLS,
	PUBLIC_SOCIAL_IMAGE_URL,
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

	it('uses a raster social card for link-preview compatibility', () => {
		expect(PUBLIC_SOCIAL_IMAGE_URL).toBe('https://latham.cloud/og-image.png');
		expect(homeSeo.jsonLd).toContain(PUBLIC_SOCIAL_IMAGE_URL);
	});

	it('positions the About page around Olen’s real career transition and projects', () => {
		expect(aboutSeo.title).toContain('From customer support to software and cloud systems');
		expect(aboutSeo.description).toContain('OMG and Weeknote');
	});

	it('publishes one direct recruiter contact path and exact availability statement', () => {
		expect(PUBLIC_CONTACT_EMAIL).toBe('olen@latham.cloud');
		expect(PUBLIC_CONTACT_MAILTO).toBe(
			'mailto:olen@latham.cloud?subject=Opportunity%20for%20Olen%20Latham'
		);
		expect(PUBLIC_AVAILABILITY_LINE).toBe(
			'Open to IT support, cloud operations, and junior systems opportunities.'
		);
		expect(PUBLIC_RESUME_LINE).toBe('Résumé available on request.');
	});

	it('keeps the public sitemap on crawlable URLs only', () => {
		expect(publicSitemapPaths).toEqual(['/', '/about', '/work/omg', '/work/weeknote']);
		const xml = renderPublicSitemapXml();
		expect(xml).toContain('<loc>https://latham.cloud/</loc>');
		expect(xml).toContain('<loc>https://latham.cloud/about</loc>');
		expect(xml).toContain('<loc>https://latham.cloud/work/omg</loc>');
		expect(xml).toContain('<loc>https://latham.cloud/work/weeknote</loc>');
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
