/** Result of enforcing the exact-owner Cloudflare Access boundary. */
export type OwnerAccessDecision =
	| { readonly _tag: 'Allowed'; readonly ownerEmail: string }
	| { readonly _tag: 'Denied'; readonly reason: string };

/** Resolve the authenticated owner from Cloudflare Access headers. */
export function resolveOwnerAccess(
	headers: Headers,
	configuredOwnerEmail: string | undefined
): OwnerAccessDecision {
	const expected = configuredOwnerEmail?.trim().toLocaleLowerCase();
	if (expected === undefined || expected.length === 0) {
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
