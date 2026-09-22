import { describe, expect, it } from 'vitest';
import { publicCaseStudyFor } from './public-case-study';
import {
	aboutSeo,
	caseStudySeo,
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

	it('uses the landing page to sell capability and the About page to explain the transition', () => {
		expect(homeSeo.title).toContain('OMG and DeployLint');
		expect(homeSeo.description).toContain('GitHub Actions');
		expect(homeSeo.description).not.toContain('customer-service');
		expect(aboutSeo.title).toContain('From customer support to software and cloud systems');
		expect(aboutSeo.description).toContain('OMG and DeployLint');
	});

	it('describes each project with a distinct search title and public product identity', () => {
		const omg = caseStudySeo(publicCaseStudyFor('omg'));
		const deploylint = caseStudySeo(publicCaseStudyFor('deploylint'));
		expect(omg.title).toContain('Rust package and runtime CLI');
		expect(deploylint.title).toContain('GitHub Actions CI/CD setup');
		expect(omg.image.url).toBe('https://latham.cloud/portfolio/omg-social.png');
		expect(deploylint.image.url).toBe('https://latham.cloud/portfolio/deploylint-social.png');
		expect(omg.jsonLd).toContain('https://getomg.xyz/');
		expect(deploylint.jsonLd).toContain('https://deploylint.com/');
		expect(deploylint.jsonLd).not.toContain('https://github.com/PyRo1121/deploylint');
	});

	it('publishes one direct recruiter contact path and exact availability statement', () => {
		expect(PUBLIC_CONTACT_EMAIL).toBe('olen@latham.cloud');
		expect(PUBLIC_CONTACT_MAILTO).toBe(
			'mailto:olen@latham.cloud?subject=Opportunity%20for%20Olen%20Latham'
		);
		expect(PUBLIC_AVAILABILITY_LINE).toBe(
			'Open to IT support, cloud operations, junior systems, and software opportunities.'
		);
		expect(PUBLIC_RESUME_LINE).toBe('Download one-page résumé (PDF)');
	});

	it('keeps the public sitemap on crawlable URLs only', () => {
		expect(publicSitemapPaths).toEqual(['/', '/about', '/work/omg', '/work/deploylint']);
		const xml = renderPublicSitemapXml();
		expect(xml).toContain('<loc>https://latham.cloud/</loc>');
		expect(xml).toContain('<loc>https://latham.cloud/about</loc>');
		expect(xml).toContain('<loc>https://latham.cloud/work/omg</loc>');
		expect(xml).toContain('<loc>https://latham.cloud/work/deploylint</loc>');
		expect(xml).not.toContain('/career/portfolio.md');
		expect(xml).not.toContain('/owner');
		expect(xml).not.toContain('/__warm');
		expect(xml).not.toContain('<lastmod>');
	});

	it('points Person JSON-LD at the retained GitHub and LinkedIn identities only', () => {
		expect(homeSeo.jsonLd).toContain('https://github.com/PyRo1121');
		expect(homeSeo.jsonLd).not.toContain('https://x.com/PyRo1121');
		expect(homeSeo.jsonLd).toContain('https://www.linkedin.com/in/olen-latham-9b647654/');
		expect(homeSeo.jsonLd).toContain('"jobTitle":"Software developer"');
	});
});
