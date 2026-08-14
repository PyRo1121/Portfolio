import { describe, expect, it } from 'vitest';
import {
	addZonedDays,
	normalizeTimeZone,
	startOfZonedDay,
	zonedDateKey,
	zonedHour,
	zonedTimeLabel
} from './dashboard-time';

const EASTERN = 'America/New_York';

describe('viewer-local dashboard time', () => {
	it('projects the same instant into each viewer timezone', () => {
		const instant = new Date('2026-08-13T02:30:00Z');
		expect(zonedDateKey(instant, EASTERN)).toBe('2026-08-12');
		expect(zonedHour(instant, EASTERN)).toBe(22);
		expect(zonedDateKey(instant, 'Asia/Tokyo')).toBe('2026-08-13');
		expect(zonedHour(instant, 'Asia/Tokyo')).toBe(11);
	});

	it('uses EST in winter and EDT in summer', () => {
		expect(startOfZonedDay(new Date('2026-01-13T18:00:00Z'), EASTERN).toISOString()).toBe(
			'2026-01-13T05:00:00.000Z'
		);
		expect(startOfZonedDay(new Date('2026-08-13T18:00:00Z'), EASTERN).toISOString()).toBe(
			'2026-08-13T04:00:00.000Z'
		);
		expect(zonedTimeLabel(new Date('2026-01-13T18:00:00Z'), EASTERN)).toBe('EST');
		expect(zonedTimeLabel(new Date('2026-08-13T18:00:00Z'), EASTERN)).toBe('EDT');
	});

	it('advances by calendar days across spring-forward instead of adding fixed hours', () => {
		const before = startOfZonedDay(new Date('2026-03-07T18:00:00Z'), EASTERN);
		const after = addZonedDays(before, 2, EASTERN);
		expect(before.toISOString()).toBe('2026-03-07T05:00:00.000Z');
		expect(after.toISOString()).toBe('2026-03-09T04:00:00.000Z');
		expect(after.getTime() - before.getTime()).toBe(47 * 3_600_000);
	});

	it('rejects unsupported zones through a deterministic fallback', () => {
		expect(normalizeTimeZone('Not/A_Zone', 'UTC')).toBe('UTC');
	});
});
