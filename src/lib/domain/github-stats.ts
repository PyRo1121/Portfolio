import { addZonedDays, COLLECTION_TIME_ZONE, startOfZonedDay, zonedHour } from './dashboard-time';

const DAYS_IN_WEEK = 7;

/** A GitHub profile reduced to the fields the dashboard owns. */
export type GitHubProfile = {
	readonly login: string;
	readonly name: string;
	readonly avatarUrl: string;
	readonly profileUrl: string;
	readonly publicRepos: number;
	readonly followers: number;
};

/** Repository metadata used to contextualize weekly activity. */
export type GitHubRepository = {
	readonly fullName: string;
	readonly name: string;
	readonly createdAt: Date;
	readonly language: string | null;
	readonly stars: number;
	readonly forks: number;
	readonly url: string;
};

/** A parsed GitHub activity event. */
export type GitHubActivityEvent =
	| {
			readonly _tag: 'Push';
			readonly createdAt: Date;
			readonly repo: string;
			readonly before: string;
			readonly head: string;
	  }
	| {
			readonly _tag: 'RepositoryCreated';
			readonly createdAt: Date;
			readonly repo: string;
	  }
	| {
			readonly _tag: 'PullRequest';
			readonly createdAt: Date;
			readonly repo: string;
			readonly action: string;
			readonly merged: boolean;
	  }
	| {
			readonly _tag: 'Issue';
			readonly createdAt: Date;
			readonly repo: string;
			readonly action: string;
	  }
	| {
			readonly _tag: 'Comment';
			readonly createdAt: Date;
			readonly repo: string;
	  }
	| {
			readonly _tag: 'Starred';
			readonly createdAt: Date;
			readonly repo: string;
	  }
	| {
			readonly _tag: 'Forked';
			readonly createdAt: Date;
			readonly repo: string;
	  }
	| {
			readonly _tag: 'Other';
			readonly createdAt: Date;
			readonly repo: string;
			readonly eventType: string;
	  };

/** Measured commit and line-change data for one push. */
export type PushMeasurement = {
	readonly repo: string;
	readonly head: string;
	readonly createdAt: Date;
	readonly commits: number | null;
	readonly additions: number | null;
	readonly deletions: number | null;
};

/** One day in the weekly activity rhythm. */
export type DailyActivity = {
	readonly label: string;
	readonly longLabel: string;
	readonly activity: number;
	readonly commits: number;
	readonly barHeight: string;
	readonly intensity: number;
};

/** One repository ranked by this week's activity. */
export type RepositorySignal = {
	readonly name: string;
	readonly fullName: string;
	readonly url: string;
	readonly language: string;
	readonly stars: number;
	readonly commits: number;
	readonly events: number;
	readonly score: number;
	readonly signalWidth: string;
};

/** Aggregate values rendered by the dashboard. */
export type WeeklyTotals = {
	readonly commits: number;
	readonly pushes: number;
	readonly additions: number;
	readonly deletions: number;
	readonly churn: number;
	readonly repositoriesCreated: number;
	readonly pullRequestsOpened: number;
	readonly pullRequestsMerged: number;
	readonly issuesClosed: number;
	readonly comments: number;
	readonly repositoriesStarred: number;
	readonly forks: number;
	readonly events: number;
};

/** A playful, derived observation about the week. */
export type WeeklyInsight = {
	readonly label: string;
	readonly value: string;
	readonly detail: string;
};

/** Provenance for a dashboard snapshot. */
export type SnapshotSource =
	| { readonly _tag: 'Live'; readonly label: string }
	| { readonly _tag: 'Demo'; readonly label: string; readonly reason: string };

/** Complete serializable dashboard model. */
export type WeeklySnapshot = {
	readonly source: SnapshotSource;
	readonly profile: GitHubProfile;
	readonly period: {
		readonly startIso: string;
		readonly endIso: string;
		readonly label: string;
	};
	readonly generatedAt: string;
	readonly totals: WeeklyTotals;
	readonly coverage: {
		readonly measuredPushes: number;
		readonly totalPushes: number;
	};
	readonly dailyActivity: ReadonlyArray<DailyActivity>;
	readonly topRepositories: ReadonlyArray<RepositorySignal>;
	readonly insights: ReadonlyArray<WeeklyInsight>;
};

/** Input needed to compute a live weekly snapshot. */
export type WeeklySnapshotInput = {
	readonly now: Date;
	readonly profile: GitHubProfile;
	readonly repositories: ReadonlyArray<GitHubRepository>;
	readonly events: ReadonlyArray<GitHubActivityEvent>;
	readonly pushMeasurements: ReadonlyArray<PushMeasurement>;
};

type MutableRepositorySignal = {
	name: string;
	fullName: string;
	url: string;
	language: string;
	stars: number;
	commits: number;
	events: number;
	score: number;
};

/** Return canonical UTC midnight six days before `now`, the shared rolling-window start. */
export function startOfRollingWeek(now: Date): Date {
	return addZonedDays(
		startOfZonedDay(now, COLLECTION_TIME_ZONE),
		-(DAYS_IN_WEEK - 1),
		COLLECTION_TIME_ZONE
	);
}

function formatPeriod(start: Date, end: Date): string {
	const formatter = new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		timeZone: COLLECTION_TIME_ZONE
	});
	return `${formatter.format(start)} – ${formatter.format(new Date(end.getTime() - 1))}`;
}

function isInPeriod(date: Date, start: Date, end: Date): boolean {
	return date >= start && date < end;
}

function repoName(fullName: string): string {
	const separator = fullName.indexOf('/');
	return separator === -1 ? fullName : fullName.slice(separator + 1);
}

function measurementKey(repo: string, head: string): string {
	return `${repo}:${head}`;
}

function commitsForEvent(
	event: GitHubActivityEvent,
	measurements: ReadonlyMap<string, PushMeasurement>
): number {
	if (event._tag !== 'Push') return 0;
	return measurements.get(measurementKey(event.repo, event.head))?.commits ?? 0;
}

function buildDailyActivity(
	start: Date,
	events: ReadonlyArray<GitHubActivityEvent>,
	measurements: ReadonlyMap<string, PushMeasurement>
): ReadonlyArray<DailyActivity> {
	const rawDays = Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
		const dayStart = addZonedDays(start, index, COLLECTION_TIME_ZONE);
		const dayEnd = addZonedDays(start, index + 1, COLLECTION_TIME_ZONE);
		const dayEvents = events.filter((event) => isInPeriod(event.createdAt, dayStart, dayEnd));
		return {
			dayStart,
			activity: dayEvents.length,
			commits: dayEvents.reduce((total, event) => total + commitsForEvent(event, measurements), 0)
		};
	});
	const maximum = Math.max(1, ...rawDays.map((day) => day.activity));
	const shortDay = new Intl.DateTimeFormat('en', {
		weekday: 'short',
		timeZone: COLLECTION_TIME_ZONE
	});
	const longDay = new Intl.DateTimeFormat('en', {
		weekday: 'long',
		timeZone: COLLECTION_TIME_ZONE
	});

	return rawDays.map((day) => {
		const intensity = day.activity / maximum;
		return {
			label: shortDay.format(day.dayStart).slice(0, 2).toUpperCase(),
			longLabel: longDay.format(day.dayStart),
			activity: day.activity,
			commits: day.commits,
			barHeight: `${Math.max(8, Math.round(intensity * 100))}%`,
			intensity
		};
	});
}

function eventWeight(event: GitHubActivityEvent): number {
	switch (event._tag) {
		case 'Push':
			return 2;
		case 'PullRequest':
			return 4;
		case 'RepositoryCreated':
			return 5;
		case 'Issue':
			return 2;
		case 'Comment':
		case 'Starred':
		case 'Forked':
		case 'Other':
			return 1;
	}
}

function buildRepositorySignals(
	events: ReadonlyArray<GitHubActivityEvent>,
	repositories: ReadonlyArray<GitHubRepository>,
	measurements: ReadonlyMap<string, PushMeasurement>
): ReadonlyArray<RepositorySignal> {
	const repositoryMetadata = new Map(repositories.map((repo) => [repo.fullName, repo]));
	const signals = new Map<string, MutableRepositorySignal>();

	for (const event of events) {
		const metadata = repositoryMetadata.get(event.repo);
		const existing = signals.get(event.repo) ?? {
			name: metadata?.name ?? repoName(event.repo),
			fullName: event.repo,
			url: metadata?.url ?? `https://github.com/${event.repo}`,
			language: metadata?.language ?? 'Mixed',
			stars: metadata?.stars ?? 0,
			commits: 0,
			events: 0,
			score: 0
		};
		existing.events += 1;
		existing.score += eventWeight(event);
		const commits = commitsForEvent(event, measurements);
		existing.commits += commits;
		existing.score += commits;
		signals.set(event.repo, existing);
	}

	const ranked = [...signals.values()].sort(
		(left, right) => right.score - left.score || left.name.localeCompare(right.name)
	);
	const maximumScore = Math.max(1, ranked[0]?.score ?? 1);
	return ranked.slice(0, 4).map((signal) => ({
		...signal,
		signalWidth: `${Math.max(10, Math.round((signal.score / maximumScore) * 100))}%`
	}));
}

function longestActiveStreak(days: ReadonlyArray<DailyActivity>): number {
	let current = 0;
	let longest = 0;
	for (const day of days) {
		current = day.activity > 0 ? current + 1 : 0;
		longest = Math.max(longest, current);
	}
	return longest;
}

function favoriteHour(events: ReadonlyArray<GitHubActivityEvent>): number | null {
	if (events.length === 0) return null;
	const hours = Array.from({ length: 24 }, () => 0);
	for (const event of events) {
		const hour = zonedHour(event.createdAt, COLLECTION_TIME_ZONE);
		hours[hour] = (hours[hour] ?? 0) + 1;
	}
	let favorite = 0;
	for (let hour = 1; hour < hours.length; hour += 1) {
		if ((hours[hour] ?? 0) > (hours[favorite] ?? 0)) favorite = hour;
	}
	return favorite;
}

function formatHour(hour: number | null): string {
	if (hour === null) return 'Quiet mode';
	const suffix = hour >= 12 ? 'PM' : 'AM';
	const displayHour = hour % 12 || 12;
	return `${displayHour}:00 ${suffix} UTC`;
}

function buildInsights(
	events: ReadonlyArray<GitHubActivityEvent>,
	days: ReadonlyArray<DailyActivity>,
	topRepositories: ReadonlyArray<RepositorySignal>,
	totals: WeeklyTotals
): ReadonlyArray<WeeklyInsight> {
	const peakDay = [...days].sort(
		(left, right) => right.activity - left.activity || left.longLabel.localeCompare(right.longLabel)
	)[0];
	const nightEvents = events.filter(
		(event) => zonedHour(event.createdAt, COLLECTION_TIME_ZONE) < 6
	).length;
	const nightShare = events.length === 0 ? 0 : Math.round((nightEvents / events.length) * 100);
	const topRepo = topRepositories[0];
	const streak = longestActiveStreak(days);

	return [
		{
			label: 'Peak operating hour',
			value: formatHour(favoriteHour(events)),
			detail: 'Apparently this is when the keyboard wins.'
		},
		{
			label: 'Longest active streak',
			value: `${streak} ${streak === 1 ? 'day' : 'days'}`,
			detail:
				peakDay && peakDay.activity > 0
					? `${peakDay.longLabel} carried the most signal.`
					: 'The week is still waiting for a first move.'
		},
		{
			label: 'Night-shift coefficient',
			value: `${nightShare}%`,
			detail: `${nightEvents} public events landed before 06:00 UTC.`
		},
		{
			label: 'Current main character',
			value: topRepo?.name ?? 'No repo yet',
			detail: topRepo
				? `${topRepo.events} events and ${topRepo.commits} measured commits.`
				: 'No repository has broken the silence.'
		},
		{
			label: 'Merge courage',
			value: `${totals.pullRequestsMerged}/${totals.pullRequestsOpened}`,
			detail: 'Merged pull requests versus opened pull requests.'
		},
		{
			label: 'Social battery spent',
			value: `${totals.comments} ${totals.comments === 1 ? 'comment' : 'comments'}`,
			detail:
				totals.comments > 0
					? 'Human interaction was detected.'
					: 'A beautifully uninterrupted week.'
		}
	];
}

/** Compute the complete live weekly dashboard snapshot from parsed GitHub data. */
export function createWeeklySnapshot(input: WeeklySnapshotInput): WeeklySnapshot {
	const start = startOfRollingWeek(input.now);
	const end = addZonedDays(start, DAYS_IN_WEEK, COLLECTION_TIME_ZONE);
	const events = input.events.filter((event) => isInPeriod(event.createdAt, start, end));
	const measurements = new Map(
		input.pushMeasurements.map((measurement) => [
			measurementKey(measurement.repo, measurement.head),
			measurement
		])
	);
	const measured = input.pushMeasurements.filter(
		(measurement) =>
			isInPeriod(measurement.createdAt, start, end) &&
			measurement.commits !== null &&
			measurement.additions !== null &&
			measurement.deletions !== null
	);
	const repositoriesCreated = input.repositories.filter((repo) =>
		isInPeriod(repo.createdAt, start, end)
	).length;
	const totals: WeeklyTotals = {
		commits: measured.reduce((total, push) => total + (push.commits ?? 0), 0),
		pushes: events.filter((event) => event._tag === 'Push').length,
		additions: measured.reduce((total, push) => total + (push.additions ?? 0), 0),
		deletions: measured.reduce((total, push) => total + (push.deletions ?? 0), 0),
		churn: measured.reduce(
			(total, push) => total + (push.additions ?? 0) + (push.deletions ?? 0),
			0
		),
		repositoriesCreated,
		pullRequestsOpened: events.filter(
			(event) => event._tag === 'PullRequest' && event.action === 'opened'
		).length,
		pullRequestsMerged: events.filter(
			(event) => event._tag === 'PullRequest' && event.action === 'closed' && event.merged
		).length,
		issuesClosed: events.filter((event) => event._tag === 'Issue' && event.action === 'closed')
			.length,
		comments: events.filter((event) => event._tag === 'Comment').length,
		repositoriesStarred: events.filter((event) => event._tag === 'Starred').length,
		forks: events.filter((event) => event._tag === 'Forked').length,
		events: events.length
	};
	const dailyActivity = buildDailyActivity(start, events, measurements);
	const topRepositories = buildRepositorySignals(events, input.repositories, measurements);

	return {
		source: { _tag: 'Live', label: 'Live public signal' },
		profile: input.profile,
		period: {
			startIso: start.toISOString(),
			endIso: end.toISOString(),
			label: formatPeriod(start, end)
		},
		generatedAt: input.now.toISOString(),
		totals,
		coverage: {
			measuredPushes: measured.length,
			totalPushes: totals.pushes
		},
		dailyActivity,
		topRepositories,
		insights: buildInsights(events, dailyActivity, topRepositories, totals)
	};
}

/** Build an explicitly labeled sample snapshot for offline and first-run states. */
export function createDemoSnapshot(now: Date, username: string, reason: string): WeeklySnapshot {
	const start = startOfRollingWeek(now);
	const end = addZonedDays(start, DAYS_IN_WEEK, COLLECTION_TIME_ZONE);
	const activity = [4, 8, 3, 11, 7, 2, 0];
	const maximum = Math.max(...activity);
	const shortDay = new Intl.DateTimeFormat('en', {
		weekday: 'short',
		timeZone: COLLECTION_TIME_ZONE
	});
	const longDay = new Intl.DateTimeFormat('en', {
		weekday: 'long',
		timeZone: COLLECTION_TIME_ZONE
	});
	const dailyActivity = activity.map((count, index) => {
		const date = addZonedDays(start, index, COLLECTION_TIME_ZONE);
		return {
			label: shortDay.format(date).slice(0, 2).toUpperCase(),
			longLabel: longDay.format(date),
			activity: count,
			commits: [3, 7, 2, 9, 6, 1, 0][index] ?? 0,
			barHeight: `${Math.max(8, Math.round((count / maximum) * 100))}%`,
			intensity: count / maximum
		};
	});
	const totals: WeeklyTotals = {
		commits: 28,
		pushes: 14,
		additions: 2847,
		deletions: 913,
		churn: 3760,
		repositoriesCreated: 2,
		pullRequestsOpened: 5,
		pullRequestsMerged: 4,
		issuesClosed: 6,
		comments: 9,
		repositoriesStarred: 3,
		forks: 1,
		events: 35
	};
	const topRepositories: ReadonlyArray<RepositorySignal> = [
		{
			name: 'signal-garden',
			fullName: `${username}/signal-garden`,
			url: `https://github.com/${username}`,
			language: 'Svelte',
			stars: 12,
			commits: 13,
			events: 16,
			score: 42,
			signalWidth: '100%'
		},
		{
			name: 'tiny-chaos-engine',
			fullName: `${username}/tiny-chaos-engine`,
			url: `https://github.com/${username}`,
			language: 'TypeScript',
			stars: 4,
			commits: 9,
			events: 11,
			score: 30,
			signalWidth: '71%'
		},
		{
			name: 'weekend-protocol',
			fullName: `${username}/weekend-protocol`,
			url: `https://github.com/${username}`,
			language: 'Rust',
			stars: 2,
			commits: 6,
			events: 8,
			score: 19,
			signalWidth: '45%'
		}
	];

	return {
		source: { _tag: 'Demo', label: 'Demo signal', reason },
		profile: {
			login: username,
			name: username,
			avatarUrl: `https://github.com/${username}.png`,
			profileUrl: `https://github.com/${username}`,
			publicRepos: 0,
			followers: 0
		},
		period: {
			startIso: start.toISOString(),
			endIso: end.toISOString(),
			label: formatPeriod(start, end)
		},
		generatedAt: now.toISOString(),
		totals,
		coverage: { measuredPushes: 14, totalPushes: 14 },
		dailyActivity,
		topRepositories,
		insights: [
			{
				label: 'Peak operating hour',
				value: '11:00 PM UTC',
				detail: 'Apparently this is when the keyboard wins.'
			},
			{
				label: 'Longest active streak',
				value: '6 days',
				detail: 'Thursday carried the most signal.'
			},
			{
				label: 'Night-shift coefficient',
				value: '31%',
				detail: 'Demo activity prefers unreasonable hours.'
			},
			{
				label: 'Current main character',
				value: 'signal-garden',
				detail: '16 events and 13 measured commits.'
			},
			{
				label: 'Merge courage',
				value: '4/5',
				detail: 'Merged pull requests versus opened pull requests.'
			},
			{
				label: 'Social battery spent',
				value: '9 comments',
				detail: 'Human interaction was detected.'
			}
		]
	};
}
