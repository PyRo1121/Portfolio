import type { TelemetryEvent } from './telemetry';

/** One rankable dimension with an exact count and proportional width. */
export type TelemetryBar = {
	readonly label: string;
	readonly count: number;
	readonly share: number;
};

/** Core Web Vitals aggregates measured from beacon events. */
export type TelemetryVitals = {
	readonly lcpMs: number | null;
	readonly cls: number | null;
	readonly lcpCount: number;
	readonly clsCount: number;
};

/** Aggregate visitor-telemetry view for the owner dashboard. */
export type TelemetryView = {
	readonly pageViews: number;
	readonly workspaceViews: number;
	readonly uniqueSessions: number;
	readonly paths: ReadonlyArray<TelemetryBar>;
	readonly workspaces: ReadonlyArray<TelemetryBar>;
	readonly countries: ReadonlyArray<TelemetryBar>;
	readonly devices: ReadonlyArray<TelemetryBar>;
	readonly browsers: ReadonlyArray<TelemetryBar>;
	readonly hours: ReadonlyArray<TelemetryBar>;
	readonly vitals: TelemetryVitals;
	readonly recent: ReadonlyArray<TelemetryEvent>;
};

const WORKSPACE_LABELS: Readonly<Record<string, string>> = {
	today: 'Today',
	brief: 'Week',
	delivery: 'Delivery',
	craft: 'Quality',
	repositories: 'Projects',
	activity: 'Commits',
	cloudflare: 'Cloudflare',
	career: 'Career',
	telemetry: 'Visitors'
};

export function createTelemetryView(
	events: ReadonlyArray<TelemetryEvent>,
	now: Date
): TelemetryView {
	const recent = events.slice(0, 12);
	const pageViews = events.filter((event) => event.eventType === 'page_view').length;
	const workspaceViews = events.filter((event) => event.eventType === 'workspace_view').length;
	const uniqueSessions = new Set(events.map((event) => event.sessionHash).filter(Boolean)).size;

	const paths = rank(
		events,
		(event) => event.path,
		(event) => event.eventType === 'page_view'
	);
	const workspaces = rank(
		events.filter((event) => event.eventType === 'workspace_view'),
		(event) => WORKSPACE_LABELS[event.workspace ?? ''] ?? event.workspace ?? 'unknown'
	);
	const countries = rank(
		events,
		(event) => event.country ?? 'unknown',
		(event) => event.eventType === 'page_view'
	);
	const devices = rank(
		events,
		(event) => event.deviceClass ?? 'unknown',
		(event) => event.eventType === 'page_view'
	);
	const browsers = rank(
		events,
		(event) => event.browserFamily ?? 'unknown',
		(event) => event.eventType === 'page_view'
	);

	const hours = new Map<number, number>();
	for (const event of events) {
		const hour = new Date(event.recordedAt).getUTCHours();
		hours.set(hour, (hours.get(hour) ?? 0) + 1);
	}
	const hourBars = [...hours.entries()]
		.map(([hour, count]) => ({ label: `${String(hour).padStart(2, '0')}:00`, count }))
		.sort((left, right) => right.count - left.count);
	const hourMax = Math.max(0, ...hours.values());
	const hoursWithShare = hourBars.map((bar) => ({
		...bar,
		share: hourMax === 0 ? 0 : bar.count / hourMax
	}));

	const vitals = computeVitals(events);
	void now;

	return {
		pageViews,
		workspaceViews,
		uniqueSessions,
		paths: top(paths, 8),
		workspaces: top(workspaces, 8),
		countries: top(countries, 10),
		devices: top(devices, 5),
		browsers: top(browsers, 6),
		hours: hoursWithShare.slice(0, 12),
		vitals,
		recent
	};
}

function computeVitals(events: ReadonlyArray<TelemetryEvent>): TelemetryVitals {
	const lcpValues: number[] = [];
	const clsValues: number[] = [];
	for (const event of events) {
		if (event.eventType !== 'web_vital' || event.metricValue === null) continue;
		if (event.metricName === 'lcp') lcpValues.push(event.metricValue);
		if (event.metricName === 'cls') clsValues.push(event.metricValue);
	}
	return {
		lcpMs: lcpValues.length === 0 ? null : median(lcpValues) * 1000,
		cls: clsValues.length === 0 ? null : median(clsValues),
		lcpCount: lcpValues.length,
		clsCount: clsValues.length
	};
}

function rank(
	events: ReadonlyArray<TelemetryEvent>,
	labelOf: (event: TelemetryEvent) => string,
	filter: (event: TelemetryEvent) => boolean = () => true
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const event of events) {
		if (!filter(event)) continue;
		const label = labelOf(event);
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return counts;
}

function top(counts: Map<string, number>, limit: number): ReadonlyArray<TelemetryBar> {
	const entries = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit);
	const max = entries[0]?.[1] ?? 0;
	return entries.map(([label, count]) => ({
		label,
		count,
		share: max === 0 ? 0 : count / max
	}));
}

function median(values: ReadonlyArray<number>): number {
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	const low = sorted[middle - 1] ?? 0;
	const high = sorted[middle] ?? 0;
	return sorted.length % 2 === 0 ? (low + high) / 2 : high;
}
