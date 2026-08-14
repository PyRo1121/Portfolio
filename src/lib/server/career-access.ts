/** Result of enforcing the exact-owner Cloudflare Access boundary. */
export type CareerAccessDecision =
	| { readonly _tag: 'Allowed'; readonly ownerEmail: string }
	| { readonly _tag: 'Denied'; readonly reason: string };

/** Resolve the authenticated Career owner from Cloudflare Access headers. */
export function resolveCareerAccess(
	headers: Headers,
	configuredOwnerEmail: string | undefined
): CareerAccessDecision {
	const expected = configuredOwnerEmail?.trim().toLocaleLowerCase();
	if (expected === undefined || expected.length === 0) {
		return { _tag: 'Denied', reason: 'Career owner configuration is unavailable.' };
	}
	const assertion = headers.get('cf-access-jwt-assertion')?.trim();
	const authenticatedEmail = headers
		.get('cf-access-authenticated-user-email')
		?.trim()
		.toLocaleLowerCase();
	if (assertion === undefined || assertion.length === 0 || authenticatedEmail !== expected) {
		return { _tag: 'Denied', reason: 'Career data requires the configured owner identity.' };
	}
	return { _tag: 'Allowed', ownerEmail: expected };
}
