import {
	addZonedDays,
	startOfZonedDay,
	zonedDateKey,
	zonedHour,
	zonedTimeLabel,
	zonedWeekday
} from './dashboard-time';
import type {
	CommitSignal,
	EngineeringDay,
	GitHubDashboardSnapshot,
	HourlySignal
} from './github-intelligence';

const DAYS_IN_WEEK = 7;

export type ViewerActivityProjection = {
	readonly timeZone: string;
	readonly timeLabel: string;
	readonly periodLabel: string;
	readonly dateLabel: string;
	readonly date: string;
	readonly days: ReadonlyArray<EngineeringDay>;
	readonly hourlyActivity: ReadonlyArray<HourlySignal>;
	readonly peakHour: string;
	readonly weekendCommitShare: number;
};

function sum(values: ReadonlyArray<number>): number {
	return values.reduce((total, value) => total + value, 0);
}

function formatHour(hour: number): string {
	const suffix = hour >= 12 ? 'PM' : 'AM';
	return `${hour % 12 || 12}:00 ${suffix}`;
}

/** Reproject exact commit timestamps into one viewer's local calendar and clock. */
export function createViewerActivityProjection(
	snapshot: GitHubDashboardSnapshot,
	timeZone: string
): ViewerActivityProjection {
	const generatedAt = new Date(snapshot.generatedAt);
	const todayStart = startOfZonedDay(generatedAt, timeZone);
	const start = addZonedDays(todayStart, -(DAYS_IN_WEEK - 1), timeZone);
	const shortDay = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone });
	const longDay = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone });
	const periodFormatter = new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		timeZone
	});
	const rawDays = Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
		const instant = addZonedDays(start, index, timeZone);
		const date = zonedDateKey(instant, timeZone);
		const commits = snapshot.intelligence.commits.filter(
			(commit) => zonedDateKey(new Date(commit.committedAt), timeZone) === date
		);
		const additions = sum(commits.map((commit) => commit.additions));
		const deletions = sum(commits.map((commit) => commit.deletions));
		return {
			date,
			label: shortDay.format(instant).toUpperCase(),
			longLabel: longDay.format(instant),
			commits: commits.length,
			additions,
			deletions,
			totalChanges: additions + deletions
		};
	});
	const maximumDayCommits = Math.max(1, ...rawDays.map((day) => day.commits));
	const days = rawDays.map((day) => ({
		...day,
		height: `${Math.max(day.commits > 0 ? 7 : 2, (day.commits / maximumDayCommits) * 100)}%`
	}));
	const hourlyCounts = Array.from({ length: 24 }, () => 0);
	for (const commit of snapshot.intelligence.commits) {
		const hour = zonedHour(new Date(commit.committedAt), timeZone);
		hourlyCounts[hour] = (hourlyCounts[hour] ?? 0) + 1;
	}
	const maximumHour = Math.max(1, ...hourlyCounts);
	const hourlyActivity = hourlyCounts.map((commits, hour) => ({
		hour,
		label: formatHour(hour),
		commits,
		height: `${Math.max(commits > 0 ? 8 : 2, (commits / maximumHour) * 100)}%`
	}));
	const peak = [...hourlyActivity].sort(
		(left, right) => right.commits - left.commits || left.hour - right.hour
	)[0];
	const weekendCommits = snapshot.intelligence.commits.filter((commit) => {
		const day = zonedWeekday(new Date(commit.committedAt), timeZone);
		return day === 0 || day === 6;
	}).length;
	return {
		timeZone,
		timeLabel: zonedTimeLabel(generatedAt, timeZone),
		periodLabel: `${periodFormatter.format(start)} – ${periodFormatter.format(generatedAt)}`,
		dateLabel: new Intl.DateTimeFormat('en', {
			weekday: 'long',
			month: 'short',
			day: 'numeric',
			timeZone
		}).format(generatedAt),
		date: zonedDateKey(generatedAt, timeZone),
		days,
		hourlyActivity,
		peakHour: peak && peak.commits > 0 ? peak.label : 'No commit hour yet',
		weekendCommitShare:
			snapshot.intelligence.commits.length === 0
				? 0
				: Math.round((weekendCommits / snapshot.intelligence.commits.length) * 100)
	};
}

/** Select exact commit evidence for one viewer-local date. */
export function commitsForViewerDate(
	commits: ReadonlyArray<CommitSignal>,
	date: string,
	timeZone: string
): ReadonlyArray<CommitSignal> {
	return commits.filter((commit) => zonedDateKey(new Date(commit.committedAt), timeZone) === date);
}
