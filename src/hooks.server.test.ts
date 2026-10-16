import { describe, expect, it } from 'vitest';
import { handle } from './hooks.server';

type HandleInput = Parameters<typeof handle>[0];

async function handleWith(response: Response): Promise<Response> {
	const input = { event: {}, resolve: async () => response } as unknown as HandleInput;
	return await handle(input);
}

describe('response security policy', () => {
	it('adds the public baseline and preserves the response body and status', async () => {
		const response = await handleWith(new Response('missing', { status: 404 }));
		expect(response.status).toBe(404);
		expect(await response.text()).toBe('missing');
		expect(response.headers.get('content-security-policy')).toBe(
			"object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
		);
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
		expect(response.headers.get('x-frame-options')).toBe('DENY');
		expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
		expect(response.headers.get('permissions-policy')).toBe(
			'camera=(), microphone=(), geolocation=(), payment=()'
		);
		expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin');
	});

	it('preserves stricter route-level headers', async () => {
		const response = await handleWith(
			new Response('export', {
				headers: {
					'content-security-policy': "default-src 'none'; sandbox",
					'referrer-policy': 'no-referrer',
					'cache-control': 'private, no-store'
				}
			})
		);
		expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
		expect(response.headers.get('referrer-policy')).toBe('no-referrer');
		expect(response.headers.get('cache-control')).toBe('private, no-store');
	});

	it('supports immutable redirect response headers', async () => {
		const response = await handleWith(Response.redirect('https://latham.cloud/about', 301));
		expect(response.status).toBe(301);
		expect(response.headers.get('location')).toBe('https://latham.cloud/about');
		expect(response.headers.get('x-frame-options')).toBe('DENY');
	});
});
