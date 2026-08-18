import { error } from '@sveltejs/kit';

/** Normalize the configured owner identity used to scope public reads and private writes. */
export function configuredOwnerEmail(value: string | undefined): string | null {
	const normalized = value?.trim().toLocaleLowerCase();
	return normalized === undefined || normalized.length === 0 ? null : normalized;
}

/** Restrict mutable owner operations to the path protected by Cloudflare Access. */
export function isOwnerMutationPath(pathname: string): boolean {
	return pathname === '/owner';
}

/** Result of enforcing the exact-owner Cloudflare Access boundary. */
export type OwnerAccessDecision =
	| { readonly _tag: 'Allowed'; readonly ownerEmail: string }
	| { readonly _tag: 'Denied'; readonly reason: string };

/** Resolve the authenticated owner from Cloudflare Access headers. */
export function resolveOwnerAccess(
	headers: Headers,
	expectedOwnerEmail: string | undefined
): OwnerAccessDecision {
	const expected = configuredOwnerEmail(expectedOwnerEmail);
	if (expected === null) {
		return { _tag: 'Denied', reason: 'Owner identity configuration is unavailable.' };
	}
	const assertion = headers.get('cf-access-jwt-assertion')?.trim();
	const authenticatedEmail = headers
		.get('cf-access-authenticated-user-email')
		?.trim()
		.toLocaleLowerCase();
	if (assertion === undefined || assertion.length === 0 || authenticatedEmail !== expected) {
		return { _tag: 'Denied', reason: 'Owner data requires the configured Access identity.' };
	}
	return { _tag: 'Allowed', ownerEmail: expected };
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

