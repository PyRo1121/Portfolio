import { Effect, Either, Redacted, Schema } from 'effect';
import { githubRequestHeaders } from './github-http';

const API_ROOT = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 10_000;
const JWT_BACKDATE_SECONDS = 60;
const JWT_LIFETIME_SECONDS = 9 * 60;

const GitHubIdentifierSchema = Schema.String.pipe(Schema.pattern(/^[1-9]\d*$/));

export const GitHubChecksAppConfigSchema = Schema.Struct({
	appId: GitHubIdentifierSchema,
	installationId: GitHubIdentifierSchema,
	privateKey: Schema.String.pipe(Schema.minLength(1))
});

export type GitHubChecksAppConfig = Schema.Schema.Type<typeof GitHubChecksAppConfigSchema>;

export type GitHubChecksAppConfigState =
	| { readonly _tag: 'Configured'; readonly config: GitHubChecksAppConfig }
	| { readonly _tag: 'Unconfigured' }
	| { readonly _tag: 'Invalid'; readonly reason: string };

const GitHubChecksAppRuntimeInputSchema = Schema.Struct({
	appId: Schema.optional(Schema.String),
	installationId: Schema.optional(Schema.String),
	privateKey: Schema.optional(Schema.String)
});

/** Distinguish an intentionally absent optional app from malformed or partial configuration. */
export function parseGitHubChecksAppConfig(input: unknown): GitHubChecksAppConfigState {
	const runtimeInput = Schema.decodeUnknownEither(GitHubChecksAppRuntimeInputSchema)(input);
	if (Either.isLeft(runtimeInput)) {
		return { _tag: 'Invalid', reason: 'GitHub Checks app configuration had an invalid shape.' };
	}
	const values = [
		runtimeInput.right.appId,
		runtimeInput.right.installationId,
		runtimeInput.right.privateKey
	];
	if (values.every((value) => value === undefined || value.trim().length === 0)) {
		return { _tag: 'Unconfigured' };
	}
	const decoded = Schema.decodeUnknownEither(GitHubChecksAppConfigSchema)(runtimeInput.right);
	return Either.isLeft(decoded)
		? {
				_tag: 'Invalid',
				reason: 'GitHub Checks app configuration was partial or malformed.'
			}
		: { _tag: 'Configured', config: decoded.right };
}

const InstallationTokenResponseSchema = Schema.Struct({
	token: Schema.String.pipe(Schema.minLength(1)),
	expires_at: Schema.DateFromString,
	permissions: Schema.Struct({
		checks: Schema.Literal('read'),
		metadata: Schema.Literal('read')
	})
});

export class GitHubAppAuthError extends Error {
	readonly _tag = 'GitHubAppAuthError';

	constructor(
		message: string,
		readonly status: number | null = null,
		options?: ErrorOptions
	) {
		super(message, options);
	}
}

type Fetch = typeof globalThis.fetch;

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	const chunkSize = 32_768;
	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
	}
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function textToBase64Url(value: string): string {
	return bytesToBase64Url(new TextEncoder().encode(value));
}

function decodePkcs8PrivateKey(privateKey: string): ArrayBuffer {
	const match = /^-----BEGIN PRIVATE KEY-----\s+([\s\S]+?)\s+-----END PRIVATE KEY-----$/u.exec(
		privateKey.trim()
	);
	if (match?.[1] === undefined) {
		throw new GitHubAppAuthError(
			'GitHub App private key must be an unencrypted PKCS#8 PRIVATE KEY.'
		);
	}
	const binary = atob(match[1].replace(/\s/gu, ''));
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes.buffer;
}

async function createAppJwt(config: GitHubChecksAppConfig, now: Date): Promise<string> {
	const issuedAt = Math.floor(now.getTime() / 1_000) - JWT_BACKDATE_SECONDS;
	const header = textToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
	const payload = textToBase64Url(
		JSON.stringify({
			iat: issuedAt,
			exp: issuedAt + JWT_LIFETIME_SECONDS,
			iss: config.appId
		})
	);
	const unsignedToken = `${header}.${payload}`;
	const key = await crypto.subtle.importKey(
		'pkcs8',
		decodePkcs8PrivateKey(config.privateKey),
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		key,
		new TextEncoder().encode(unsignedToken)
	);
	return `${unsignedToken}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/** Mint one short-lived installation token restricted to read-only GitHub Checks access. */
export function fetchGitHubChecksToken(
	fetch: Fetch,
	config: GitHubChecksAppConfig,
	now = new Date()
): Effect.Effect<Redacted.Redacted<string>, GitHubAppAuthError> {
	return Effect.gen(function* () {
		const decodedConfig = yield* Schema.decodeUnknown(GitHubChecksAppConfigSchema)(config).pipe(
			Effect.mapError(
				(cause) =>
					new GitHubAppAuthError('GitHub Checks app configuration was invalid.', null, { cause })
			)
		);
		const jwt = yield* Effect.tryPromise({
			try: () => createAppJwt(decodedConfig, now),
			catch: (cause) =>
				cause instanceof GitHubAppAuthError
					? cause
					: new GitHubAppAuthError('GitHub App JWT signing failed.', null, { cause })
		});
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		const response = yield* Effect.tryPromise({
			try: () =>
				fetch(
					`${API_ROOT}/app/installations/${encodeURIComponent(decodedConfig.installationId)}/access_tokens`,
					{
						method: 'POST',
						headers: githubRequestHeaders({
							authorization: `Bearer ${jwt}`,
							json: true
						}),
						body: JSON.stringify({ permissions: { checks: 'read' } }),
						signal: controller.signal
					}
				),
			catch: (cause) =>
				new GitHubAppAuthError('GitHub installation-token request failed.', null, { cause })
		}).pipe(Effect.ensuring(Effect.sync(() => clearTimeout(timeout))));
		if (!response.ok) {
			return yield* Effect.fail(
				new GitHubAppAuthError(
					`GitHub installation-token request failed with HTTP ${response.status}.`,
					response.status
				)
			);
		}
		const body = yield* Effect.tryPromise({
			try: () => response.json(),
			catch: (cause) =>
				new GitHubAppAuthError(
					'GitHub installation-token response was not JSON.',
					response.status,
					{
						cause
					}
				)
		});
		const decoded = yield* Schema.decodeUnknown(InstallationTokenResponseSchema)(body).pipe(
			Effect.mapError(
				(cause) =>
					new GitHubAppAuthError(
						'GitHub installation-token response was invalid.',
						response.status,
						{
							cause
						}
					)
			)
		);
		if (decoded.expires_at.getTime() <= now.getTime()) {
			return yield* Effect.fail(
				new GitHubAppAuthError('GitHub installation token was already expired.', response.status)
			);
		}
		return Redacted.make(decoded.token);
	});
}
