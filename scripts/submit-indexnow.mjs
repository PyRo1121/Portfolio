import { readFile } from 'node:fs/promises';

const origin = 'https://latham.cloud';
const key = 'bcd77fb2a446f73e12faf47f6e8d90f4';
const keyUrl = `${origin}/${key}.txt`;
const localKey = (await readFile(new URL(`../static/${key}.txt`, import.meta.url), 'utf8')).trim();
if (localKey !== key) throw new Error('The IndexNow key file does not match its filename.');

const keyResponse = await fetch(keyUrl);
if (!keyResponse.ok || (await keyResponse.text()).trim() !== key) {
	throw new Error(`The public IndexNow key is unavailable at ${keyUrl}.`);
}

const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
if (!sitemapResponse.ok) throw new Error('The public sitemap is unavailable.');
const sitemap = await sitemapResponse.text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => match[1]);
if (urlList.length === 0 || urlList.length > 10_000) {
	throw new Error('The public sitemap has an unexpected URL count.');
}
for (const value of urlList) {
	const url = new URL(value);
	if (url.origin !== origin || url.search || url.hash) {
		throw new Error(`The sitemap contains an unexpected URL: ${value}`);
	}
}

const response = await fetch('https://api.indexnow.org/indexnow', {
	method: 'POST',
	headers: { 'content-type': 'application/json; charset=utf-8' },
	body: JSON.stringify({ host: 'latham.cloud', key, urlList })
});
if (response.status !== 200 && response.status !== 202) {
	throw new Error(`IndexNow rejected the submission with HTTP ${response.status}.`);
}
console.log(`IndexNow received ${urlList.length} public URLs (HTTP ${response.status}).`);
