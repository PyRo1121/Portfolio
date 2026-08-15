const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_USER_AGENT = 'Weeknote/1.0';

type GitHubRequestHeadersOptions = {
	readonly authorization?: string;
	readonly json?: boolean;
};

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
