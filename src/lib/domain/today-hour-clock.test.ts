import { describe, expect, it } from 'vitest';
import { buildTodayHourClock } from './today-hour-clock';

describe('buildTodayHourClock', () => {
	it('maps each hour to a stable clock position and normalized activity bar', () => {
		const hourlyCommits = Array.from({ length: 24 }, () => 0);
		hourlyCommits[6] = 2;
		hourlyCommits[12] = 4;

		const segments = buildTodayHourClock(hourlyCommits);

		expect(segments).toHaveLength(24);
		expect(segments[0]).toMatchObject({ hour: 0, angleDegrees: 0, active: false });
		expect(segments[6]).toMatchObject({
			hour: 6,
			commits: 2,
			angleDegrees: 90,
			activityRatio: 0.5,
			barScale: 0.62,
			active: true,
			peak: false
		});
		expect(segments[12]).toMatchObject({
			hour: 12,
			commits: 4,
			angleDegrees: 180,
			activityRatio: 1,
			barScale: 1,
			active: true,
			peak: true
		});
	});

	it('retains visible zero-hour targets without presenting them as activity', () => {
		const segments = buildTodayHourClock(Array.from({ length: 24 }, () => 0));

		expect(segments.every((segment) => segment.active === false)).toBe(true);
		expect(segments.every((segment) => segment.peak === false)).toBe(true);
		expect(segments.every((segment) => segment.barScale === 0.08)).toBe(true);
	});
});
