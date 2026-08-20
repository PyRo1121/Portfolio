import { error } from '@sveltejs/kit';
import { Effect, Schema } from 'effect';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

const AccessTokenClaimsSchema = Schema.Struct({
	email: Schema.Trim.pipe(Schema.minLength(1))
});

type AccessTokenClaims = Schema.Schema.Type<typeof AccessTokenClaimsSchema>;
type AccessVerificationKey = CryptoKey | Uint8Array | JWTVerifyGetKey;

/** Parsed Cloudflare Access application identity used to verify JWT assertions. */
export type OwnerAccessConfig = {
	readonly teamDomain: string;
	readonly audience: string;
	readonly jwksUrl: URL;
};

/** Expected failure while cryptographically verifying an Access assertion. */
export class OwnerAccessTokenError extends Error {
	readonly _tag = 'OwnerAccessTokenError';

	constructor(override readonly cause: unknown) {
		super('Cloudflare Access assertion verification failed');
		this.name = 'OwnerAccessTokenError';
	}
}

/** Access-token verifier dependency used by the owner authorization policy. */
export type OwnerAccessTokenVerifier = (
	token: string,
	config: OwnerAccessConfig
) => Effect.Effect<AccessTokenClaims, OwnerAccessTokenError>;

const remoteKeySets = new Map<string, JWTVerifyGetKey>();

function remoteKeySet(config: OwnerAccessConfig): JWTVerifyGetKey {
	const existing = remoteKeySets.get(config.teamDomain);
	if (existing !== undefined) return existing;
	const keySet = createRemoteJWKSet(config.jwksUrl);
	remoteKeySets.set(config.teamDomain, keySet);
	return keySet;
}

/** Normalize the configured owner identity used to scope public reads and private writes. */
export function configuredOwnerEmail(value: string | undefined): string | null {
	const normalized = value?.trim().toLocaleLowerCase();
	return normalized === undefined || normalized.length === 0 ? null : normalized;
}

/** Parse the Access team origin and application audience used for JWT verification. */
export function configuredOwnerAccess(
	teamDomainValue: string | undefined,
	audienceValue: string | undefined
): OwnerAccessConfig | null {
	const teamDomain = teamDomainValue?.trim().replace(/\/+$/u, '');
	const audience = audienceValue?.trim();
	if (teamDomain === undefined || audience === undefined || audience.length === 0) return null;
	try {
		const url = new URL(teamDomain);
		if (url.protocol !== 'https:' || url.origin !== teamDomain || url.pathname !== '/') return null;
		return {
			teamDomain: url.origin,
			audience,
			jwksUrl: new URL('/cdn-cgi/access/certs', url)
		};
	} catch {
		return null;
	}
}

/** Restrict mutable owner operations to the path protected by Cloudflare Access. */
export function isOwnerMutationPath(pathname: string): boolean {
	return pathname === '/owner';
}

/** Result of enforcing the exact-owner Cloudflare Access boundary. */
export type OwnerAccessDecision =
	| { readonly _tag: 'Allowed'; readonly ownerEmail: string }
	| { readonly _tag: 'Denied'; readonly reason: string };

/** Verify one Access JWT against its signing key, issuer, audience, and time claims. */
export function verifyOwnerAccessToken(
	token: string,
	config: OwnerAccessConfig,
	key: AccessVerificationKey = remoteKeySet(config)
): Effect.Effect<AccessTokenClaims, OwnerAccessTokenError> {
	return Effect.tryPromise({
		try: () =>
			jwtVerify(token, key, {
				algorithms: ['RS256'],
				issuer: config.teamDomain,
				audience: config.audience
			}),
		catch: (cause) => new OwnerAccessTokenError(cause)
	}).pipe(
		Effect.flatMap(({ payload }) =>
			Schema.decodeUnknown(AccessTokenClaimsSchema)(payload).pipe(
				Effect.mapError((cause) => new OwnerAccessTokenError(cause))
			)
		)
	);
}

/** Resolve the authenticated owner from a cryptographically verified Access assertion. */
export function resolveOwnerAccess(
	headers: Headers,
	expectedOwnerEmail: string | undefined,
	accessConfig: OwnerAccessConfig | null,
	verifyToken: OwnerAccessTokenVerifier = (token, config) => verifyOwnerAccessToken(token, config)
): Effect.Effect<OwnerAccessDecision> {
	const expected = configuredOwnerEmail(expectedOwnerEmail);
	if (expected === null || accessConfig === null) {
		return Effect.succeed({
			_tag: 'Denied',
			reason: 'Owner identity configuration is unavailable.'
		});
	}
	const assertion = headers.get('cf-access-jwt-assertion')?.trim();
	if (assertion === undefined || assertion.length === 0) {
		return Effect.succeed({
			_tag: 'Denied',
			reason: 'Owner data requires a verified Access identity.'
		});
	}
	return verifyToken(assertion, accessConfig).pipe(
		Effect.match({
			onFailure: (): OwnerAccessDecision => ({
				_tag: 'Denied',
				reason: 'Owner data requires a verified Access identity.'
			}),
			onSuccess: (claims): OwnerAccessDecision =>
				configuredOwnerEmail(claims.email) === expected
					? { _tag: 'Allowed', ownerEmail: expected }
					: {
							_tag: 'Denied',
							reason: 'Owner data requires the configured Access identity.'
						}
		})
	);
}

/** Throw SvelteKit `error(403)` for a denied owner page load. Do not use `fail(403)`. */
export function rejectDeniedOwnerLoad(decision: OwnerAccessDecision): asserts decision is {
	readonly _tag: 'Allowed';
	readonly ownerEmail: string;
} {
	if (decision._tag === 'Denied') {
		error(403, decision.reason);
	}
}
