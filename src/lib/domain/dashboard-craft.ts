import type { CommitSignal, GitHubDashboardSnapshot } from './github-intelligence';

/** Commit-message categories inferred from conventional prefixes and plain-language verbs. */
export type CraftCategory = 'feature' | 'fix' | 'refactor' | 'test' | 'docs' | 'build' | 'other';

export type CraftCategorySignal = {
	readonly category: CraftCategory;
	readonly label: string;
	readonly commits: number;
	readonly share: number;
};

/** Observed and inferred engineering-quality signals for the rolling window. */
export type CraftIntelligence = {
	readonly observed: {
		readonly workflowPassRate: number | null;
		readonly successfulChecks: number;
		readonly failedChecks: number;
		readonly cancelledChecks: number;
		readonly reverts: number;
		readonly averageFilesPerCommit: number;
		readonly medianFilesPerCommit: number;
		readonly oversizedCommits: number;
		readonly focusedCommits: number;
	};
	readonly inferred: {
		readonly conventionalCommitShare: number;
		readonly categorizedCommitShare: number;
		readonly categories: ReadonlyArray<CraftCategorySignal>;
	};
	readonly unavailable: ReadonlyArray<string>;
};

const PREFIX_PATTERN =
	/^(feat|fix|refactor|test|docs|build|ci|chore|perf|style)(?:\([^)]*\))?[!:]/i;

function categoryFor(commit: CommitSignal): CraftCategory {
	const message = commit.message.trim().toLocaleLowerCase();
	if (/^(feat)(?:\([^)]*\))?[!:]|\b(add|introduce|implement|ship)\b/.test(message))
		return 'feature';
	if (/^(fix|perf)(?:\([^)]*\))?[!:]|\b(fix|repair|resolve|harden)\b/.test(message)) return 'fix';
	if (/^refactor(?:\([^)]*\))?[!:]|\brefactor|simplif|restructur/.test(message)) return 'refactor';
	if (/^test(?:\([^)]*\))?[!:]|\btest|spec|fixture/.test(message)) return 'test';
	if (/^docs?(?:\([^)]*\))?[!:]|\bdocs?|readme/.test(message)) return 'docs';
	if (/^(build|ci|chore)(?:\([^)]*\))?[!:]|\bbuild|release|dependenc/.test(message)) return 'build';
	return 'other';
}

function median(values: ReadonlyArray<number>): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
		: (sorted[middle] ?? 0);
}

/** Derive quality-adjacent signals while preserving observed/inferred boundaries. */
export function createCraftIntelligence(snapshot: GitHubDashboardSnapshot): CraftIntelligence {
	const commits = snapshot.intelligence.commits;
	const categoryCounts = new Map<CraftCategory, number>();
	for (const commit of commits) {
		const category = categoryFor(commit);
		categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
	}
	const labels: Readonly<Record<CraftCategory, string>> = {
		feature: 'Features',
		fix: 'Fixes',
		refactor: 'Refactors',
		test: 'Tests',
		docs: 'Docs',
		build: 'Build',
		other: 'Unclassified'
	};
	const categories = (Object.keys(labels) as CraftCategory[])
		.map((category) => ({
			category,
			label: labels[category],
			commits: categoryCounts.get(category) ?? 0,
			share: commits.length === 0 ? 0 : (categoryCounts.get(category) ?? 0) / commits.length
		}))
		.sort((left, right) => right.commits - left.commits);
	const conventionalCommits = commits.filter((commit) =>
		PREFIX_PATTERN.test(commit.message)
	).length;
	const categorizedCommits = commits.length - (categoryCounts.get('other') ?? 0);
	const fileCounts = commits.map((commit) => commit.changedFiles);
	const focusedCommits = commits.filter(
		(commit) => commit.changedFiles <= 8 && commit.additions + commit.deletions <= 500
	).length;
	const oversizedCommits = commits.filter(
		(commit) => commit.changedFiles > 25 || commit.additions + commit.deletions > 2_000
	).length;
	const reverts = commits.filter((commit) => /^revert\b/i.test(commit.message)).length;
	const workflow = snapshot.intelligence.delivery;

	return {
		observed: {
			workflowPassRate: workflow.workflowPassRate,
			successfulChecks: workflow.workflows.current.successful,
			failedChecks: workflow.workflows.current.failed,
			cancelledChecks: workflow.workflows.current.cancelled,
			reverts,
			averageFilesPerCommit:
				commits.length === 0
					? 0
					: Math.round(
							(fileCounts.reduce((total, value) => total + value, 0) / commits.length) * 10
						) / 10,
			medianFilesPerCommit: median(fileCounts),
			oversizedCommits,
			focusedCommits
		},
		inferred: {
			conventionalCommitShare:
				commits.length === 0 ? 0 : Math.round((conventionalCommits / commits.length) * 100),
			categorizedCommitShare:
				commits.length === 0 ? 0 : Math.round((categorizedCommits / commits.length) * 100),
			categories
		},
		unavailable: [
			'Code coverage — no consistent coverage artifact exposed',
			'Code scanning — unavailable or disabled on active repositories',
			'Lint/typecheck results — not normalized across workflows'
		]
	};
}
