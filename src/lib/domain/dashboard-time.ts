export const COLLECTION_TIME_ZONE = 'UTC';
export const SSR_VIEWER_TIME_ZONE = 'America/New_York';

export type CalendarDate = {
	readonly year: number;
	readonly month: number;
	readonly day: number;
};

function formatter(
	timeZone: string,
	options: Omit<Intl.DateTimeFormatOptions, 'timeZone'>
): Intl.DateTimeFormat {
	return new Intl.DateTimeFormat('en-US', { ...options, timeZone });
}

function numericPart(
	parts: ReadonlyArray<Intl.DateTimeFormatPart>,
	type: Intl.DateTimeFormatPartTypes
): number {
	const value = parts.find((part) => part.type === type)?.value;
	if (value === undefined) throw new Error(`Timezone formatter omitted ${type}.`);
	return Number.parseInt(value, 10);
}

/** Return a supported IANA timezone, falling back when the supplied value is unavailable. */
export function normalizeTimeZone(
	candidate: string | null | undefined,
	fallback = SSR_VIEWER_TIME_ZONE
): string {
	if (candidate === null || candidate === undefined || candidate.trim() === '') return fallback;
	try {
		formatter(candidate, { year: 'numeric' }).format(new Date(0));
		return candidate;
	} catch {
		return fallback;
	}
}

/** Return the browser/system timezone when available, with a deterministic SSR fallback. */
export function resolvedViewerTimeZone(): string {
	return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** Return the zoned calendar date containing an exact instant. */
export function zonedCalendarDate(date: Date, timeZone: string): CalendarDate {
	const parts = formatter(timeZone, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);
	return {
		year: numericPart(parts, 'year'),
		month: numericPart(parts, 'month'),
		day: numericPart(parts, 'day')
	};
}

/** Return a stable YYYY-MM-DD key for an instant in one timezone. */
export function zonedDateKey(date: Date, timeZone: string): string {
	const { year, month, day } = zonedCalendarDate(date, timeZone);
	return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Return an instant's wall-clock hour in one timezone. */
export function zonedHour(date: Date, timeZone: string): number {
	return numericPart(
		formatter(timeZone, { hour: '2-digit', hourCycle: 'h23' }).formatToParts(date),
		'hour'
	);
}

/** Return an instant's Sunday-based weekday index in one timezone. */
export function zonedWeekday(date: Date, timeZone: string): number {
	const weekday = formatter(timeZone, { weekday: 'short' }).format(date);
	const index = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
	if (index < 0) throw new Error(`Unexpected zoned weekday: ${weekday}`);
	return index;
}

/** Return the short timezone name active at an exact instant, such as EDT, PDT, or GMT+1. */
export function zonedTimeLabel(date: Date, timeZone: string): string {
	const part = formatter(timeZone, { timeZoneName: 'short' })
		.formatToParts(date)
		.find((candidate) => candidate.type === 'timeZoneName');
	return part?.value ?? timeZone;
}

function timeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
	const parts = formatter(timeZone, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(date);
	const asUtc = Date.UTC(
		numericPart(parts, 'year'),
		numericPart(parts, 'month') - 1,
		numericPart(parts, 'day'),
		numericPart(parts, 'hour'),
		numericPart(parts, 'minute'),
		numericPart(parts, 'second')
	);
	return asUtc - Math.floor(date.getTime() / 1_000) * 1_000;
}

function zonedMidnight(calendarDate: CalendarDate, timeZone: string): Date {
	const utcGuess = Date.UTC(calendarDate.year, calendarDate.month - 1, calendarDate.day);
	let candidate = new Date(utcGuess - timeZoneOffsetMilliseconds(new Date(utcGuess), timeZone));
	candidate = new Date(utcGuess - timeZoneOffsetMilliseconds(candidate, timeZone));
	return candidate;
}

/** Move by calendar days in one timezone and return local midnight on the resulting date. */
export function addZonedDays(date: Date, days: number, timeZone: string): Date {
	const local = zonedCalendarDate(date, timeZone);
	const shifted = new Date(Date.UTC(local.year, local.month - 1, local.day + days));
	return zonedMidnight(
		{
			year: shifted.getUTCFullYear(),
			month: shifted.getUTCMonth() + 1,
			day: shifted.getUTCDate()
		},
		timeZone
	);
}

/** Return midnight at the start of an instant's calendar day in one timezone. */
export function startOfZonedDay(date: Date, timeZone: string): Date {
	return addZonedDays(date, 0, timeZone);
}
