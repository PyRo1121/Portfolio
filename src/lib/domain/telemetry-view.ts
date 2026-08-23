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
	readonly fcpMs: number | null;
	readonly ttfbMs: number | null;
	readonly inpMs: number | null;
	readonly cls: number | null;
	readonly lcpCount: number;
	readonly fcpCount: number;
	readonly ttfbCount: number;
	readonly inpCount: number;
	readonly clsCount: number;
};

/** Exact owner-scoped totals computed over the complete retention window. */
export type TelemetryTotals = {
	readonly totalEvents: number;
	readonly pageViews: number;
	readonly workspaceViews: number;
	readonly uniqueSessions: number;
	readonly pageViewSessions: number;
	readonly performanceSessions: number;
	readonly contactActions: number;
	readonly contactSessions: number;
	readonly emailClicks: number;
	readonly linkedinClicks: number;
	readonly portfolioActions: number;
	readonly portfolioSessions: number;
	readonly featuredOmgOpens: number;
	readonly featuredWeeknoteOpens: number;
	readonly liveEvidenceOpens: number;
	readonly errorCount: number;
	readonly lastRecordedAt: string | null;
};

/** Aggregate visitor-telemetry view for the owner dashboard. */
export type TelemetryView = {
	readonly pageViews: number;
	readonly workspaceViews: number;
	readonly uniqueSessions: number;
	readonly pageViewSessions: number;
	readonly performanceSessions: number;
	readonly performanceCoveragePercent: number | null;
	readonly contactActions: number;
	readonly contactSessions: number;
	readonly emailClicks: number;
	readonly linkedinClicks: number;
	readonly contactActionRatePercent: number | null;
	readonly portfolioActions: number;
	readonly portfolioSessions: number;
	readonly featuredOmgOpens: number;
	readonly featuredWeeknoteOpens: number;
	readonly liveEvidenceOpens: number;
	readonly errorCount: number;
	readonly paths: ReadonlyArray<TelemetryBar>;
	readonly workspaces: ReadonlyArray<TelemetryBar>;
	readonly countries: ReadonlyArray<TelemetryBar>;
	readonly devices: ReadonlyArray<TelemetryBar>;
	readonly browsers: ReadonlyArray<TelemetryBar>;
	readonly referrers: ReadonlyArray<TelemetryBar>;
	readonly hours: ReadonlyArray<TelemetryBar>;
	readonly totalEvents: number;
	readonly detailsTruncated: boolean;
	readonly lastRecordedAt: string | null;
	readonly vitals: TelemetryVitals;
	readonly recent: ReadonlyArray<TelemetryEvent>;
};

const WORKSPACE_LABELS: Readonly<Record<string, string>> = {
	today: 'Today',
	brief: 'Week',
	delivery: 'Delivery',
	craft: 'Checks',
	repositories: 'Projects',
	activity: 'Commits',
	cloudflare: 'Cloudflare',
	career: 'Career',
	telemetry: 'Visitors'
};

export function createTelemetryView(
	events: ReadonlyArray<TelemetryEvent>,
	totals: TelemetryTotals,
	detailsTruncated = false
): TelemetryView {
	const recent = events.slice(0, 12);
	const performanceCoveragePercent =
		totals.pageViewSessions === 0
			? null
			: Math.min(100, Math.round((totals.performanceSessions / totals.pageViewSessions) * 100));
	const contactActionRatePercent =
		totals.pageViewSessions === 0
			? null
			: Math.min(100, Math.round((totals.contactSessions / totals.pageViewSessions) * 1_000) / 10);

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
		(event) => event.country ?? 'Unreported',
		(event) => event.eventType === 'page_view'
	);
	const devices = rank(
		events,
		(event) => event.deviceClass ?? 'Unreported',
		(event) => event.eventType === 'page_view'
	);
	const browsers = rank(
		events,
		(event) => event.browserFamily ?? 'Unreported',
		(event) => event.eventType === 'page_view'
	);
	const referrers = rank(
		events,
		(event) => event.referrerHost ?? 'Direct / none',
		(event) => event.eventType === 'page_view'
	);

	const hours = new Map<number, number>();
	for (const event of events) {
		if (event.eventType !== 'page_view') continue;
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

	return {
		pageViews: totals.pageViews,
		workspaceViews: totals.workspaceViews,
		uniqueSessions: totals.uniqueSessions,
		pageViewSessions: totals.pageViewSessions,
		performanceSessions: totals.performanceSessions,
		performanceCoveragePercent,
		contactActions: totals.contactActions,
		contactSessions: totals.contactSessions,
		emailClicks: totals.emailClicks,
		linkedinClicks: totals.linkedinClicks,
		contactActionRatePercent,
		portfolioActions: totals.portfolioActions,
		portfolioSessions: totals.portfolioSessions,
		featuredOmgOpens: totals.featuredOmgOpens,
		featuredWeeknoteOpens: totals.featuredWeeknoteOpens,
		liveEvidenceOpens: totals.liveEvidenceOpens,
		errorCount: totals.errorCount,
		paths: top(paths, 8),
		workspaces: top(workspaces, 8),
		countries: top(countries, 10),
		devices: top(devices, 5),
		browsers: top(browsers, 6),
		referrers: top(referrers, 8),
		hours: hoursWithShare.slice(0, 12),
		totalEvents: totals.totalEvents,
		detailsTruncated,
		lastRecordedAt: totals.lastRecordedAt,
		vitals,
		recent
	};
}

function computeVitals(events: ReadonlyArray<TelemetryEvent>): TelemetryVitals {
	const values = new Map<string, number[]>();
	for (const event of events) {
		if (event.eventType !== 'web_vital' || event.metricValue === null) continue;
		const metricValues = values.get(event.metricName ?? 'unknown') ?? [];
		metricValues.push(event.metricValue);
		values.set(event.metricName ?? 'unknown', metricValues);
	}
	const valuesFor = (metric: string): ReadonlyArray<number> => values.get(metric) ?? [];
	const lcp = valuesFor('lcp');
	const fcp = valuesFor('fcp');
	const ttfb = valuesFor('ttfb');
	const inp = valuesFor('inp');
	const cls = valuesFor('cls');
	return {
		lcpMs: lcp.length === 0 ? null : median(lcp),
		fcpMs: fcp.length === 0 ? null : median(fcp),
		ttfbMs: ttfb.length === 0 ? null : median(ttfb),
		inpMs: inp.length === 0 ? null : median(inp),
		cls: cls.length === 0 ? null : median(cls),
		lcpCount: lcp.length,
		fcpCount: fcp.length,
		ttfbCount: ttfb.length,
		inpCount: inp.length,
		clsCount: cls.length
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
