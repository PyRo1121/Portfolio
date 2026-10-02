import { publicCaseStudyPaths, type PublicCaseStudy } from './public-case-study';

export const PUBLIC_SITE_ORIGIN = 'https://latham.cloud';
export const PUBLIC_PERSON_ID = `${PUBLIC_SITE_ORIGIN}/#olen-latham`;
export const PUBLIC_GITHUB_URL = 'https://github.com/PyRo1121';
export const PUBLIC_LINKEDIN_URL = 'https://www.linkedin.com/in/olen-latham-9b647654/';
export const PUBLIC_CONTACT_EMAIL = 'olen@latham.cloud';
export const PUBLIC_CONTACT_MAILTO =
	'mailto:olen@latham.cloud?subject=Opportunity%20for%20Olen%20Latham';
export const PUBLIC_AVAILABILITY_LINE =
	'Open to software developer and developer tools roles, with cloud and IT work also in scope.';
export const PUBLIC_RESUME_LINE = 'Download one-page résumé (PDF)';
export const PUBLIC_SOCIAL_IMAGE_URL = `${PUBLIC_SITE_ORIGIN}/og-image.png`;
export const PUBLIC_SEO_SKILLS = [
	'Rust',
	'TypeScript',
	'Svelte',
	'SvelteKit',
	'Cloudflare Workers',
	'GitHub Actions'
] as const;
export const PUBLIC_IDENTITY_LINE = 'Software developer · TypeScript · Svelte · Cloudflare';
export const publicSitemapPaths = ['/', '/about', ...publicCaseStudyPaths] as const;

// Content revision dates, not build dates. Update only when a page's content changes.
export const publicContentModified = {
	'/': '2026-10-02',
	'/about': '2026-10-02',
	'/work/omg': '2026-10-02',
	'/work/deploylint': '2026-10-02'
} satisfies Record<(typeof publicSitemapPaths)[number], string>;

export type PublicSeoPage = {
	readonly kind: 'profile' | 'article';
	readonly title: string;
	readonly description: string;
	readonly canonical: string;
	readonly modified: string;
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
	alt: 'Olen Latham, software developer and creator of OMG and DeployLint'
};

function personNode(): Record<string, unknown> {
	return {
		'@type': 'Person',
		'@id': PUBLIC_PERSON_ID,
		name: 'Olen Latham',
		url: `${PUBLIC_SITE_ORIGIN}/about`,
		image: `${PUBLIC_SITE_ORIGIN}/portrait.webp`,
		jobTitle: 'Software developer',
		description:
			'Software developer in McKinney, Texas, building developer tools with Rust and TypeScript.',
		email: `mailto:${PUBLIC_CONTACT_EMAIL}`,
		homeLocation: {
			'@type': 'Place',
			name: 'McKinney, Texas'
		},
		knowsAbout: [...PUBLIC_SEO_SKILLS],
		sameAs: [PUBLIC_GITHUB_URL, PUBLIC_LINKEDIN_URL],
		mainEntityOfPage: { '@id': `${PUBLIC_SITE_ORIGIN}/about#page` },
		subjectOf: publicCaseStudyPaths.map((path) => ({
			'@id': `${PUBLIC_SITE_ORIGIN}${path}#article`
		}))
	};
}

function websiteNode(): Record<string, unknown> {
	return {
		'@type': 'WebSite',
		'@id': `${PUBLIC_SITE_ORIGIN}/#website`,
		url: `${PUBLIC_SITE_ORIGIN}/`,
		name: 'Olen Latham',
		alternateName: 'Olen Latham portfolio',
		description:
			'Software development portfolio, developer tools, and engineering case studies by Olen Latham.',
		inLanguage: 'en-US',
		publisher: { '@id': PUBLIC_PERSON_ID }
	};
}

function breadcrumbNode({
	canonical,
	name
}: {
	canonical: string;
	name: string;
}): Record<string, unknown> {
	return {
		'@type': 'BreadcrumbList',
		'@id': `${canonical}#breadcrumb`,
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Olen Latham', item: `${PUBLIC_SITE_ORIGIN}/` },
			{ '@type': 'ListItem', position: 2, name, item: canonical }
		]
	};
}

function serializeJsonLd(graph: ReadonlyArray<Record<string, unknown>>): string {
	return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

export const homeSeo: PublicSeoPage = {
	kind: 'profile',
	title: 'Olen Latham | Software developer in McKinney, TX',
	description:
		'Olen Latham builds developer tools with Rust, TypeScript, SvelteKit, and Cloudflare Workers. Explore OMG and DeployLint, read case studies, and get in touch.',
	canonical: `${PUBLIC_SITE_ORIGIN}/`,
	modified: publicContentModified['/'],
	image: portfolioImage,
	jsonLd: serializeJsonLd([
		websiteNode(),
		{
			'@type': 'ProfilePage',
			'@id': `${PUBLIC_SITE_ORIGIN}/#profile`,
			url: `${PUBLIC_SITE_ORIGIN}/`,
			name: 'Olen Latham, software developer in McKinney, Texas',
			inLanguage: 'en-US',
			dateModified: publicContentModified['/'],
			isPartOf: { '@id': `${PUBLIC_SITE_ORIGIN}/#website` },
			mainEntity: { '@id': PUBLIC_PERSON_ID }
		},
		personNode(),
		{
			'@type': 'ItemList',
			'@id': `${PUBLIC_SITE_ORIGIN}/#selected-work`,
			name: 'Developer tools by Olen Latham',
			itemListElement: publicCaseStudyPaths.map((path, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				name:
					path === '/work/omg'
						? 'OMG, a Rust package and runtime CLI'
						: 'DeployLint, GitHub Actions CI/CD setup',
				url: `${PUBLIC_SITE_ORIGIN}${path}`
			}))
		}
	])
};

export const aboutSeo: PublicSeoPage = {
	kind: 'profile',
	title: 'About Olen Latham | Developer tools & CI/CD',
	description:
		'Meet Olen Latham, a software developer in McKinney, Texas. Read about OMG, DeployLint, his Rust and TypeScript work, and his customer service background.',
	canonical: `${PUBLIC_SITE_ORIGIN}/about`,
	modified: publicContentModified['/about'],
	image: portfolioImage,
	jsonLd: serializeJsonLd([
		websiteNode(),
		{
			'@type': ['ProfilePage', 'AboutPage'],
			'@id': `${PUBLIC_SITE_ORIGIN}/about#page`,
			url: `${PUBLIC_SITE_ORIGIN}/about`,
			name: 'About Olen Latham',
			inLanguage: 'en-US',
			dateModified: publicContentModified['/about'],
			isPartOf: { '@id': `${PUBLIC_SITE_ORIGIN}/#website` },
			breadcrumb: { '@id': `${PUBLIC_SITE_ORIGIN}/about#breadcrumb` },
			mainEntity: { '@id': PUBLIC_PERSON_ID }
		},
		personNode(),
		breadcrumbNode({ canonical: `${PUBLIC_SITE_ORIGIN}/about`, name: 'About Olen' })
	])
};

export function caseStudySeo(study: PublicCaseStudy): PublicSeoPage {
	const path = study.slug === 'omg' ? '/work/omg' : '/work/deploylint';
	const canonical = `${PUBLIC_SITE_ORIGIN}${path}`;
	const name = study.slug === 'omg' ? 'OMG' : 'DeployLint';
	const image = `${PUBLIC_SITE_ORIGIN}/portfolio/${study.slug}-social.png`;
	const isOmg = study.slug === 'omg';
	return {
		kind: 'article',
		title: isOmg
			? 'OMG: Rust package and runtime CLI | Olen Latham'
			: 'DeployLint: GitHub Actions CI/CD setup | Olen Latham',
		description: isOmg
			? 'Olen Latham built OMG, a Rust CLI for Linux and macOS packages, language runtimes, and security evidence. Read the engineering case study and explore the source.'
			: 'Olen Latham built DeployLint with TypeScript, SvelteKit, and Cloudflare Workers to turn repository evidence into reviewed GitHub Actions setup pull requests.',
		canonical,
		modified: publicContentModified[path],
		image: {
			url: image,
			type: 'image/png',
			width: 1200,
			height: 630,
			alt: isOmg
				? 'OMG, a Rust package and runtime management CLI'
				: 'DeployLint, GitHub Actions CI/CD setup and deployment protection'
		},
		jsonLd: serializeJsonLd([
			websiteNode(),
			{
				'@type': 'WebPage',
				'@id': `${canonical}#page`,
				url: canonical,
				name: study.title,
				inLanguage: 'en-US',
				isPartOf: { '@id': `${PUBLIC_SITE_ORIGIN}/#website` },
				breadcrumb: { '@id': `${canonical}#breadcrumb` },
				mainEntity: { '@id': `${canonical}#article` }
			},
			{
				'@type': 'Article',
				'@id': `${canonical}#article`,
				url: canonical,
				headline: study.title,
				description: study.summary,
				dateModified: publicContentModified[path],
				inLanguage: 'en-US',
				articleSection: 'Software engineering case studies',
				keywords: [...study.tools],
				image,
				isPartOf: { '@id': `${PUBLIC_SITE_ORIGIN}/#website` },
				author: { '@id': PUBLIC_PERSON_ID },
				about: { '@id': `${canonical}#project` },
				mainEntityOfPage: { '@id': `${canonical}#page` }
			},
			{
				'@type': isOmg ? 'SoftwareSourceCode' : 'CreativeWork',
				'@id': `${canonical}#project`,
				name,
				description: study.summary,
				url: study.websiteUrl,
				creator: { '@id': PUBLIC_PERSON_ID },
				...(isOmg
					? {
							codeRepository: 'https://github.com/omg-cli/omg',
							programmingLanguage: 'Rust',
							runtimePlatform: 'Linux, macOS'
						}
					: {})
			},
			breadcrumbNode({ canonical, name }),
			personNode()
		])
	};
}

export function renderPublicSitemapXml(): string {
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...publicSitemapPaths.flatMap((path) => [
			'  <url>',
			`    <loc>${PUBLIC_SITE_ORIGIN}${path}</loc>`,
			`    <lastmod>${publicContentModified[path]}</lastmod>`,
			'  </url>'
		]),
		'</urlset>',
		''
	].join('\n');
}

export function jsonLdScriptTag(payload: string): string {
	// HTML parsers terminate script elements at </script>, even inside JSON strings.
	return `<script type="application/ld+json">${payload.replace(/</gu, '\\u003c')}</script>`;
}
