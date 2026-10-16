import type { Handle } from '@sveltejs/kit';

const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
	[
		'content-security-policy',
		"object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
	],
	['x-content-type-options', 'nosniff'],
	['x-frame-options', 'DENY'],
	['referrer-policy', 'strict-origin-when-cross-origin'],
	['permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
	['cross-origin-opener-policy', 'same-origin']
];

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	// Redirect responses can have immutable headers. Reconstruct before adding the baseline.
	const hardened = new Response(response.body, response);
	for (const [name, value] of SECURITY_HEADERS) {
		if (!hardened.headers.has(name)) hardened.headers.set(name, value);
	}
	return hardened;
};
