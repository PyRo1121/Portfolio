import { SSR_VIEWER_TIME_ZONE } from '$lib/domain/dashboard-time';
import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';

const integerFormatter = new Intl.NumberFormat('en-US');
const decimalFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const compactFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1
});

/** Format a finite integer with locale-aware grouping. */
export function formatInteger(value: number): string {
	return Number.isFinite(value) ? integerFormatter.format(Math.round(value)) : '0';
}

/** Format a large dashboard count without hiding small values. */
export function formatCompact(value: number): string {
	return Math.abs(value) < 10_000 ? formatInteger(value) : compactFormatter.format(value);
}

/** Format a ratio as a percentage. */
export function formatPercent(value: number): string {
	return `${decimalFormatter.format(value * 100)}%`;
}

/** Format a signed delta with an explicit sign. */
export function formatSigned(value: number): string {
	let sign = '';
	if (value > 0) sign = '+';
	if (value < 0) sign = '−';
	return `${sign}${formatInteger(Math.abs(value))}`;
}

/** Format repository disk usage with an appropriate binary unit. */
export function formatBytesFromKb(kilobytes: number): string {
	if (kilobytes < 1024) return `${formatInteger(kilobytes)} KB`;
	const megabytes = kilobytes / 1024;
	if (megabytes < 1024) return `${decimalFormatter.format(megabytes)} MB`;
	return `${decimalFormatter.format(megabytes / 1024)} GB`;
}

/** Format an ISO timestamp as a compact relative time. */
export function formatRelativeTime(isoDate: string | null, nowIso: string): string {
	if (isoDate === null) return 'Never pushed';
	const delta = new Date(nowIso).getTime() - new Date(isoDate).getTime();
	const absolute = Math.abs(delta);
	const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
	if (absolute < 60 * 60 * 1000) return formatter.format(-Math.round(delta / 60_000), 'minute');
	if (absolute < 24 * 60 * 60 * 1000)
		return formatter.format(-Math.round(delta / 3_600_000), 'hour');
	return formatter.format(-Math.round(delta / 86_400_000), 'day');
}

/** Format a calendar date for a compact instrument label. */
export function formatCalendarDate(isoDate: string, timeZone = SSR_VIEWER_TIME_ZONE): string {
	const instant = new Date(`${isoDate}T12:00:00Z`);
	if (Number.isNaN(instant.getTime())) return isoDate;
	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		timeZone
	}).format(instant);
}

/** Explain the source of exact commit and line-change data. */
export function formatCoverage(snapshot: GitHubDashboardSnapshot): string {
	return snapshot.source._tag === 'Live'
		? `${formatInteger(snapshot.intelligence.account.activeRepositories)} active repositories · default branches`
		: 'Sample account intelligence';
}

/** Render a generated-at timestamp for the dashboard footer. */
export function formatGeneratedAt(isoDate: string, timeZone = SSR_VIEWER_TIME_ZONE): string {
	return new Intl.DateTimeFormat('en', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone,
		timeZoneName: 'short'
	}).format(new Date(isoDate));
}
