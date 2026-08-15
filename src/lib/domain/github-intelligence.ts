import {
	addZonedDays,
	COLLECTION_TIME_ZONE,
	zonedDateKey,
	zonedHour,
	zonedWeekday
} from './dashboard-time';
import type { DailyActivity, RepositorySignal, WeeklySnapshot, WeeklyTotals } from './github-stats';

const DAY_IN_MS = 86_400_000;
const DAYS_IN_WEEK = 7;

/** A language slice aggregated across owned repositories. */
export type LanguageSignal = {
	readonly name: string;
	readonly color: string;
	readonly bytes: number;
	readonly share: number;
	readonly width: string;
};

/** One commit available to the authenticated dashboard. */
export type CommitSignal = {
	readonly sha: string;
	readonly shortSha: string;
	readonly message: string;
	readonly committedAt: string;
	readonly repository: string;
	readonly repositoryUrl: string;
	readonly url: string;
	readonly isPrivate: boolean;
	readonly additions: number;
	readonly deletions: number;
	readonly changedFiles: number;
};

/** Repository metadata and current-week engineering activity. */
export type RepositoryIntelligence = {
	readonly name: string;
	readonly fullName: string;
	readonly url: string;
	readonly description: string;
	readonly isPrivate: boolean;
	readonly isFork: boolean;
	readonly isArchived: boolean;
	readonly imageUrl: string;
	readonly primaryLanguage: string;
	readonly languageColor: string;
	readonly stars: number;
	readonly forks: number;
	readonly diskUsageKb: number;
	readonly openIssues: number;
	readonly openPullRequests: number;
	readonly defaultBranch: string | null;
	readonly commits: number;
	readonly previousCommits: number;
	readonly additions: number;
	readonly deletions: number;
	readonly changedFiles: number;
	readonly pushedAt: string | null;
	readonly createdAt: string;
	readonly activityShare: number;
	readonly activityWidth: string;
};

/** One date in the authenticated contribution calendar. */
export type ContributionDay = {
	readonly date: string;
	readonly count: number;
	readonly level: 0 | 1 | 2 | 3 | 4;
};

/** Commit mass for one day in the current week. */
export type EngineeringDay = {
	readonly date: string;
	readonly label: string;
	readonly longLabel: string;
	readonly commits: number;
	readonly additions: number;
	readonly deletions: number;
	readonly totalChanges: number;
	readonly height: string;
};

/** Commit count for one projected wall-clock hour. */
export type HourlySignal = {
	readonly hour: number;
	readonly label: string;
	readonly commits: number;
	readonly height: string;
};

/** A recent issue or pull-request signal. */
export type CollaborationItem = {
	readonly kind: 'Issue' | 'PullRequest';
	readonly title: string;
	readonly number: number;
	readonly url: string;
	readonly repository: string;
	readonly isPrivate: boolean;
	readonly state: string;
	readonly createdAt: string;
	readonly mergedAt: string | null;
	readonly additions: number;
	readonly deletions: number;
	readonly changedFiles: number;
	readonly comments: number;
	readonly reviews: number;
};

/** Raw commit data accepted by the dashboard projection. */
export type CommitIntelligenceInput = {
	readonly sha: string;
	readonly message: string;
	readonly committedAt: Date;
	readonly url: string;
	readonly additions: number;
	readonly deletions: number;
	readonly changedFiles: number | null;
};

/** Raw language data accepted by the dashboard projection. */
export type LanguageIntelligenceInput = {
	readonly name: string;
	readonly color: string | null;
	readonly bytes: number;
};

/** Raw repository data accepted by the dashboard projection. */
export type RepositoryIntelligenceInput = {
	readonly name: string;
	readonly fullName: string;
	readonly url: string;
	readonly description: string | null;
	readonly isPrivate: boolean;
	readonly isFork: boolean;
	readonly isArchived: boolean;
	readonly imageUrl: string;
	readonly createdAt: Date;
	readonly pushedAt: Date | null;
	readonly primaryLanguage: string | null;
	readonly primaryLanguageColor: string | null;
	readonly languages: ReadonlyArray<LanguageIntelligenceInput>;
	readonly stars: number;
	readonly forks: number;
	readonly diskUsageKb: number;
	readonly openIssues: number;
	readonly openPullRequests: number;
	readonly defaultBranch: string | null;
	readonly previousCommits: number;
	readonly commits: ReadonlyArray<CommitIntelligenceInput>;
};

/** Raw contribution-calendar day accepted by the dashboard projection. */
export type ContributionDayInput = {
	readonly date: string;
	readonly count: number;
};

/** Raw collaboration item accepted by the dashboard projection. */
export type CollaborationItemInput = CollaborationItem;

/** A merged pull request or closed issue that produced a concrete outcome. */
export type DeliveryOutcomeInput = {
	readonly kind: 'PullRequest' | 'Issue';
	readonly title: string;
	readonly number: number;
	readonly repository: string;
	readonly url: string;
	readonly occurredAt: string;
	readonly isPrivate: boolean;
};

/** A published GitHub release in the rolling window. */
export type ReleaseInput = {
	readonly name: string;
	readonly tagName: string;
	readonly repository: string;
	readonly url: string;
	readonly createdAt: string;
	readonly publishedAt: string | null;
	readonly isPrerelease: boolean;
};

/** One GitHub Actions run retained as evidence for delivery health. */
export type WorkflowRunInput = {
	readonly id: number;
	readonly name: string;
	readonly title: string;
	readonly repository: string;
	readonly url: string;
	readonly event: string;
	readonly status: string;
	readonly conclusion: string | null;
	readonly branch: string | null;
	readonly createdAt: string;
};

/** One bounded check-run annotation linked to its exact workflow job and run. */
export type WorkflowCheckAnnotationInput = {
	readonly runId: number;
	readonly runTitle: string;
	readonly runUrl: string;
	readonly repository: string;
	readonly jobName: string;
	readonly jobUrl: string;
	readonly level: 'notice' | 'warning' | 'failure';
	readonly path: string;
	readonly startLine: number;
	readonly endLine: number;
	readonly title: string;
	readonly message: string;
	readonly messageTruncated: boolean;
};

/** Collection state for bounded annotations from recent failed workflow runs. */
export type WorkflowAnnotationCoverageInput = {
	readonly state: 'Observed' | 'Unavailable';
	readonly targetedRuns: number;
	readonly evidence: ReadonlyArray<WorkflowCheckAnnotationInput>;
	readonly truncated: boolean;
	readonly detail: string;
};

/** Exact workflow totals for one repository and time window. */
export type RepositoryWorkflowSummaryInput = {
	readonly repository: string;
	readonly total: number;
	readonly successful: number;
	readonly failed: number;
	readonly cancelled: number;
	readonly other: number;
};

/** Bounded Actions coverage collected from active repositories. */
export type WorkflowCoverageInput = {
	readonly coveredRepositories: number;
	readonly totalRepositories: number;
	readonly unavailableRepositories: ReadonlyArray<string>;
	readonly truncated: boolean;
	readonly current: {
		readonly total: number;
		readonly successful: number;
		readonly failed: number;
		readonly cancelled: number;
		readonly other: number;
		readonly repositories: ReadonlyArray<RepositoryWorkflowSummaryInput>;
		readonly recent: ReadonlyArray<WorkflowRunInput>;
		readonly annotations: WorkflowAnnotationCoverageInput;
	};
	readonly previous: {
		readonly total: number;
		readonly successful: number;
		readonly failed: number;
		readonly cancelled: number;
		readonly other: number;
	};
};

/** Inputs required to build authenticated GitHub intelligence. */
export type GitHubIntelligenceInput = {
	readonly repositories: ReadonlyArray<RepositoryIntelligenceInput>;
	readonly repositoryCollection: {
		readonly totalRepositories: number;
		readonly privateRepositories: number;
		readonly publicRepositories: number;
		readonly freshRepositories: number;
		readonly staleRepositories: ReadonlyArray<{
			readonly repository: string;
			readonly cachedAt: string;
		}>;
		readonly graphQLCost: number;
		readonly successfulGraphQLRequests: number;
	};
	readonly contributionDays: ReadonlyArray<ContributionDayInput>;
	readonly totalYearContributions: number;
	readonly restrictedWeekContributions: number;
	readonly previousWeekContributions: number;
	readonly collaboration: {
		readonly authoredPullRequests: number;
		readonly mergedPullRequests: number;
		readonly reviewedPullRequests: number;
		readonly authoredIssues: number;
		readonly commentedItems: number;
		readonly items: ReadonlyArray<CollaborationItemInput>;
	};
	readonly delivery: {
		readonly mergedPullRequests: number;
		readonly closedIssues: number;
		readonly previousMergedPullRequests: number;
		readonly previousClosedIssues: number;
		readonly outcomes: ReadonlyArray<DeliveryOutcomeInput>;
		readonly releases: ReadonlyArray<ReleaseInput>;
		readonly previousReleaseCount: number;
		readonly workflows: WorkflowCoverageInput;
	};
	readonly rateLimit: {
		readonly remaining: number;
		readonly limit: number;
		readonly resetAt: string;
	};
};

/** Authenticated account and repository inventory. */
export type AccountIntelligence = {
	readonly ownedRepositories: number;
	readonly privateRepositories: number;
	readonly publicRepositories: number;
	readonly activeRepositories: number;
	readonly totalStars: number;
	readonly totalForks: number;
	readonly totalDiskUsageKb: number;
	readonly openIssues: number;
	readonly openPullRequests: number;
};

/** Transparency contract for incremental repository collection. */
export type RepositoryCollectionEvidence = {
	readonly state: 'Observed' | 'Unavailable';
	readonly totalRepositories: number;
	readonly freshRepositories: number;
	readonly staleRepositories: ReadonlyArray<string>;
	readonly oldestStaleAt: string | null;
	readonly graphQL: {
		readonly state: 'Measured' | 'Unavailable';
		readonly points: number;
		readonly successfulRequests: number;
		readonly detail: string;
	};
	readonly detail: string;
};

/** Current week compared with the preceding week. */
export type WeekComparison = {
	readonly currentCommits: number;
	readonly previousCommits: number;
	readonly commitDelta: number;
	readonly changePercent: number | null;
	readonly direction: 'up' | 'down' | 'flat';
	readonly label: string;
};

/** Longer-horizon contribution behavior. */
export type YearIntelligence = {
	readonly totalContributions: number;
	readonly activeDays: number;
	readonly currentStreak: number;
	readonly longestStreak: number;
	readonly busiestDay: ContributionDay | null;
	readonly averagePerActiveDay: number;
	readonly days: ReadonlyArray<ContributionDay>;
};

/** One linked piece of evidence rendered in the delivery trail. */
export type DeliveryArtifact = {
	readonly kind: 'PullRequest' | 'Issue' | 'Release' | 'WorkflowRun';
	readonly title: string;
	readonly repository: string;
	readonly url: string;
	readonly occurredAt: string;
	readonly status: 'shipped' | 'passed' | 'failed' | 'cancelled' | 'running';
	readonly detail: string;
};

/** Transparent outcome and verification metrics for the rolling window. */
export type DeliveryIntelligence = {
	readonly mergedPullRequests: number;
	readonly closedIssues: number;
	readonly releases: number;
	readonly prereleaseBuilds: number;
	readonly outcomes: number;
	readonly previousOutcomes: number;
	readonly outcomeDelta: number;
	readonly workflowPassRate: number | null;
	readonly score: number;
	readonly scoreBreakdown: {
		readonly outcomes: number;
		readonly verification: number;
		readonly coverage: number;
	};
	readonly label: string;
	readonly message: string;
	readonly artifacts: ReadonlyArray<DeliveryArtifact>;
	readonly workflows: WorkflowCoverageInput;
};

/** Authenticated activity and collaboration metrics shown by the dashboard. */
export type GitHubIntelligence = {
	readonly account: AccountIntelligence;
	readonly repositoryCollection: RepositoryCollectionEvidence;
	readonly comparison: WeekComparison;
	readonly year: YearIntelligence;
	readonly restrictedWeekContributions: number;
	readonly languages: ReadonlyArray<LanguageSignal>;
	readonly repositories: ReadonlyArray<RepositoryIntelligence>;
	readonly commits: ReadonlyArray<CommitSignal>;
	readonly engineeringDays: ReadonlyArray<EngineeringDay>;
	readonly hourlyActivity: ReadonlyArray<HourlySignal>;
	readonly peakHour: string;
	readonly weekendCommitShare: number;
	readonly collaboration: GitHubIntelligenceInput['collaboration'];
	readonly delivery: DeliveryIntelligence;
	readonly rateLimit: GitHubIntelligenceInput['rateLimit'];
};

/** Complete dashboard snapshot with private-repository intelligence when authorized. */
export type GitHubDashboardSnapshot = WeeklySnapshot & {
	readonly intelligence: GitHubIntelligence;
};

function sum(values: ReadonlyArray<number>): number {
	return values.reduce((total, value) => total + value, 0);
}

function formatHour(hour: number): string {
	const suffix = hour >= 12 ? 'PM' : 'AM';
	return `${hour % 12 || 12}:00 ${suffix}`;
}

function compareWeeks(current: number, previous: number): WeekComparison {
	const commitDelta = current - previous;
	const direction = commitDelta > 0 ? 'up' : commitDelta < 0 ? 'down' : 'flat';
	const changePercent = previous === 0 ? null : Math.round((commitDelta / previous) * 100);
	const label =
		previous === 0
			? current === 0
				? 'No default-branch commits in either week'
				: 'Activity started from a quiet prior week'
			: `${Math.abs(changePercent ?? 0)}% ${direction === 'up' ? 'ahead of' : direction === 'down' ? 'behind' : 'level with'} last week`;
	return {
		currentCommits: current,
		previousCommits: previous,
		commitDelta,
		changePercent,
		direction,
		label
	};
}

function buildLanguages(
	repositories: ReadonlyArray<RepositoryIntelligenceInput>
): ReadonlyArray<LanguageSignal> {
	const languages = new Map<string, { color: string; bytes: number }>();
	for (const repository of repositories) {
		for (const language of repository.languages) {
			const current = languages.get(language.name) ?? {
				color: language.color ?? '#8d8a80',
				bytes: 0
			};
			current.bytes += language.bytes;
			languages.set(language.name, current);
		}
	}
	const ranked = [...languages.entries()]
		.map(([name, value]) => ({ name, ...value }))
		.sort((left, right) => right.bytes - left.bytes);
	const totalBytes = Math.max(1, sum(ranked.map((language) => language.bytes)));
	return ranked.slice(0, 8).map((language) => {
		const share = language.bytes / totalBytes;
		return {
			...language,
			share,
			width: `${Math.max(1.5, share * 100)}%`
		};
	});
}

function buildRepositories(
	repositories: ReadonlyArray<RepositoryIntelligenceInput>,
	totalCommits: number
): ReadonlyArray<RepositoryIntelligence> {
	return repositories
		.map((repository) => {
			const commits = repository.commits.length;
			const activityShare = totalCommits === 0 ? 0 : commits / totalCommits;
			return {
				name: repository.name,
				fullName: repository.fullName,
				url: repository.url,
				description: repository.description ?? 'No repository description.',
				isPrivate: repository.isPrivate,
				isFork: repository.isFork,
				isArchived: repository.isArchived,
				imageUrl: repository.imageUrl,
				primaryLanguage: repository.primaryLanguage ?? 'Unclassified',
				languageColor: repository.primaryLanguageColor ?? '#8d8a80',
				stars: repository.stars,
				forks: repository.forks,
				diskUsageKb: repository.diskUsageKb,
				openIssues: repository.openIssues,
				openPullRequests: repository.openPullRequests,
				defaultBranch: repository.defaultBranch,
				commits,
				previousCommits: repository.previousCommits,
				additions: sum(repository.commits.map((commit) => commit.additions)),
				deletions: sum(repository.commits.map((commit) => commit.deletions)),
				changedFiles: sum(repository.commits.map((commit) => commit.changedFiles ?? 0)),
				pushedAt: repository.pushedAt?.toISOString() ?? null,
				createdAt: repository.createdAt.toISOString(),
				activityShare,
				activityWidth: `${Math.max(commits > 0 ? 4 : 0, activityShare * 100)}%`
			};
		})
		.sort(
			(left, right) =>
				right.commits - left.commits ||
				(right.pushedAt ?? '').localeCompare(left.pushedAt ?? '') ||
				left.name.localeCompare(right.name)
		);
}

function buildCommitSignals(
	repositories: ReadonlyArray<RepositoryIntelligenceInput>
): ReadonlyArray<CommitSignal> {
	return repositories
		.flatMap((repository) =>
			repository.commits.map((commit) => ({
				sha: commit.sha,
				shortSha: commit.sha.slice(0, 7),
				message: commit.message,
				committedAt: commit.committedAt.toISOString(),
				repository: repository.fullName,
				repositoryUrl: repository.url,
				url: commit.url,
				isPrivate: repository.isPrivate,
				additions: commit.additions,
				deletions: commit.deletions,
				changedFiles: commit.changedFiles ?? 0
			}))
		)
		.sort((left, right) => right.committedAt.localeCompare(left.committedAt));
}

function buildEngineeringDays(
	weekStartIso: string,
	commits: ReadonlyArray<CommitSignal>
): ReadonlyArray<EngineeringDay> {
	const weekStart = new Date(weekStartIso);
	const formatter = new Intl.DateTimeFormat('en', {
		weekday: 'short',
		timeZone: COLLECTION_TIME_ZONE
	});
	const longFormatter = new Intl.DateTimeFormat('en', {
		weekday: 'long',
		timeZone: COLLECTION_TIME_ZONE
	});
	const raw = Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
		const date = addZonedDays(weekStart, index, COLLECTION_TIME_ZONE);
		const key = zonedDateKey(date, COLLECTION_TIME_ZONE);
		const daily = commits.filter(
			(commit) => zonedDateKey(new Date(commit.committedAt), COLLECTION_TIME_ZONE) === key
		);
		const additions = sum(daily.map((commit) => commit.additions));
		const deletions = sum(daily.map((commit) => commit.deletions));
		return {
			date: key,
			label: formatter.format(date).toUpperCase(),
			longLabel: longFormatter.format(date),
			commits: daily.length,
			additions,
			deletions,
			totalChanges: additions + deletions
		};
	});
	const maximum = Math.max(1, ...raw.map((day) => day.commits));
	return raw.map((day) => ({
		...day,
		height: `${Math.max(day.commits > 0 ? 7 : 2, (day.commits / maximum) * 100)}%`
	}));
}

function buildHourlyActivity(commits: ReadonlyArray<CommitSignal>): ReadonlyArray<HourlySignal> {
	const counts = Array.from({ length: 24 }, () => 0);
	for (const commit of commits) {
		const hour = zonedHour(new Date(commit.committedAt), COLLECTION_TIME_ZONE);
		counts[hour] = (counts[hour] ?? 0) + 1;
	}
	const maximum = Math.max(1, ...counts);
	return counts.map((commitCount, hour) => ({
		hour,
		label: formatHour(hour),
		commits: commitCount,
		height: `${Math.max(commitCount > 0 ? 8 : 2, (commitCount / maximum) * 100)}%`
	}));
}

function contributionLevel(count: number, maximum: number): 0 | 1 | 2 | 3 | 4 {
	if (count === 0) return 0;
	const ratio = count / Math.max(1, maximum);
	if (ratio <= 0.25) return 1;
	if (ratio <= 0.5) return 2;
	if (ratio <= 0.75) return 3;
	return 4;
}

function countStreaks(days: ReadonlyArray<ContributionDay>): {
	readonly current: number;
	readonly longest: number;
} {
	let run = 0;
	let longest = 0;
	for (const day of days) {
		run = day.count > 0 ? run + 1 : 0;
		longest = Math.max(longest, run);
	}
	let cursor = days.length - 1;
	if (cursor >= 0 && days[cursor]?.count === 0) cursor -= 1;
	let current = 0;
	while (cursor >= 0 && (days[cursor]?.count ?? 0) > 0) {
		current += 1;
		cursor -= 1;
	}
	return { current, longest };
}

function buildYearIntelligence(
	inputDays: ReadonlyArray<ContributionDayInput>,
	totalContributions: number
): YearIntelligence {
	const maximum = Math.max(1, ...inputDays.map((day) => day.count));
	const days = inputDays
		.map((day) => ({ ...day, level: contributionLevel(day.count, maximum) }))
		.sort((left, right) => left.date.localeCompare(right.date));
	const activeDays = days.filter((day) => day.count > 0).length;
	const streaks = countStreaks(days);
	const busiestDay = [...days].sort(
		(left, right) => right.count - left.count || right.date.localeCompare(left.date)
	)[0];
	return {
		totalContributions,
		activeDays,
		currentStreak: streaks.current,
		longestStreak: streaks.longest,
		busiestDay: busiestDay && busiestDay.count > 0 ? busiestDay : null,
		averagePerActiveDay: activeDays === 0 ? 0 : totalContributions / activeDays,
		days
	};
}

function buildRepositorySignals(
	repositories: ReadonlyArray<RepositoryIntelligence>
): ReadonlyArray<RepositorySignal> {
	return repositories
		.filter((repository) => repository.commits > 0)
		.slice(0, 4)
		.map((repository) => ({
			name: repository.name,
			fullName: repository.fullName,
			url: repository.url,
			language: repository.primaryLanguage,
			stars: repository.stars,
			commits: repository.commits,
			events: repository.commits,
			score: repository.commits,
			signalWidth: repository.activityWidth
		}));
}

function buildDailyActivity(days: ReadonlyArray<EngineeringDay>): ReadonlyArray<DailyActivity> {
	const maximum = Math.max(1, ...days.map((day) => day.commits));
	return days.map((day) => ({
		label: day.label.slice(0, 2),
		longLabel: day.longLabel,
		activity: day.commits,
		commits: day.commits,
		barHeight: day.height,
		intensity: day.commits / maximum
	}));
}

function artifactStatus(run: WorkflowRunInput): DeliveryArtifact['status'] {
	if (run.status !== 'completed') return 'running';
	if (run.conclusion === 'success') return 'passed';
	if (run.conclusion === 'cancelled') return 'cancelled';
	return 'failed';
}

function buildDelivery(input: GitHubIntelligenceInput['delivery']): DeliveryIntelligence {
	const releases = input.releases.filter((release) => !release.isPrerelease).length;
	const prereleaseBuilds = input.releases.filter((release) => release.isPrerelease).length;
	const outcomes = input.mergedPullRequests + input.closedIssues + releases + prereleaseBuilds;
	const previousOutcomes =
		input.previousMergedPullRequests + input.previousClosedIssues + input.previousReleaseCount;
	const completedRuns = input.workflows.current.successful + input.workflows.current.failed;
	const workflowPassRate =
		completedRuns === 0
			? null
			: Math.round((input.workflows.current.successful / completedRuns) * 100);
	const outcomeScore = Math.min(
		input.mergedPullRequests * 14 + input.closedIssues * 10 + releases * 16 + prereleaseBuilds * 3,
		56
	);
	const verificationScore = workflowPassRate === null ? 0 : Math.round(workflowPassRate * 0.34);
	const breadthScore = Math.min(input.workflows.coveredRepositories * 3, 10);
	const score = Math.min(100, outcomeScore + verificationScore + breadthScore);
	const label =
		outcomes === 0
			? 'No completed outcomes'
			: workflowPassRate !== null && workflowPassRate < 75
				? 'Workflow failures present'
				: score >= 85
					? 'Strong outcome and check coverage'
					: score >= 60
						? 'Completed outcomes present'
						: 'Limited outcome coverage';
	const outcomeLabel = outcomes === 1 ? 'completed outcome' : 'completed outcomes';
	const message =
		outcomes === 0
			? 'No merged pull requests, closed issues, releases, or prereleases in this seven-day window.'
			: workflowPassRate === null
				? `${outcomes} ${outcomeLabel}. Workflow data was unavailable for active repositories.`
				: input.workflows.current.failed > 0
					? `${outcomes} ${outcomeLabel}. ${input.workflows.current.successful} checks passed and ${input.workflows.current.failed} failed.`
					: `${outcomes} ${outcomeLabel} with every completed check passing.`;
	const outcomeArtifacts: DeliveryArtifact[] = input.outcomes.map((outcome) => ({
		kind: outcome.kind,
		title: outcome.title,
		repository: outcome.repository,
		url: outcome.url,
		occurredAt: outcome.occurredAt,
		status: 'shipped',
		detail: `${outcome.kind === 'PullRequest' ? 'PR' : 'Issue'} #${outcome.number}`
	}));
	const releaseArtifacts: DeliveryArtifact[] = input.releases.map((release) => ({
		kind: 'Release',
		title: release.name,
		repository: release.repository,
		url: release.url,
		occurredAt: release.publishedAt ?? release.createdAt,
		status: 'shipped',
		detail: `${release.tagName}${release.isPrerelease ? ' · prerelease' : ''}`
	}));
	const workflowArtifacts: DeliveryArtifact[] = input.workflows.current.recent.map((run) => ({
		kind: 'WorkflowRun',
		title: run.title || run.name,
		repository: run.repository,
		url: run.url,
		occurredAt: run.createdAt,
		status: artifactStatus(run),
		detail: `${run.name} · ${run.branch ?? run.event}`
	}));
	return {
		mergedPullRequests: input.mergedPullRequests,
		closedIssues: input.closedIssues,
		releases,
		prereleaseBuilds,
		outcomes,
		previousOutcomes,
		outcomeDelta: outcomes - previousOutcomes,
		workflowPassRate,
		score,
		scoreBreakdown: {
			outcomes: outcomeScore,
			verification: verificationScore,
			coverage: breadthScore
		},
		label,
		message,
		artifacts: [
			...outcomeArtifacts
				.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
				.slice(0, 2),
			...releaseArtifacts
				.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
				.slice(0, 2),
			...workflowArtifacts.slice(0, 4)
		],
		workflows: input.workflows
	};
}

function buildTotals(
	base: WeeklyTotals,
	repositories: ReadonlyArray<RepositoryIntelligence>,
	collaboration: GitHubIntelligenceInput['collaboration'],
	weekStart: string,
	weekEnd: string
): WeeklyTotals {
	const commits = sum(repositories.map((repository) => repository.commits));
	const additions = sum(repositories.map((repository) => repository.additions));
	const deletions = sum(repositories.map((repository) => repository.deletions));
	return {
		...base,
		commits,
		additions,
		deletions,
		churn: additions + deletions,
		repositoriesCreated: repositories.filter(
			(repository) => repository.createdAt >= weekStart && repository.createdAt < weekEnd
		).length,
		pullRequestsOpened: collaboration.authoredPullRequests,
		pullRequestsMerged: collaboration.mergedPullRequests,
		issuesClosed: base.issuesClosed,
		comments: collaboration.commentedItems
	};
}

function buildRepositoryCollectionEvidence(
	collection: GitHubIntelligenceInput['repositoryCollection']
): RepositoryCollectionEvidence {
	const isCurrent =
		collection.freshRepositories === collection.totalRepositories &&
		collection.staleRepositories.length === 0;
	const oldestStaleAt = collection.staleRepositories.reduce<string | null>(
		(oldest, repository) =>
			oldest === null || repository.cachedAt < oldest ? repository.cachedAt : oldest,
		null
	);
	let detail = 'Repository collection is unavailable for this snapshot.';
	if (isCurrent) {
		detail = `All ${collection.totalRepositories} repository slices refreshed for the canonical window.`;
	} else if (collection.staleRepositories.length > 0) {
		detail = `${collection.freshRepositories} repository slices refreshed; ${collection.staleRepositories.length} retained same-window last-known-good evidence.`;
	}
	const graphQLState = isCurrent ? 'Measured' : 'Unavailable';
	const costQualifier = isCurrent ? '' : ' known';
	const costLimitation = isCurrent ? '' : ' Failed request cost was not returned.';
	return {
		state: isCurrent ? 'Observed' : 'Unavailable',
		totalRepositories: collection.totalRepositories,
		freshRepositories: collection.freshRepositories,
		staleRepositories: collection.staleRepositories.map((repository) => repository.repository),
		oldestStaleAt,
		graphQL: {
			state: graphQLState,
			points: collection.graphQLCost,
			successfulRequests: collection.successfulGraphQLRequests,
			detail: `${collection.graphQLCost}${costQualifier} GraphQL points across ${collection.successfulGraphQLRequests} successful requests.${costLimitation}`
		},
		detail
	};
}

/** Merge authenticated repository intelligence into a weekly snapshot. */
export function createGitHubDashboardSnapshot(
	base: WeeklySnapshot,
	input: GitHubIntelligenceInput
): GitHubDashboardSnapshot {
	const commits = buildCommitSignals(input.repositories);
	const repositoryIntelligence = buildRepositories(input.repositories, commits.length);
	const engineeringDays = buildEngineeringDays(base.period.startIso, commits);
	const hourlyActivity = buildHourlyActivity(commits);
	const peak = [...hourlyActivity].sort(
		(left, right) => right.commits - left.commits || left.hour - right.hour
	)[0];
	const weekendCommits = commits.filter((commit) => {
		const day = zonedWeekday(new Date(commit.committedAt), COLLECTION_TIME_ZONE);
		return day === 0 || day === 6;
	}).length;
	const previousCommits = sum(
		repositoryIntelligence.map((repository) => repository.previousCommits)
	);
	const intelligence: GitHubIntelligence = {
		account: {
			ownedRepositories: input.repositoryCollection.totalRepositories,
			privateRepositories: input.repositoryCollection.privateRepositories,
			publicRepositories: input.repositoryCollection.publicRepositories,
			activeRepositories: repositoryIntelligence.filter((repository) => repository.commits > 0)
				.length,
			totalStars: sum(repositoryIntelligence.map((repository) => repository.stars)),
			totalForks: sum(repositoryIntelligence.map((repository) => repository.forks)),
			totalDiskUsageKb: sum(repositoryIntelligence.map((repository) => repository.diskUsageKb)),
			openIssues: sum(repositoryIntelligence.map((repository) => repository.openIssues)),
			openPullRequests: sum(repositoryIntelligence.map((repository) => repository.openPullRequests))
		},
		repositoryCollection: buildRepositoryCollectionEvidence(input.repositoryCollection),
		comparison: compareWeeks(commits.length, previousCommits),
		year: buildYearIntelligence(input.contributionDays, input.totalYearContributions),
		restrictedWeekContributions: input.restrictedWeekContributions,
		languages: buildLanguages(input.repositories),
		repositories: repositoryIntelligence,
		commits,
		engineeringDays,
		hourlyActivity,
		peakHour: peak && peak.commits > 0 ? peak.label : 'No commit hour yet',
		weekendCommitShare:
			commits.length === 0 ? 0 : Math.round((weekendCommits / commits.length) * 100),
		collaboration: input.collaboration,
		delivery: buildDelivery(input.delivery),
		rateLimit: input.rateLimit
	};
	return {
		...base,
		totals: buildTotals(
			base.totals,
			repositoryIntelligence,
			input.collaboration,
			base.period.startIso,
			base.period.endIso
		),
		coverage: { measuredPushes: commits.length, totalPushes: commits.length },
		dailyActivity: buildDailyActivity(engineeringDays),
		topRepositories: buildRepositorySignals(repositoryIntelligence),
		intelligence
	};
}

/** Build complete sample intelligence for an explicitly labeled demo snapshot. */
export function createDemoIntelligence(base: WeeklySnapshot): GitHubDashboardSnapshot {
	const start = new Date(base.period.startIso);
	const demoRepositories: ReadonlyArray<RepositoryIntelligenceInput> = [
		{
			name: 'signal-garden',
			fullName: `${base.profile.login}/signal-garden`,
			url: base.profile.profileUrl,
			description: 'A private event-processing experiment.',
			isPrivate: true,
			isFork: false,
			isArchived: false,
			imageUrl: base.profile.avatarUrl,
			createdAt: new Date(start.getTime() - 80 * DAY_IN_MS),
			pushedAt: new Date(start.getTime() + 4 * DAY_IN_MS),
			primaryLanguage: 'TypeScript',
			primaryLanguageColor: '#3178c6',
			languages: [
				{ name: 'TypeScript', color: '#3178c6', bytes: 780_000 },
				{ name: 'Svelte', color: '#ff3e00', bytes: 260_000 }
			],
			stars: 0,
			forks: 0,
			diskUsageKb: 42_000,
			openIssues: 3,
			openPullRequests: 1,
			defaultBranch: 'main',
			previousCommits: 17,
			commits: Array.from({ length: 28 }, (_, index) => ({
				sha: `demo${String(index).padStart(36, '0')}`,
				message:
					['Tighten ingestion boundary', 'Add weekly comparison', 'Polish repository explorer'][
						index % 3
					] ?? 'Refine signal',
				committedAt: new Date(start.getTime() + (index % 6) * DAY_IN_MS + (index % 18) * 3_600_000),
				url: base.profile.profileUrl,
				additions: 22 + index * 3,
				deletions: 7 + index,
				changedFiles: 1 + (index % 7)
			}))
		},
		{
			name: 'weeknote',
			fullName: `${base.profile.login}/weeknote`,
			url: base.profile.profileUrl,
			description: 'A public notebook for shipped work.',
			isPrivate: false,
			isFork: false,
			isArchived: false,
			imageUrl: base.profile.avatarUrl,
			createdAt: new Date(start.getTime() - 20 * DAY_IN_MS),
			pushedAt: new Date(start.getTime() + 2 * DAY_IN_MS),
			primaryLanguage: 'Svelte',
			primaryLanguageColor: '#ff3e00',
			languages: [
				{ name: 'Svelte', color: '#ff3e00', bytes: 410_000 },
				{ name: 'CSS', color: '#663399', bytes: 190_000 }
			],
			stars: 8,
			forks: 2,
			diskUsageKb: 18_000,
			openIssues: 1,
			openPullRequests: 0,
			defaultBranch: 'main',
			previousCommits: 8,
			commits: Array.from({ length: 11 }, (_, index) => ({
				sha: `sample${String(index).padStart(34, '0')}`,
				message: 'Publish another useful note',
				committedAt: new Date(start.getTime() + (index % 5) * DAY_IN_MS + 20 * 3_600_000),
				url: base.profile.profileUrl,
				additions: 18 + index,
				deletions: 4 + index,
				changedFiles: 2
			}))
		}
	];
	const contributionDays = Array.from({ length: 84 }, (_, index) => {
		const date = new Date(start.getTime() - (83 - index) * DAY_IN_MS);
		return { date: date.toISOString().slice(0, 10), count: (index * 7 + (index % 5)) % 13 };
	});
	return createGitHubDashboardSnapshot(base, {
		repositories: demoRepositories,
		repositoryCollection: {
			totalRepositories: demoRepositories.length,
			privateRepositories: demoRepositories.filter((repository) => repository.isPrivate).length,
			publicRepositories: demoRepositories.filter((repository) => !repository.isPrivate).length,
			freshRepositories: 0,
			staleRepositories: [],
			graphQLCost: 0,
			successfulGraphQLRequests: 0
		},
		contributionDays,
		totalYearContributions: 864,
		restrictedWeekContributions: 28,
		previousWeekContributions: 25,
		collaboration: {
			authoredPullRequests: 4,
			mergedPullRequests: 3,
			reviewedPullRequests: 6,
			authoredIssues: 2,
			commentedItems: 9,
			items: []
		},
		delivery: {
			mergedPullRequests: 2,
			closedIssues: 1,
			previousMergedPullRequests: 1,
			previousClosedIssues: 1,
			outcomes: [
				{
					kind: 'PullRequest',
					title: 'Ship private signal projection',
					number: 42,
					repository: `${base.profile.login}/signal-garden`,
					url: base.profile.profileUrl,
					occurredAt: new Date(start.getTime() + 5 * DAY_IN_MS).toISOString(),
					isPrivate: true
				}
			],
			releases: [],
			previousReleaseCount: 0,
			workflows: {
				coveredRepositories: 2,
				totalRepositories: 2,
				unavailableRepositories: [],
				truncated: false,
				current: {
					total: 8,
					successful: 7,
					failed: 1,
					cancelled: 0,
					other: 0,
					repositories: [
						{
							repository: `${base.profile.login}/signal-garden`,
							total: 5,
							successful: 4,
							failed: 1,
							cancelled: 0,
							other: 0
						}
					],
					recent: [],
					annotations: {
						state: 'Unavailable',
						targetedRuns: 0,
						evidence: [],
						truncated: false,
						detail: 'Check-run annotations are unavailable in demo evidence.'
					}
				},
				previous: { total: 5, successful: 4, failed: 1, cancelled: 0, other: 0 }
			}
		},
		rateLimit: { remaining: 4_921, limit: 5_000, resetAt: base.generatedAt }
	});
}
