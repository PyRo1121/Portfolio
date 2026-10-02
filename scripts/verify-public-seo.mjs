import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = 'https://latham.cloud';
const output = resolve('.svelte-kit/output/prerendered/pages');
const sitemap = await readFile(resolve(output, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => match[1]);
const expectedPaths = ['/', '/about', '/work/omg', '/work/deploylint'];
assert.deepEqual(
	urls.map((url) => new URL(url).pathname),
	expectedPaths
);
assert.equal(new Set(urls).size, urls.length, 'Sitemap contains duplicate URLs.');

function attributes(tag) {
	return Object.fromEntries(
		[...tag.matchAll(/([\w:-]+)="([^"]*)"/gu)].map((match) => [match[1], match[2]])
	);
}

function decodeText(text) {
	return text
		.replace(/&amp;/gu, '&')
		.replace(/&quot;/gu, '"')
		.replace(/&#39;|&apos;/gu, "'");
}

const titles = new Set();
const descriptions = new Set();
for (const url of urls) {
	const canonical = new URL(url);
	assert.equal(canonical.origin, origin);
	assert.equal(canonical.search + canonical.hash, '');
	const filename =
		canonical.pathname === '/' ? 'index.html' : `${canonical.pathname.slice(1)}.html`;
	const html = await readFile(resolve(output, filename), 'utf8');
	const head = html.match(/<head>([\s\S]*?)<\/head>/u)?.[1];
	assert.ok(head, `${url} has no server-rendered head.`);
	const title = head.match(/<title>([^<]+)<\/title>/u)?.[1];
	assert.ok(title?.includes('Olen Latham'), `${url} has no author in its title.`);
	assert.equal([...head.matchAll(/<title>/gu)].length, 1);
	assert.ok(!titles.has(title), `${url} has a duplicate title.`);
	titles.add(title);
	const metas = [...head.matchAll(/<meta\s[^>]*>/gu)].map((match) => attributes(match[0]));
	const description = metas.filter((meta) => meta.name === 'description');
	assert.equal(description.length, 1, `${url} must have one description.`);
	assert.ok(description[0].content?.length > 40);
	assert.ok(!descriptions.has(description[0].content));
	descriptions.add(description[0].content);
	const robots = metas.filter((meta) => meta.name === 'robots');
	assert.equal(robots.length, 1);
	assert.ok(!robots[0].content.includes('noindex'), `${url} is not indexable.`);
	assert.ok(robots[0].content.includes('max-image-preview:large'));
	const links = [...head.matchAll(/<link\s[^>]*>/gu)].map((match) => attributes(match[0]));
	assert.deepEqual(
		links.filter((link) => link.rel === 'canonical').map((link) => link.href),
		[url]
	);
	assert.equal(metas.find((meta) => meta.property === 'og:url')?.content, url);
	assert.equal(metas.find((meta) => meta.name === 'twitter:card')?.content, 'summary_large_image');
	const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gu)];
	assert.equal(headings.length, 1, `${url} must have one main heading.`);
	const heading = decodeText(headings[0][1].replace(/<!--[^]*?-->|<[^>]*>/gu, '').trim());
	const ld = [...head.matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/gu)];
	assert.equal(ld.length, 1, `${url} must have one JSON-LD graph.`);
	const graph = JSON.parse(ld[0][1]);
	assert.equal(graph['@context'], 'https://schema.org');
	assert.ok(Array.isArray(graph['@graph']));
	const person = graph['@graph'].find((node) => node['@type'] === 'Person');
	assert.equal(person?.name, 'Olen Latham');
	assert.equal(person?.url, `${origin}/about`);
	assert.equal(person?.image, `${origin}/portrait.webp`);
	const article = graph['@graph'].find((node) => node['@type'] === 'Article');
	if (canonical.pathname.startsWith('/work/')) {
		assert.equal(article?.headline, heading, `${url} headline must match the visible H1.`);
		assert.equal(article.author['@id'], person['@id']);
		assert.ok(
			html.includes(`datetime="${article.dateModified}"`),
			`${url} must display its revision date.`
		);
		assert.ok(sitemap.includes(`<lastmod>${article.dateModified}</lastmod>`));
	} else {
		assert.ok(heading.toLowerCase().includes('software developer'));
	}
	for (const image of metas.filter((meta) => meta.property === 'og:image')) {
		const path = new URL(image.content).pathname;
		await readFile(resolve('static', path.slice(1)));
	}
	for (const link of links.filter((link) => link.rel === 'stylesheet')) {
		const path = new URL(link.href, url).pathname;
		const css = await readFile(resolve('.svelte-kit/output/client', path.slice(1)), 'utf8');
		assert.ok(!css.includes('Observatory Mono'), `${url} loads the owner dashboard font.`);
		assert.ok(!css.includes('.app::after'), `${url} loads private dashboard CSS.`);
	}
	const anchors = [...html.matchAll(/<a\s[^>]*>/gu)]
		.map((match) => attributes(match[0]).href)
		.filter(Boolean);
	for (const href of anchors) {
		const target = new URL(decodeText(href), url);
		if (target.origin !== origin || target.pathname === canonical.pathname) continue;
		if (target.pathname.endsWith('.pdf')) {
			await readFile(resolve('static', target.pathname.slice(1)));
			continue;
		}
		assert.ok(
			expectedPaths.includes(target.pathname),
			`${url} links to an unpublished public page: ${target.pathname}`
		);
	}
	console.log(`SEO verified: ${canonical.pathname}`);
}
const redirects = await readFile(resolve('.svelte-kit/cloudflare/_redirects'), 'utf8');
for (const path of expectedPaths.filter((path) => path !== '/')) {
	assert.ok(redirects.includes(`${path}/ ${path} 301`), `${path} has no permanent slash redirect.`);
}
console.log(
	`Verified ${urls.length} prerendered public pages, metadata, structured data, assets, links, and redirect rules.`
);
