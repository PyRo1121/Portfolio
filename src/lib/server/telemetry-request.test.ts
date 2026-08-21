import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { parseTelemetryRequest } from './telemetry-request.js';

const validPayload = {
	eventId: 'f8ad3bc4-8b70-4d2c-88aa-0efb3710378f',
	eventType: 'page_view',
	path: '/',
	sessionHash: '0123456789abcdef0123456789abcdef'
};

function request(body: string, headers: HeadersInit = {}): Request {
	return new Request('https://latham.cloud/api/telemetry', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			origin: 'https://latham.cloud',
			...headers
		},
		body
	});
}

describe('parseTelemetryRequest', () => {
	it('parses a bounded same-origin JSON beacon', async () => {
		const result = await Effect.runPromise(
			parseTelemetryRequest(request(JSON.stringify(validPayload)))
		);
		expect(result).toEqual(validPayload);
	});

	it('parses a bounded contact action without identity or message content', async () => {
		const payload = {
			...validPayload,
			eventType: 'contact_action',
			action: 'email_header'
		};
		const result = await Effect.runPromise(parseTelemetryRequest(request(JSON.stringify(payload))));
		expect(result).toEqual(payload);
	});

	it('rejects cross-origin and non-JSON browser requests', async () => {
		const crossOrigin = await Effect.runPromiseExit(
			parseTelemetryRequest(
				request(JSON.stringify(validPayload), { origin: 'https://attacker.example' })
			)
		);
		const plainText = await Effect.runPromiseExit(
			parseTelemetryRequest(request(JSON.stringify(validPayload), { 'content-type': 'text/plain' }))
		);
		expect(crossOrigin._tag).toBe('Failure');
		expect(plainText._tag).toBe('Failure');
	});

	it('rejects oversized request bodies before schema parsing', async () => {
		const result = await Effect.runPromiseExit(parseTelemetryRequest(request('x'.repeat(16_385))));
		expect(result._tag).toBe('Failure');
	});
});
