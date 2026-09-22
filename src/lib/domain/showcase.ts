/** One featured project on the public landing page. */
export type ShowcaseProject = {
	readonly name: string;
	readonly tagline: string;
	/** Public repository; null when the source is private. */
	readonly repoUrl: string | null;
	/** Public product website. */
	readonly demoUrl: string | null;
};

/** Canonical public destinations for the two featured projects. */
export const OMG_PROJECT: ShowcaseProject = {
	name: 'OMG',
	tagline: 'A Rust CLI for packages, language runtimes, project tasks, and security evidence.',
	repoUrl: 'https://github.com/omg-cli/omg',
	demoUrl: 'https://getomg.xyz/'
};

export const DEPLOYLINT_PROJECT: ShowcaseProject = {
	name: 'DeployLint',
	tagline: 'Repository-aware CI/CD setup with a reviewed pull request and deployment controls.',
	repoUrl: null,
	demoUrl: 'https://deploylint.com/'
};

export const SHOWCASE_PROJECTS: ReadonlyArray<ShowcaseProject> = [OMG_PROJECT, DEPLOYLINT_PROJECT];
