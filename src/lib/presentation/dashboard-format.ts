import { SSR_VIEWER_TIME_ZONE } from '$lib/domain/dashboard-time';

const integerFormatter = new Intl.NumberFormat('en-US');
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

/** Format a signed delta with an explicit sign. */
export function formatSigned(value: number): string {
	let sign = '';
	if (value > 0) sign = '+';
	if (value < 0) sign = '−';
	return `${sign}${formatInteger(Math.abs(value))}`;
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

/** Render a generated-at timestamp for the dashboard footer. */
export function formatGeneratedAt(isoDate: string, timeZone = SSR_VIEWER_TIME_ZONE): string {
	return new Intl.DateTimeFormat('en', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone,
		timeZoneName: 'short'
	}).format(new Date(isoDate));
}
