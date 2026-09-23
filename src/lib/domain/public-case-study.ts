export type PublicCaseStudyEvidence = {
	readonly label: string;
	readonly href: string;
	readonly note: string;
};

export type PublicCaseStudyWorkflowStep = {
	readonly label: string;
	readonly action: string;
	readonly outcome: string;
};

export type PublicCaseStudyVisual = {
	readonly imagePath: string;
	readonly alt: string;
	readonly caption: string;
	readonly pageUrl: string;
	readonly linkLabel: string;
};

export type PublicCaseStudy = {
	readonly slug: 'omg' | 'deploylint';
	readonly eyebrow: string;
	readonly title: string;
	readonly websiteUrl: string;
	readonly summary: string;
	readonly problem: string;
	readonly work: string;
	readonly difficulty: string;
	readonly result: string;
	readonly reflection: string;
	readonly workflowIntro: string;
	readonly workflowSteps: readonly [PublicCaseStudyWorkflowStep, ...PublicCaseStudyWorkflowStep[]];
	readonly visual: PublicCaseStudyVisual;
	readonly tools: ReadonlyArray<string>;
	readonly evidence: readonly [PublicCaseStudyEvidence, ...PublicCaseStudyEvidence[]];
};

export const PUBLIC_CASE_STUDIES = [
	{
		slug: 'omg',
		eyebrow: 'Case study · OMG',
		title: 'One command for the whole development environment.',
		websiteUrl: 'https://getomg.xyz/',
		summary:
			'OMG is a Rust CLI that brings system packages, language runtimes, developer tools, project tasks, and security evidence into one workflow across Linux and Apple silicon macOS.',
		problem:
			'A normal development setup can involve a system package manager, an AUR helper, and separate tools for Node, Python, Rust, Ruby, or Java. Each one has its own commands, configuration, and update path. I wanted to see how far one honest interface could reduce that friction without hiding the platform underneath.',
		work: 'I built the CLI in Rust around native package backends, runtime management, task discovery, and vulnerability evidence. An optional daemon keeps derived indexes warm, while ordinary commands still work directly. The repository includes integration tests, security boundaries, release tooling, and documentation. OMG keeps the platform’s package manager in the loop rather than inventing a new package format.',
		difficulty:
			'The hard part is not parsing another command. Package managers disagree about names, privileges, dependency behavior, transactions, and what a successful operation means. Supporting more than one platform forced me to make those differences explicit and to learn where a shared abstraction helps—and where it starts lying.',
		result:
			'OMG ships as a public alpha. Its release page lists downloadable platform archives and verification steps, while the live CLI reference documents commands, native backends, and platform limits. The screenshot below shows that reference.',
		reflection:
			'OMG taught me that ambitious tooling becomes credible through boundaries, tests, release discipline, and accurate documentation—not through a longer feature list.',
		workflowIntro:
			'A real CLI path, using commands documented in the public repository. Exact backend behavior depends on platform and package availability.',
		workflowSteps: [
			{
				label: '01 / inspect',
				action: 'omg install ripgrep --dry-run',
				outcome: 'Preview the native package operation before changing the machine.'
			},
			{
				label: '02 / install',
				action: 'omg install ripgrep',
				outcome: 'Let OMG route the package request through the supported system backend.'
			},
			{
				label: '03 / verify',
				action: 'omg run test',
				outcome: 'Run a task discovered from the current project through the same CLI.'
			},
			{
				label: '04 / audit',
				action: 'omg audit scan',
				outcome: 'Inspect dependency vulnerability evidence without leaving the workflow.'
			}
		],
		visual: {
			imagePath: '/portfolio/omg-cli-docs.png',
			alt: 'OMG CLI reference page describing commands and native package backends',
			caption:
				'Public CLI reference captured September 22, 2026. It documents the command interface and platform-specific backends.',
			pageUrl: 'https://getomg.xyz/docs/cli',
			linkLabel: 'Open the live CLI reference'
		},
		tools: [
			'Rust',
			'CLI design',
			'Package backends',
			'CI/CD',
			'Benchmarking',
			'Release automation'
		],
		evidence: [
			{
				label: 'Source repository',
				href: 'https://github.com/omg-cli/omg',
				note: 'Rust source, tests, documentation, and commit history.'
			},
			{
				label: 'Current release',
				href: 'https://github.com/omg-cli/omg/releases/latest',
				note: 'Tagged release and published platform artifacts.'
			},
			{
				label: 'Architecture notes',
				href: 'https://github.com/omg-cli/omg/blob/main/docs/architecture.md',
				note: 'The current repository architecture and subsystem boundaries.'
			},
			{
				label: 'Product and documentation',
				href: 'https://getomg.xyz/',
				note: 'Public overview, installation path, and platform documentation.'
			}
		]
	},
	{
		slug: 'deploylint',
		eyebrow: 'Case study · DeployLint',
		title: 'CI/CD setup that begins with the repository.',
		websiteUrl: 'https://deploylint.com/',
		summary:
			'DeployLint inspects a GitHub repository, previews a tailored GitHub Actions pipeline, and opens a setup pull request for human review. It also makes production deployment decisions traceable.',
		problem:
			'A developer can ship an application before they know how to choose CI checks, lockfile installs, permissions, secrets, environments, and deployment gates. Copying a generic workflow can leave critical assumptions invisible. I wanted the setup to start from what the repository actually contains and explain what still needs a human decision.',
		work: 'I built a repository inspection and planning flow that derives a versioned pipeline from detected project evidence and explicit preferences. It previews generated workflow files and credential requirements, then writes an isolated setup branch and opens a pull request. The product also evaluates protected deployments and records decisions tied to repository, commit, and policy evidence.',
		difficulty:
			'The difficult part is refusing to guess. A repository can contain several applications, ambiguous lockfiles, or unsupported deployment targets. DeployLint must explain those boundaries, keep pull request jobs away from production credentials, and never let an automated author approve its own deployment.',
		result:
			'DeployLint has a live public setup page, GitHub App, and CI/CD guide. The setup page shows the steps from GitHub sign-in through repository connection and dashboard review. Repository assessment and pull request creation follow authentication.',
		reflection:
			'DeployLint made me treat the generated pull request as an explanation and review record, not just a YAML delivery mechanism.',
		workflowIntro:
			'The public setup journey, from a repository scan to a reviewable pull request. Generation depends on supported evidence and plan eligibility.',
		workflowSteps: [
			{
				label: '01 / assess',
				action: 'Connect a GitHub repository',
				outcome: 'Inspect application roots, lockfiles, package-manager evidence, and current CI.'
			},
			{
				label: '02 / preview',
				action: 'Review the proposed pipeline',
				outcome:
					'See generated workflow files, missing credentials, and unsupported or ambiguous evidence.'
			},
			{
				label: '03 / decide',
				action: 'Choose supported destinations',
				outcome: 'Keep production credentials and deployment rules as explicit human decisions.'
			},
			{
				label: '04 / review',
				action: 'Open a setup pull request',
				outcome: 'Inspect the isolated branch and workflow changes before merging.'
			}
		],
		visual: {
			imagePath: '/portfolio/deploylint-start.png',
			alt: 'DeployLint public setup page with GitHub sign-in and three setup steps',
			caption:
				'Public setup page captured September 22, 2026. The page explains sign-in, repository connection, and dashboard review.',
			pageUrl: 'https://deploylint.com/start',
			linkLabel: 'Open the live setup page'
		},
		tools: ['TypeScript', 'SvelteKit', 'GitHub Apps', 'GitHub Actions', 'Cloudflare Workers'],
		evidence: [
			{
				label: 'Live product',
				href: 'https://deploylint.com/',
				note: 'Public setup journey and deployment protection model.'
			},
			{
				label: 'GitHub Actions guide',
				href: 'https://deploylint.com/guides/github-actions-setup',
				note: 'The concrete checks and boundaries behind the generated setup.'
			},
			{
				label: 'GitHub App',
				href: 'https://github.com/apps/deploylint',
				note: 'Public GitHub integration entry point.'
			}
		]
	}
] as const satisfies ReadonlyArray<PublicCaseStudy>;

export const publicCaseStudyPaths = ['/work/omg', '/work/deploylint'] as const;

export function publicCaseStudyFor(slug: PublicCaseStudy['slug']): PublicCaseStudy {
	const study = PUBLIC_CASE_STUDIES.find((candidate) => candidate.slug === slug);
	if (study === undefined) {
		throw new Error(`Unknown public case study: ${slug}`);
	}
	return study;
}
