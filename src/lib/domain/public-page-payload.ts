/** Keys that must never appear on public `/` PageData. */
export const PUBLIC_PAGE_FORBIDDEN_KEYS = [
	'career',
	'careerAccess',
	'ownerAuthorized',
	'telemetry',
	'cloudflare',
	'cloudflareCache',
	'cloudflareRefresh',
	'cloudflareDeployments',
	'cloudflareDeploymentCache',
	'cloudflareDeploymentRefresh',
	'ownerProjects'
] as const;

/** List forbidden keys present on an untrusted public payload object. */
export function forbiddenPublicPageKeys(payload: unknown): ReadonlyArray<string> {
	if (payload === null || typeof payload !== 'object') {
		return [...PUBLIC_PAGE_FORBIDDEN_KEYS];
	}
	const record = payload as Record<string, unknown>;
	return PUBLIC_PAGE_FORBIDDEN_KEYS.filter((key) => Object.hasOwn(record, key));
}
