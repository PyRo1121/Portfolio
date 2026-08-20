const GITHUB_API_ROOT = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_USER_AGENT = 'Weeknote/1.0';
const GITHUB_REQUEST_TIMEOUT_MS = 15_000;

type GitHubRequestHeadersOptions = {
	readonly authorization?: string;
	readonly json?: boolean;
};

/** Fetch one GitHub resource with a bounded deadline and optional caller cancellation. */
export function githubFetch(
	fetch: typeof globalThis.fetch,
	path: string,
	init: RequestInit = {},
	timeoutMs = GITHUB_REQUEST_TIMEOUT_MS
): Promise<Response> {
	if (!path.startsWith('/') || path.startsWith('//')) {
		return Promise.reject(new TypeError('GitHub request path must be API-relative.'));
	}
	const timeout = AbortSignal.timeout(timeoutMs);
	const signal =
		init.signal === undefined || init.signal === null
			? timeout
			: AbortSignal.any([init.signal, timeout]);
	return fetch(`${GITHUB_API_ROOT}${path}`, { ...init, signal });
}

/** Required, consistent headers for every request to GitHub's REST and GraphQL APIs. */
export function githubRequestHeaders(
	options: GitHubRequestHeadersOptions = {}
): Readonly<Record<string, string>> {
	return {
		Accept: 'application/vnd.github+json',
		'User-Agent': GITHUB_USER_AGENT,
		'X-GitHub-Api-Version': GITHUB_API_VERSION,
		...(options.authorization === undefined ? {} : { Authorization: options.authorization }),
		...(options.json === true ? { 'Content-Type': 'application/json' } : {})
	};
}
