import { Either, Redacted, Schema } from 'effect';

const MAX_ORGANIZATION_REPOSITORIES = 20;
const GitHubRepositoryFullNameSchema = Schema.String.pipe(
	Schema.pattern(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/)
);
const GitHubOrganizationAccessRuntimeInputSchema = Schema.Struct({
	token: Schema.optional(Schema.String),
	repositories: Schema.optional(Schema.String)
});
const GitHubOrganizationRepositoriesSchema = Schema.Array(GitHubRepositoryFullNameSchema).pipe(
	Schema.minItems(1),
	Schema.maxItems(MAX_ORGANIZATION_REPOSITORIES)
);

export type GitHubOrganizationAccessConfig = {
	readonly token: Redacted.Redacted<string>;
	readonly repositories: ReadonlyArray<string>;
};

export type GitHubOrganizationAccessConfigState =
	| { readonly _tag: 'Configured'; readonly config: GitHubOrganizationAccessConfig }
	| { readonly _tag: 'Unconfigured' }
	| { readonly _tag: 'Invalid'; readonly reason: string };

function repositoryNames(value: string): ReadonlyArray<string> {
	const names = value
		.split(',')
		.map((repository) => repository.trim())
		.filter((repository) => repository.length > 0);
	const unique = new Map<string, string>();
	for (const name of names) unique.set(name.toLocaleLowerCase(), name);
	return [...unique.values()];
}

/** Parse one optional, repository-allowlisted GitHub organization credential. */
export function parseGitHubOrganizationAccessConfig(
	input: unknown
): GitHubOrganizationAccessConfigState {
	const runtimeInput = Schema.decodeUnknownEither(GitHubOrganizationAccessRuntimeInputSchema)(
		input
	);
	if (Either.isLeft(runtimeInput)) {
		return {
			_tag: 'Invalid',
			reason: 'GitHub organization access configuration had an invalid shape.'
		};
	}
	const token = runtimeInput.right.token?.trim();
	const repositories = runtimeInput.right.repositories?.trim();
	if (
		(token === undefined || token.length === 0) &&
		(repositories === undefined || repositories.length === 0)
	) {
		return { _tag: 'Unconfigured' };
	}
	if (
		token === undefined ||
		token.length === 0 ||
		repositories === undefined ||
		repositories.length === 0
	) {
		return {
			_tag: 'Invalid',
			reason: 'GitHub organization access requires both a token and repository allowlist.'
		};
	}
	const decodedRepositories = Schema.decodeUnknownEither(GitHubOrganizationRepositoriesSchema)(
		repositoryNames(repositories)
	);
	if (Either.isLeft(decodedRepositories)) {
		return {
			_tag: 'Invalid',
			reason: 'GitHub organization repository allowlist was malformed or exceeded its bound.'
		};
	}
	return {
		_tag: 'Configured',
		config: {
			token: Redacted.make(token),
			repositories: decodedRepositories.right
		}
	};
}
