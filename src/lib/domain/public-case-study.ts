export type PublicCaseStudyEvidence = {
	readonly label: string;
	readonly href: string;
	readonly note: string;
};

export type PublicCaseStudy = {
	readonly slug: 'omg' | 'weeknote';
	readonly eyebrow: string;
	readonly title: string;
	readonly summary: string;
	readonly problem: string;
	readonly work: string;
	readonly difficulty: string;
	readonly result: string;
	readonly reflection: string;
	readonly tools: ReadonlyArray<string>;
	readonly evidence: ReadonlyArray<PublicCaseStudyEvidence>;
};

export const PUBLIC_CASE_STUDIES = [
	{
		slug: 'omg',
		eyebrow: 'Case study · OMG',
		title: 'One interface for tools that don’t agree.',
		summary:
			'OMG is a Rust CLI I started after getting tired of switching commands and mental models every time a project crossed from system packages into language runtimes.',
		problem:
			'A normal development setup can involve a system package manager, an AUR helper, and separate tools for Node, Python, Rust, Ruby, or Java. Each one has its own commands, configuration, and update path. I wanted to see how far one honest interface could reduce that friction without hiding the platform underneath.',
		work: 'I built the core in Rust and separated the command-line interface, package backends, runtime handling, daemon, and release tooling. The repository also contains benchmark harnesses, integration tests, architecture notes, security documentation, and installers. I kept the native package managers in the loop rather than inventing a new package format.',
		difficulty:
			'The hard part is not parsing another command. Package managers disagree about names, privileges, dependency behavior, transactions, and what a successful operation means. Supporting more than one platform forced me to make those differences explicit and to learn where a shared abstraction helps—and where it starts lying.',
		result:
			'The public repository now has a tagged release, downloadable artifacts, documented architecture, and code that a reviewer can inspect. Some surfaces are still evolving, so I would rather point to the implementation and release records than claim every platform or workflow is equally complete.',
		reflection:
			'OMG taught me that ambitious tooling becomes credible through boundaries, tests, release discipline, and accurate documentation—not through a longer feature list.',
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
				href: 'https://github.com/PyRo1121/omg',
				note: 'Rust source, tests, documentation, and commit history.'
			},
			{
				label: 'Current release',
				href: 'https://github.com/PyRo1121/omg/releases/latest',
				note: 'Tagged release and published platform artifacts.'
			},
			{
				label: 'Architecture notes',
				href: 'https://github.com/PyRo1121/omg/blob/main/docs/architecture.md',
				note: 'The current repository architecture and subsystem boundaries.'
			}
		]
	},
	{
		slug: 'weeknote',
		eyebrow: 'Case study · Weeknote',
		title: 'The story behind the contribution graph.',
		summary:
			'Weeknote is the live evidence dashboard behind this portfolio: a Svelte 5 application that connects engineering activity to delivery records, deployments, and the limits of the available evidence.',
		problem:
			'GitHub makes it easy to count commits and contribution squares. Those numbers do not explain what shipped, whether a check passed, which deployment is live, or when provider data is missing. I wanted a public record that could say “no evidence” instead of filling the gap with a score or a confident guess.',
		work: 'I built the interface in Svelte 5 and the server boundaries around Effect, GitHub APIs, Cloudflare Workers, D1, KV, and a Durable Object refresh coordinator. Public reads and owner-only records are separated, provider failures are isolated, and cached evidence is replaced only by a complete fresh snapshot.',
		difficulty:
			'The difficult work was deciding what the data was allowed to mean. A local merge is not automatically a pull request. A Worker deployment does not always have a Workers Build record. Browser sessions are not the same measurement as Cloudflare unique visitors. The application has to preserve those distinctions all the way into the labels people read.',
		result:
			'Weeknote now runs publicly on latham.cloud with exact project mappings, deployment evidence, cookieless visitor telemetry, protected owner records, scheduled warming, and tested failure boundaries. The same site also records contact actions without storing message content or visitor identity.',
		reflection:
			'Weeknote taught me that trustworthy software is often less about collecting more data and more about refusing to overstate the data you already have.',
		tools: ['TypeScript', 'Svelte 5', 'Effect', 'Cloudflare Workers', 'D1', 'Durable Objects'],
		evidence: [
			{
				label: 'Live dashboard',
				href: 'https://latham.cloud/evidence',
				note: 'The deployed public dashboard and current evidence.'
			},
			{
				label: 'Source repository',
				href: 'https://github.com/PyRo1121/Portfolio',
				note: 'Application source, tests, migrations, and deployment gate.'
			},
			{
				label: 'Engineering decisions',
				href: 'https://github.com/PyRo1121/Portfolio/tree/main/docs/adr',
				note: 'Architecture decision records for the important boundaries.'
			}
		]
	}
] as const satisfies ReadonlyArray<PublicCaseStudy>;

export const publicCaseStudyPaths = ['/work/omg', '/work/weeknote'] as const;

export function publicCaseStudyFor(slug: PublicCaseStudy['slug']): PublicCaseStudy {
	const study = PUBLIC_CASE_STUDIES.find((candidate) => candidate.slug === slug);
	if (study === undefined) {
		throw new Error(`Unknown public case study: ${slug}`);
	}
	return study;
}
