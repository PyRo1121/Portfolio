/** Canonical public origin. Crawlable pages stay on this host. */
export const PUBLIC_SITE_ORIGIN = 'https://latham.cloud';

export const PUBLIC_PERSON_ID = `${PUBLIC_SITE_ORIGIN}/#olen-latham`;

export const PUBLIC_GITHUB_URL = 'https://github.com/PyRo1121';
export const PUBLIC_X_URL = 'https://x.com/PyRo1121';
export const PUBLIC_LINKEDIN_URL = 'https://www.linkedin.com/in/olen-latham-9b647654/';

const PUBLIC_IMAGE = `${PUBLIC_SITE_ORIGIN}/og-image.svg`;

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
	readonly jsonLd: string;
};

function personNode(): Record<string, unknown> {
	return {
		'@type': 'Person',
		'@id': PUBLIC_PERSON_ID,
		name: 'Olen Latham',
		url: `${PUBLIC_SITE_ORIGIN}/`,
		image: PUBLIC_IMAGE,
		jobTitle: 'Software developer',
		email: 'mailto:olen@latham.cloud',
		knowsAbout: [...PUBLIC_SEO_SKILLS],
		sameAs: [PUBLIC_GITHUB_URL, PUBLIC_X_URL, PUBLIC_LINKEDIN_URL]
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
	title: 'Olen Latham — Software developer | TypeScript, Svelte, Cloudflare Workers',
	description:
		'Olen Latham is a software developer shipping TypeScript and SvelteKit apps on Cloudflare Workers. Weeknote is the public GitHub delivery and project dashboard.',
	canonical: `${PUBLIC_SITE_ORIGIN}/`,
	jsonLd: serializeJsonLd([
		{
			'@type': 'WebSite',
			'@id': `${PUBLIC_SITE_ORIGIN}/#website`,
			url: `${PUBLIC_SITE_ORIGIN}/`,
			name: 'Olen Latham — Weeknote',
			description:
				'Public engineering dashboard for Olen Latham covering GitHub activity, software projects, and Cloudflare Workers.',
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
		personNode()
	])
};

export const aboutSeo: PublicSeoPage = {
	title: 'About Olen Latham — Software developer in TypeScript, Svelte, and Cloudflare',
	description:
		'Olen Latham builds software with TypeScript, Svelte 5, and Cloudflare Workers. Weeknote is the public engineering log and portfolio.',
	canonical: `${PUBLIC_SITE_ORIGIN}/about`,
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

export const publicSitemapPaths = ['/', '/about'] as const;

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
			'    <changefreq>weekly</changefreq>',
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
