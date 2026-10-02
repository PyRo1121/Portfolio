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
	publicContentModified,
	jsonLdScriptTag,
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
		expect(homeSeo.image.url).toBe(PUBLIC_SOCIAL_IMAGE_URL);
		expect(homeSeo.jsonLd).toContain('https://latham.cloud/portrait.webp');
	});

	it('leads with software development and keeps the support background on the About page', () => {
		expect(homeSeo.title).toContain('Olen Latham');
		expect(homeSeo.title).toContain('Software developer');
		expect(homeSeo.title).toContain('McKinney, TX');
		expect(homeSeo.description).toContain('OMG and DeployLint');
		expect(homeSeo.description).not.toContain('customer-service');
		expect(aboutSeo.title).toContain('Developer tools & CI/CD');
		expect(aboutSeo.description).toContain('customer service background');
		expect(aboutSeo.description).toContain('OMG, DeployLint');
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
			'Open to software developer and developer tools roles, with cloud and IT work also in scope.'
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
		for (const path of publicSitemapPaths) {
			expect(xml).toContain(`<lastmod>${publicContentModified[path]}</lastmod>`);
		}
	});

	it('keeps every search snippet distinct and on the canonical HTTPS host', () => {
		const pages = [
			homeSeo,
			aboutSeo,
			...['omg', 'deploylint'].map((slug) =>
				caseStudySeo(publicCaseStudyFor(slug === 'omg' ? 'omg' : 'deploylint'))
			)
		];
		expect(new Set(pages.map((page) => page.title)).size).toBe(pages.length);
		expect(new Set(pages.map((page) => page.description)).size).toBe(pages.length);
		for (const page of pages) {
			expect(page.title.length).toBeLessThan(70);
			expect(page.description.length).toBeLessThan(180);
			expect(page.canonical).toMatch(/^https:\/\/latham\.cloud\//u);
			expect(page.modified).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
		}
	});

	it('connects the About profile to the real portrait and author identity', () => {
		const graph: unknown = JSON.parse(aboutSeo.jsonLd);
		expect(graph).toMatchObject({
			'@context': 'https://schema.org',
			'@graph': expect.arrayContaining([
				expect.objectContaining({
					'@type': ['ProfilePage', 'AboutPage'],
					mainEntity: { '@id': 'https://latham.cloud/#olen-latham' }
				}),
				expect.objectContaining({
					'@type': 'Person',
					name: 'Olen Latham',
					url: 'https://latham.cloud/about',
					image: 'https://latham.cloud/portrait.webp'
				}),
				expect.objectContaining({ '@type': 'WebSite', name: 'Olen Latham' }),
				expect.objectContaining({ '@type': 'BreadcrumbList' })
			])
		});
	});

	it('uses the visible case study title and real author without fabricated rich-result claims', () => {
		for (const slug of ['omg', 'deploylint'] as const) {
			const study = publicCaseStudyFor(slug);
			const seo = caseStudySeo(study);
			const graph: unknown = JSON.parse(seo.jsonLd);
			expect(graph).toMatchObject({
				'@graph': expect.arrayContaining([
					expect.objectContaining({
						'@type': 'Article',
						headline: study.title,
						author: { '@id': 'https://latham.cloud/#olen-latham' },
						dateModified: seo.modified,
						mainEntityOfPage: { '@id': `${seo.canonical}#page` }
					})
				])
			});
			expect(seo.jsonLd).not.toMatch(/aggregateRating|reviewCount|datePublished|offers/iu);
		}
	});

	it('escapes HTML script terminators without changing the JSON value', () => {
		const value = { text: '</script><script>alert(1)</script>' };
		const tag = jsonLdScriptTag(JSON.stringify(value));
		expect(tag.match(/<script/gu)).toHaveLength(1);
		expect(tag.match(/<\/script>/gu)).toHaveLength(1);
		const json = tag.replace('<script type="application/ld+json">', '').replace('</script>', '');
		expect(JSON.parse(json)).toEqual(value);
	});

	it('points Person JSON-LD at the retained GitHub and LinkedIn identities only', () => {
		expect(homeSeo.jsonLd).toContain('https://github.com/PyRo1121');
		expect(homeSeo.jsonLd).not.toContain('https://x.com/PyRo1121');
		expect(homeSeo.jsonLd).toContain('https://www.linkedin.com/in/olen-latham-9b647654/');
		expect(homeSeo.jsonLd).toContain('"jobTitle":"Software developer"');
	});
});
