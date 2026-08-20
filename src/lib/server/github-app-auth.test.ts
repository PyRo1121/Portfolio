import { Effect, Redacted } from 'effect';
import { describe, expect, it } from 'vitest';
import {
	fetchGitHubChecksToken,
	parseGitHubChecksAppConfig,
	type GitHubChecksAppConfig
} from './github-app-auth';

const NOW = new Date('2026-08-14T23:40:00.000Z');

function bytesToPem(bytes: ArrayBuffer): string {
	const binary = String.fromCharCode(...new Uint8Array(bytes));
	const encoded = btoa(binary);
	const lines = encoded.match(/.{1,64}/gu) ?? [];
	return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`; // gitleaks:allow -- Ephemeral test key generated at runtime.
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

async function appFixture(): Promise<{
	readonly config: GitHubChecksAppConfig;
	readonly publicKey: CryptoKey;
}> {
	const pair = await crypto.subtle.generateKey(
		{
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		true,
		['sign', 'verify']
	);
	return {
		config: {
			appId: '4598962',
			installationId: '153820305',
			privateKey: bytesToPem(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
		},
		publicKey: pair.publicKey
	};
}

describe('parseGitHubChecksAppConfig', () => {
	it('distinguishes an intentionally absent optional app', () => {
		expect(
			parseGitHubChecksAppConfig({
				appId: undefined,
				installationId: undefined,
				privateKey: undefined
			})
		).toEqual({ _tag: 'Unconfigured' });
	});

	it('rejects partial configuration instead of silently disabling checks', () => {
		expect(
			parseGitHubChecksAppConfig({
				appId: '4598962',
				installationId: undefined,
				privateKey: undefined
			})
		).toMatchObject({ _tag: 'Invalid' });
	});

	it('returns validated complete configuration', () => {
		expect(
			parseGitHubChecksAppConfig({
				appId: '4598962',
				installationId: '153820305',
				privateKey: 'private-key'
			})
		).toEqual({
			_tag: 'Configured',
			config: {
				appId: '4598962',
				installationId: '153820305',
				privateKey: 'private-key'
			}
		});
	});
});

describe('fetchGitHubChecksToken', () => {
	it('signs a bounded app JWT and requests a checks-read installation token', async () => {
		const { config, publicKey } = await appFixture();
		let requestedBody: unknown;
		const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			expect(String(input)).toBe(
				'https://api.github.com/app/installations/153820305/access_tokens'
			);
			expect(init?.method).toBe('POST');
			requestedBody = JSON.parse(String(init?.body));
			const authorization = new Headers(init?.headers).get('Authorization');
			expect(authorization).toMatch(/^Bearer /u);
			const jwt = authorization?.slice('Bearer '.length) ?? '';
			const [header, payload, signature] = jwt.split('.');
			expect(JSON.parse(new TextDecoder().decode(base64UrlToBytes(header ?? '')))).toEqual({
				alg: 'RS256',
				typ: 'JWT'
			});
			expect(JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload ?? '')))).toEqual({
				iat: Math.floor(NOW.getTime() / 1_000) - 60,
				exp: Math.floor(NOW.getTime() / 1_000) - 60 + 9 * 60,
				iss: '4598962'
			});
			expect(
				await crypto.subtle.verify(
					'RSASSA-PKCS1-v1_5',
					publicKey,
					base64UrlToBytes(signature ?? ''),
					new TextEncoder().encode(`${header}.${payload}`)
				)
			).toBe(true);
			return Response.json(
				{
					token: 'installation-secret',
					expires_at: '2026-08-15T00:40:00.000Z',
					permissions: { checks: 'read', metadata: 'read' }
				},
				{ status: 201 }
			);
		}) as typeof globalThis.fetch;

		const token = await Effect.runPromise(fetchGitHubChecksToken(fetch, config, NOW));

		expect(Redacted.value(token)).toBe('installation-secret');
		expect(requestedBody).toEqual({ permissions: { checks: 'read' } });
	});

	it('rejects a token response that grants an unexpected permission shape', async () => {
		const { config } = await appFixture();
		const fetch = (async () =>
			Response.json(
				{
					token: 'installation-secret',
					expires_at: '2026-08-15T00:40:00.000Z',
					permissions: { checks: 'write', metadata: 'read' }
				},
				{ status: 201 }
			)) as typeof globalThis.fetch;

		const exit = await Effect.runPromiseExit(fetchGitHubChecksToken(fetch, config, NOW));

		expect(exit._tag).toBe('Failure');
	});

	it('rejects the GitHub-generated PKCS#1 format until it is converted to PKCS#8', async () => {
		const config: GitHubChecksAppConfig = {
			appId: '4598962',
			installationId: '153820305',
			privateKey: '-----BEGIN RSA PRIVATE KEY-----\ninvalid\n-----END RSA PRIVATE KEY-----'
		};
		let calls = 0;
		const fetch = (async () => {
			calls += 1;
			return new Response(null, { status: 500 });
		}) as typeof globalThis.fetch;

		const exit = await Effect.runPromiseExit(fetchGitHubChecksToken(fetch, config, NOW));

		expect(exit._tag).toBe('Failure');
		expect(calls).toBe(0);
	});
});
