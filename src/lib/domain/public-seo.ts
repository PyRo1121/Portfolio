import { publicCaseStudyPaths, type PublicCaseStudy } from './public-case-study';

/** Canonical public origin. Crawlable pages stay on this host. */
export const PUBLIC_SITE_ORIGIN = 'https://latham.cloud';

export const PUBLIC_PERSON_ID = `${PUBLIC_SITE_ORIGIN}/#olen-latham`;

export const PUBLIC_GITHUB_URL = 'https://github.com/PyRo1121';
export const PUBLIC_LINKEDIN_URL = 'https://www.linkedin.com/in/olen-latham-9b647654/';

/** Public address for direct recruiter and collaborator contact. */
export const PUBLIC_CONTACT_EMAIL = 'olen@latham.cloud';

/** Prefilled direct-email action used by public conversion surfaces. */
export const PUBLIC_CONTACT_MAILTO =
	'mailto:olen@latham.cloud?subject=Opportunity%20for%20Olen%20Latham';

/** Truthful role categories currently invited by the public portfolio. */
export const PUBLIC_AVAILABILITY_LINE =
	'Open to IT support, cloud operations, junior systems, and software opportunities.';
export const PUBLIC_RESUME_LINE = 'Download one-page résumé (PDF)';

/** Raster social card used by Open Graph, Twitter, and structured profile data. */
export const PUBLIC_SOCIAL_IMAGE_URL = `${PUBLIC_SITE_ORIGIN}/og-image.png`;

export const PUBLIC_SEO_SKILLS = [
	'TypeScript',
	'Svelte',
	'SvelteKit',
	'Cloudflare Workers',
	'GitHub'
] as const;

/** One-line identity under the public top-bar name. */
export const PUBLIC_IDENTITY_LINE = 'Software developer · TypeScript · Svelte · Cloudflare';

export type PublicSeoPage = {
	readonly title: string;
	readonly description: string;
	readonly canonical: string;
	readonly image: {
		readonly url: string;
		readonly type: 'image/png';
		readonly width: number;
		readonly height: number;
		readonly alt: string;
	};
	readonly jsonLd: string;
};

const portfolioImage: PublicSeoPage['image'] = {
	url: PUBLIC_SOCIAL_IMAGE_URL,
	type: 'image/png',
	width: 1200,
	height: 630,
	alt: 'Olen Latham — creator of OMG and DeployLint'
};

function personNode(): Record<string, unknown> {
	return {
		'@type': 'Person',
		'@id': PUBLIC_PERSON_ID,
		name: 'Olen Latham',
		url: `${PUBLIC_SITE_ORIGIN}/`,
		image: PUBLIC_SOCIAL_IMAGE_URL,
		jobTitle: 'Software developer',
		email: 'mailto:olen@latham.cloud',
		knowsAbout: [...PUBLIC_SEO_SKILLS],
		sameAs: [PUBLIC_GITHUB_URL, PUBLIC_LINKEDIN_URL],
		subjectOf: publicCaseStudyPaths.map((path) => ({
			'@id': `${PUBLIC_SITE_ORIGIN}${path}#article`
		}))
	};
}

function serializeJsonLd(graph: ReadonlyArray<Record<string, unknown>>): string {
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': graph
	});
}

/** Home and about copy for search results. Finance is intentionally absent. */
export const homeSeo: PublicSeoPage = {
	title: 'Olen Latham — Developer behind OMG and DeployLint',
	description:
		'Olen Latham builds OMG, a Rust CLI for packages and runtimes, and DeployLint, a GitHub Actions CI/CD setup and deployment protection product. Explore both projects.',
	canonical: `${PUBLIC_SITE_ORIGIN}/`,
	image: portfolioImage,
	jsonLd: serializeJsonLd([
		{
			'@type': 'WebSite',
			'@id': `${PUBLIC_SITE_ORIGIN}/#website`,
			url: `${PUBLIC_SITE_ORIGIN}/`,
			name: 'Olen Latham — Portfolio',
			description:
				'Portfolio for Olen Latham, creator of OMG and DeployLint: developer tools, CI/CD systems, and project case studies.',
			inLanguage: 'en',
			publisher: { '@id': PUBLIC_PERSON_ID }
		},
		{
			'@type': 'ProfilePage',
			'@id': `${PUBLIC_SITE_ORIGIN}/#profile`,
			url: `${PUBLIC_SITE_ORIGIN}/`,
			name: 'Olen Latham — Software developer',
			isPartOf: { '@id': `${PUBLIC_SITE_ORIGIN}/#website` },
			about: { '@id': PUBLIC_PERSON_ID },
			mainEntity: { '@id': PUBLIC_PERSON_ID }
		},
		personNode(),
		{
			'@type': 'ItemList',
			'@id': `${PUBLIC_SITE_ORIGIN}/#selected-work`,
			name: 'Selected projects',
			itemListElement: publicCaseStudyPaths.map((path, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				url: `${PUBLIC_SITE_ORIGIN}${path}`
			}))
		}
	])
};

export const aboutSeo: PublicSeoPage = {
	title: 'About Olen Latham — From customer support to software and cloud systems',
	description:
		'Olen Latham works in customer service and builds developer tools with Rust, TypeScript, Svelte, and Cloudflare. Read the story behind OMG and DeployLint.',
	canonical: `${PUBLIC_SITE_ORIGIN}/about`,
	image: portfolioImage,
	jsonLd: serializeJsonLd([
		{
			'@type': 'AboutPage',
			'@id': `${PUBLIC_SITE_ORIGIN}/about#page`,
			url: `${PUBLIC_SITE_ORIGIN}/about`,
			name: 'About Olen Latham',
			isPartOf: { '@id': `${PUBLIC_SITE_ORIGIN}/#website` },
			about: { '@id': PUBLIC_PERSON_ID },
			mainEntity: { '@id': PUBLIC_PERSON_ID }
		},
		personNode()
	])
};

/** Case-study page metadata, built from the same study data the page renders. */
export function caseStudySeo(study: PublicCaseStudy): PublicSeoPage {
	const canonical = `${PUBLIC_SITE_ORIGIN}/work/${study.slug}`;
	const section = study.eyebrow.replace('Case study · ', '');
	const isOmg = study.slug === 'omg';
	return {
		title: isOmg
			? 'OMG: Rust package and runtime CLI — Olen Latham'
			: 'DeployLint: GitHub Actions CI/CD setup — Olen Latham',
		description: isOmg
			? 'How I built OMG, a Rust CLI for packages, language runtimes, and security evidence. Explore the design, platform tradeoffs, live site, and source.'
			: 'How I built DeployLint to inspect repositories, preview GitHub Actions workflows, and open reviewed setup pull requests. Explore the live product.',
		canonical,
		image: {
			url: `${PUBLIC_SITE_ORIGIN}/portfolio/${isOmg ? 'omg' : 'deploylint'}-social.png`,
			type: 'image/png',
			width: 1200,
			height: 630,
			alt: isOmg
				? 'OMG — Rust package and runtime management CLI'
				: 'DeployLint — GitHub Actions CI/CD setup and deployment protection'
		},
		jsonLd: serializeJsonLd([
			{
				'@type': 'Article',
				'@id': `${canonical}#article`,
				url: canonical,
				headline: study.title,
				description: study.summary,
				inLanguage: 'en',
				articleSection: section,
				keywords: [...study.tools],
				image: `${PUBLIC_SITE_ORIGIN}/portfolio/${isOmg ? 'omg' : 'deploylint'}-social.png`,
				isPartOf: { '@id': `${PUBLIC_SITE_ORIGIN}/#website` },
				author: { '@id': PUBLIC_PERSON_ID },
				about: { '@id': `${canonical}#project` },
				mainEntityOfPage: canonical
			},
			{
				'@type': 'SoftwareApplication',
				'@id': `${canonical}#project`,
				name: section,
				description: study.summary,
				url: study.websiteUrl,
				applicationCategory: 'DeveloperApplication',
				operatingSystem: isOmg ? 'Linux, macOS' : 'Web',
				creator: { '@id': PUBLIC_PERSON_ID },
				...(isOmg ? { codeRepository: 'https://github.com/omg-cli/omg' } : {})
			},
			{
				'@type': 'BreadcrumbList',
				'@id': `${canonical}#breadcrumb`,
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Portfolio', item: `${PUBLIC_SITE_ORIGIN}/` },
					{ '@type': 'ListItem', position: 2, name: section, item: canonical }
				]
			},
			personNode()
		])
	};
}

export const publicSitemapPaths = ['/', '/about', ...publicCaseStudyPaths] as const;

function locFor(path: (typeof publicSitemapPaths)[number]): string {
	return path === '/' ? `${PUBLIC_SITE_ORIGIN}/` : `${PUBLIC_SITE_ORIGIN}${path}`;
}

/** XML sitemap for public URLs only. */
export function renderPublicSitemapXml(): string {
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...publicSitemapPaths.flatMap((path) => [
			'  <url>',
			`    <loc>${locFor(path)}</loc>`,
			'  </url>'
		]),
		'</urlset>',
		''
	].join('\n');
}

/** Wrap JSON-LD for `<svelte:head>` without a nested script block Prettier cannot parse. */
export function jsonLdScriptTag(payload: string): string {
	return `<script type="application/ld+json">${payload}</script>`;
}
