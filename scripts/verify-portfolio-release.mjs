import { writeFile } from 'node:fs/promises';

const origin = new URL(process.argv[2] ?? 'https://latham.cloud');
const output = process.argv[3];
const routes = [
	{ path: '/', status: 200, canonical: '/', page: true },
	{ path: '/about', status: 200, canonical: '/about', page: true },
	{ path: '/work/omg', status: 200, canonical: '/work/omg', page: true },
	{ path: '/work/deploylint', status: 200, canonical: '/work/deploylint', page: true },
	{ path: '/portfolio-release-check-missing', status: 404, page: true },
	{ path: '/robots.txt', status: 200, type: 'text/plain' },
	{ path: '/sitemap.xml', status: 200, type: 'xml' },
	{ path: '/olen-latham-resume.pdf', status: 200, type: 'application/pdf' },
	{ path: '/portrait.webp', status: 200, type: 'image/webp' },
	{ path: '/orbit/scene.js', status: 200, type: 'javascript' },
	{ path: '/api/telemetry', status: 405 }
];
const requiredHeaders = {
	'x-content-type-options': 'nosniff',
	'x-frame-options': 'DENY',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'cross-origin-opener-policy': 'same-origin'
};

const results = await Promise.all(
	routes.map(async (route) => {
		const failures = [];
		try {
			const response = await fetch(new URL(route.path, origin), {
				redirect: 'manual',
				signal: AbortSignal.timeout(30_000),
				headers: { 'cache-control': 'no-cache' }
			});
			if (response.status !== route.status)
				failures.push(`Expected HTTP ${route.status}, got ${response.status}`);
			for (const [name, value] of Object.entries(requiredHeaders)) {
				if (response.headers.get(name) !== value) failures.push(`Missing or unexpected ${name}`);
			}
			if (!response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"))
				failures.push('Missing framing policy');
			if (!response.headers.get('permissions-policy')?.includes('camera=()'))
				failures.push('Missing permissions policy');
			const type = response.headers.get('content-type') ?? '';
			if (route.type && !type.includes(route.type)) failures.push(`Unexpected MIME type ${type}`);
			if (route.page) {
				const html = await response.text();
				if ((html.match(/<h1(?:\s|>)/g) ?? []).length !== 1)
					failures.push('Expected one main heading');
				if ((html.match(/<main(?:\s|>)/g) ?? []).length !== 1)
					failures.push('Expected one main landmark');
				if ((html.match(/name="theme-color"/g) ?? []).length !== 1)
					failures.push('Expected one theme color');
				if (!html.includes('name="theme-color" content="#040710"'))
					failures.push('Theme color does not match portfolio');
				if (
					route.canonical &&
					!html.includes(
						`rel="canonical" href="https://latham.cloud${route.canonical === '/' ? '/' : route.canonical}"`
					)
				)
					failures.push('Missing canonical URL');
				if (route.status === 404) {
					if (!html.includes('name="robots" content="noindex"'))
						failures.push('Error page is not noindex');
					if (!html.includes('Back to the portfolio'))
						failures.push('Missing portfolio recovery link');
				}
			}
			return { path: route.path, status: response.status, type, failures };
		} catch (error) {
			return { path: route.path, failures: [String(error)] };
		}
	})
);

const report = { checkedAt: new Date().toISOString(), origin: origin.origin, results };
if (output) await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
for (const result of results)
	console.log(
		`${result.failures.length ? 'FAIL' : 'PASS'} ${result.path}${result.failures.length ? ` ${result.failures.join('; ')}` : ''}`
	);
if (results.some((result) => result.failures.length)) process.exitCode = 1;
