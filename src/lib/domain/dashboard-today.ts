import { zonedHour } from './dashboard-time';
import { commitsForViewerDate, type ViewerActivityProjection } from './dashboard-viewer-time';
import type { CommitSignal, GitHubDashboardSnapshot } from './github-intelligence';

/** One repository receiving authored commits today. */
type TodayRepositorySignal = {
	readonly name: string;
	readonly fullName: string;
	readonly commits: number;
	readonly additions: number;
	readonly deletions: number;
	readonly changedFiles: number;
	readonly share: number;
};

/** Line-change totals for one viewer-local hour. */
export type TodayHourlyChanges = {
	readonly commits: number;
	readonly additions: number;
	readonly deletions: number;
	readonly changedFiles: number;
};

/** Day-wide or hour-scoped totals for the Today Changes panel. */
export type TodayChangeScope = {
	readonly _tag: 'Day' | 'Hour';
	readonly caption: string;
	readonly commits: number;
	readonly additions: number;
	readonly deletions: number;
	readonly changedFiles: number;
};

/** Exact viewer-local-day activity derived from the rolling-window commit evidence. */
export type TodayIntelligence = {
	readonly date: string;
	readonly label: string;
	readonly commits: number;
	readonly additions: number;
	readonly deletions: number;
	readonly changedFiles: number;
	readonly activeRepositories: number;
	readonly weekShare: number;
	readonly priorDailyAverage: number;
	readonly paceDelta: number;
	readonly firstCommitAt: string | null;
	readonly lastCommitAt: string | null;
	readonly activitySpanHours: number | null;
	readonly peakHour: string;
	readonly hourlyCommits: ReadonlyArray<number>;
	readonly hourlyChanges: ReadonlyArray<TodayHourlyChanges>;
	readonly repositories: ReadonlyArray<TodayRepositorySignal>;
	readonly recentCommits: ReadonlyArray<CommitSignal>;
	readonly labelText: string;
	readonly message: string;
};

function sum(values: ReadonlyArray<number>): number {
	return values.reduce((total, value) => total + value, 0);
}

function hourLabel(hour: number): string {
	const suffix = hour >= 12 ? 'PM' : 'AM';
	return `${hour % 12 || 12}:00 ${suffix}`;
}

function buildHourlyChanges(
	commits: ReadonlyArray<CommitSignal>,
	timeZone: string
): ReadonlyArray<TodayHourlyChanges> {
	const hourly: TodayHourlyChanges[] = Array.from({ length: 24 }, () => ({
		commits: 0,
		additions: 0,
		deletions: 0,
		changedFiles: 0
	}));
	for (const commit of commits) {
		const hour = zonedHour(new Date(commit.committedAt), timeZone);
		const current = hourly[hour];
		if (current === undefined) continue;
		hourly[hour] = {
			commits: current.commits + 1,
			additions: current.additions + commit.additions,
			deletions: current.deletions + commit.deletions,
			changedFiles: current.changedFiles + commit.changedFiles
		};
	}
	return hourly;
}

function buildTodayRepositories(
	commits: ReadonlyArray<CommitSignal>
): ReadonlyArray<TodayRepositorySignal> {
	const repositories = new Map<string, Omit<TodayRepositorySignal, 'share'>>();
	for (const commit of commits) {
		const current = repositories.get(commit.repository) ?? {
			name: commit.repository.split('/').at(-1) ?? commit.repository,
			fullName: commit.repository,
			commits: 0,
			additions: 0,
			deletions: 0,
			changedFiles: 0
		};
		repositories.set(commit.repository, {
			...current,
			commits: current.commits + 1,
			additions: current.additions + commit.additions,
			deletions: current.deletions + commit.deletions,
			changedFiles: current.changedFiles + commit.changedFiles
		});
	}
	return [...repositories.values()]
		.map((repository) => ({
			...repository,
			share: commits.length === 0 ? 0 : repository.commits / commits.length
		}))
		.sort((left, right) => right.commits - left.commits || left.name.localeCompare(right.name));
}

function activityTiming(commits: ReadonlyArray<CommitSignal>): {
	readonly first: string | null;
	readonly last: string | null;
	readonly spanHours: number | null;
} {
	const first = commits.at(0)?.committedAt ?? null;
	const last = commits.at(-1)?.committedAt ?? null;
	if (first === null || last === null) return { first, last, spanHours: null };
	const spanHours =
		Math.round(((new Date(last).getTime() - new Date(first).getTime()) / 3_600_000) * 10) / 10;
	return { first, last, spanHours };
}

function todayNarrative(
	commits: number,
	repositories: number,
	paceDelta: number,
	changes: number
): Pick<TodayIntelligence, 'labelText' | 'message'> {
	if (commits === 0) {
		return {
			labelText: 'No commits yet',
			message: 'No commits have reached an owned default branch today.'
		};
	}
	const labelText =
		paceDelta > 5
			? 'Above the recent daily average'
			: paceDelta >= 0
				? 'At or above the recent daily average'
				: 'Below the recent daily average';
	const commitLabel = commits === 1 ? 'commit' : 'commits';
	const repositoryLabel = repositories === 1 ? 'repository' : 'repositories';
	return {
		labelText,
		message: `${commits} ${commitLabel} across ${repositories} ${repositoryLabel}, with ${changes.toLocaleString()} lines added or removed.`
	};
}

/** Project one viewer's current local day into a focused daily dashboard. */
export function createTodayIntelligence(
	snapshot: GitHubDashboardSnapshot,
	projection: ViewerActivityProjection
): TodayIntelligence {
	const date = projection.date;
	const commits = [
		...commitsForViewerDate(snapshot.intelligence.commits, date, projection.timeZone)
	].sort((left, right) => left.committedAt.localeCompare(right.committedAt));
	const repositories = buildTodayRepositories(commits);
	const hourlyChanges = buildHourlyChanges(commits, projection.timeZone);
	const hourlyCommits = hourlyChanges.map((hour) => hour.commits);
	const peakHourIndex = hourlyCommits.reduce(
		(best, value, index) => (value > (hourlyCommits[best] ?? 0) ? index : best),
		0
	);
	const priorDailyAverage = (snapshot.intelligence.commits.length - commits.length) / 6;
	const paceDelta = Math.round(commits.length - priorDailyAverage);
	const additions = sum(commits.map((commit) => commit.additions));
	const deletions = sum(commits.map((commit) => commit.deletions));
	const timing = activityTiming(commits);
	const narrative = todayNarrative(
		commits.length,
		repositories.length,
		paceDelta,
		additions + deletions
	);
	return {
		date,
		label: projection.dateLabel,
		commits: commits.length,
		additions,
		deletions,
		changedFiles: sum(commits.map((commit) => commit.changedFiles)),
		activeRepositories: repositories.length,
		weekShare:
			snapshot.intelligence.commits.length === 0
				? 0
				: Math.round((commits.length / snapshot.intelligence.commits.length) * 100),
		priorDailyAverage,
		paceDelta,
		firstCommitAt: timing.first,
		lastCommitAt: timing.last,
		activitySpanHours: timing.spanHours,
		peakHour: commits.length === 0 ? 'No peak yet' : hourLabel(peakHourIndex),
		hourlyCommits,
		hourlyChanges,
		repositories,
		recentCommits: [...commits].reverse().slice(0, 6),
		...narrative
	};
}

const EMPTY_HOURLY_CHANGES: TodayHourlyChanges = {
	commits: 0,
	additions: 0,
	deletions: 0,
	changedFiles: 0
};

/** Resolve day-wide or hour-scoped change totals for the Today Changes panel. */
export function createTodayChangeScope(
	today: TodayIntelligence,
	hour: number | null
): TodayChangeScope {
	if (hour === null) {
		return {
			_tag: 'Day',
			caption: 'Current local day',
			commits: today.commits,
			additions: today.additions,
			deletions: today.deletions,
			changedFiles: today.changedFiles
		};
	}
	const bucket = today.hourlyChanges[hour] ?? EMPTY_HOURLY_CHANGES;
	return {
		_tag: 'Hour',
		caption: hourLabel(hour),
		commits: bucket.commits,
		additions: bucket.additions,
		deletions: bucket.deletions,
		changedFiles: bucket.changedFiles
	};
}
