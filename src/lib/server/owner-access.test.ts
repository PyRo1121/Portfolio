import { Effect } from 'effect';
import { generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import {
	configuredOwnerAccess,
	configuredOwnerEmail,
	isOwnerMutationPath,
	rejectDeniedOwnerLoad,
	resolveOwnerAccess,
	verifyOwnerAccessToken
} from './owner-access';

const TEAM_DOMAIN = 'https://olatham.cloudflareaccess.com';
const ACCESS_AUDIENCE = 'owner-app-audience';

function testAccessConfig() {
	const config = configuredOwnerAccess(TEAM_DOMAIN, ACCESS_AUDIENCE);
	if (config === null) throw new Error('Expected valid test Access configuration.');
	return config;
}

async function signedAccessToken(
	privateKey: CryptoKey,
	overrides: { readonly audience?: string; readonly email?: string } = {}
): Promise<string> {
	return new SignJWT({ email: overrides.email ?? 'olen@latham.cloud' })
		.setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
		.setIssuer(TEAM_DOMAIN)
		.setAudience(overrides.audience ?? ACCESS_AUDIENCE)
		.setIssuedAt()
		.setExpirationTime('5m')
		.sign(privateKey);
}

describe('owner Access configuration', () => {
	it('normalizes the owner identity and Access issuer', () => {
		expect(configuredOwnerEmail(' OLEN@LATHAM.CLOUD ')).toBe('olen@latham.cloud');
		expect(configuredOwnerEmail('  ')).toBeNull();
		expect(configuredOwnerEmail(undefined)).toBeNull();
		expect(configuredOwnerAccess(`${TEAM_DOMAIN}/`, ` ${ACCESS_AUDIENCE} `)).toMatchObject({
			teamDomain: TEAM_DOMAIN,
			audience: ACCESS_AUDIENCE,
			jwksUrl: new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`)
		});
	});

	it('rejects incomplete or non-HTTPS Access configuration', () => {
		expect(configuredOwnerAccess(undefined, ACCESS_AUDIENCE)).toBeNull();
		expect(configuredOwnerAccess(TEAM_DOMAIN, undefined)).toBeNull();
		expect(
			configuredOwnerAccess('http://olatham.cloudflareaccess.com', ACCESS_AUDIENCE)
		).toBeNull();
	});
});

describe('isOwnerMutationPath', () => {
	it('accepts only the Access-protected owner route', () => {
		expect(isOwnerMutationPath('/owner')).toBe(true);
		expect(isOwnerMutationPath('/')).toBe(false);
		expect(isOwnerMutationPath('/career/portfolio.md')).toBe(false);
	});
});

describe('resolveOwnerAccess', () => {
	it('allows the exact identity from a verified Access token', async () => {
		const { privateKey, publicKey } = await generateKeyPair('RS256');
		const assertion = await signedAccessToken(privateKey);
		const decision = await Effect.runPromise(
			resolveOwnerAccess(
				new Headers({ 'cf-access-jwt-assertion': assertion }),
				'olen@latham.cloud',
				testAccessConfig(),
				(token, config) => verifyOwnerAccessToken(token, config, publicKey)
			)
		);
		expect(decision).toEqual({ _tag: 'Allowed', ownerEmail: 'olen@latham.cloud' });
	});

	it('denies arbitrary assertion text even when the email header is spoofed', async () => {
		const { publicKey } = await generateKeyPair('RS256');
		const decision = await Effect.runPromise(
			resolveOwnerAccess(
				new Headers({
					'cf-access-authenticated-user-email': 'olen@latham.cloud',
					'cf-access-jwt-assertion': 'signed-access-assertion'
				}),
				'olen@latham.cloud',
				testAccessConfig(),
				(token, config) => verifyOwnerAccessToken(token, config, publicKey)
			)
		);
		expect(decision._tag).toBe('Denied');
	});

	it('denies a validly signed token for the wrong audience or identity', async () => {
		const { privateKey, publicKey } = await generateKeyPair('RS256');
		for (const assertion of [
			await signedAccessToken(privateKey, { audience: 'another-app' }),
			await signedAccessToken(privateKey, { email: 'other@example.com' })
		]) {
			const decision = await Effect.runPromise(
				resolveOwnerAccess(
					new Headers({ 'cf-access-jwt-assertion': assertion }),
					'olen@latham.cloud',
					testAccessConfig(),
					(token, config) => verifyOwnerAccessToken(token, config, publicKey)
				)
			);
			expect(decision._tag).toBe('Denied');
		}
	});
});

describe('rejectDeniedOwnerLoad', () => {
	it('throws HTTP 403 for a denied Access identity', () => {
		try {
			rejectDeniedOwnerLoad({
				_tag: 'Denied',
				reason: 'Owner data requires the configured Access identity.'
			});
			expect.fail('expected error(403)');
		} catch (cause) {
			expect(cause).toMatchObject({ status: 403 });
		}
	});
});
