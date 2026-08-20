import type { D1Database, RateLimit } from '@cloudflare/workers-types';
import { describe, expect, it, vi } from 'vitest';
import { POST } from '../../routes/api/telemetry/+server';

const validPayload = {
	eventId: 'f8ad3bc4-8b70-4d2c-88aa-0efb3710378f',
	eventType: 'page_view',
	path: '/',
	sessionHash: '0123456789abcdef0123456789abcdef'
};

type TelemetryEvent = Parameters<typeof POST>[0];

type RouteFixture = {
	readonly event: TelemetryEvent;
	readonly responseHeaders: Map<string, string>;
	readonly run: ReturnType<typeof vi.fn>;
};

function routeFixture(
	options: {
		readonly body?: string;
		readonly origin?: string;
		readonly contentType?: string;
		readonly contentLength?: string;
		readonly rateLimitSuccess?: boolean;
	} = {}
): RouteFixture {
	const run = vi.fn(async () => ({ success: true }));
	const statement = {
		bind: () => statement,
		run
	};
	const database = {
		prepare: () => statement
	} as unknown as D1Database;
	const rateLimiter = {
		limit: async () => ({ success: options.rateLimitSuccess ?? true })
	} as unknown as RateLimit;
	const headers = new Headers({
		'cf-connecting-ip': '192.0.2.1',
		'cf-ipcountry': 'us',
		'content-type': options.contentType ?? 'application/json',
		origin: options.origin ?? 'https://latham.cloud'
	});
	if (options.contentLength !== undefined) headers.set('content-length', options.contentLength);
	const request = new Request('https://latham.cloud/api/telemetry', {
		method: 'POST',
		headers,
		body: options.body ?? JSON.stringify(validPayload)
	});
	const responseHeaders = new Map<string, string>();
	const event = {
		platform: {
			env: {
				CAREER_OWNER_EMAIL: 'olen@latham.cloud',
				OWNER_DB: database,
				TELEMETRY_RATE_LIMITER: rateLimiter
			}
		},
		request,
		setHeaders: (values: Record<string, string>) => {
			for (const [key, value] of Object.entries(values)) responseHeaders.set(key, value);
		}
	} as unknown as TelemetryEvent;
	return { event, responseHeaders, run };
}

describe('POST /api/telemetry', () => {
	it('returns 429 with Retry-After before parsing a rate-limited beacon', async () => {
		const fixture = routeFixture({ rateLimitSuccess: false });
		const response = await POST(fixture.event);
		expect(response.status).toBe(429);
		expect(fixture.responseHeaders.get('retry-after')).toBe('60');
		expect(fixture.run).not.toHaveBeenCalled();
	});

	it.each([
		['cross-origin', { origin: 'https://attacker.example' }, 403],
		['wrong content type', { contentType: 'text/plain' }, 415],
		['oversized', { contentLength: '16385' }, 413],
		['malformed JSON', { body: '{' }, 400]
	] as const)('returns the bounded status for %s input', async (_label, options, status) => {
		const fixture = routeFixture(options);
		const response = await POST(fixture.event);
		expect(response.status).toBe(status);
		expect(fixture.run).not.toHaveBeenCalled();
	});

	it('persists one valid enriched beacon and returns 201', async () => {
		const fixture = routeFixture();
		const response = await POST(fixture.event);
		expect(response.status).toBe(201);
		expect(fixture.run).toHaveBeenCalledOnce();
	});
});
