import { PUBLIC_GITHUB_URL } from './public-seo';

/** One featured project on the public landing page. */
export type ShowcaseProject = {
	readonly name: string;
	readonly tagline: string;
	/** Public repository; null when the source is private. */
	readonly repoUrl: string | null;
	/** Live deployment; null renders the source link only. */
	readonly demoUrl: string | null;
	readonly topics: ReadonlyArray<string>;
};

/** Projects featured on the landing page. Proof lives in the repositories and deployments. */
export const SHOWCASE_PROJECTS: ReadonlyArray<ShowcaseProject> = [
	{
		name: 'OMG',
		tagline: 'One Rust interface for system packages and language runtimes that disagree.',
		repoUrl: `${PUBLIC_GITHUB_URL}/omg`,
		demoUrl: 'https://omg.latham.cloud',
		topics: ['Rust', 'CLI', 'Cross-platform']
	},
	{
		name: 'Token dashboard',
		tagline: 'Self-hosted usage dashboard with an automated sync pipeline.',
		repoUrl: null,
		demoUrl: 'https://tokens.latham.cloud',
		topics: ['TypeScript', 'Self-hosted']
	},
	{
		name: 'DeployLint',
		tagline: 'Local GitHub Actions deployment-risk guard.',
		repoUrl: `${PUBLIC_GITHUB_URL}/deploylint`,
		demoUrl: 'https://deploylint.com',
		topics: ['TypeScript', 'GitHub Actions', 'CI']
	}
] as const satisfies ReadonlyArray<ShowcaseProject>;
