/** One inspectable hour in the Today radial activity selector. */
export type TodayHourClockSegment = {
	readonly hour: number;
	readonly commits: number;
	readonly angleDegrees: number;
	readonly activityRatio: number;
	readonly barScale: number;
	readonly active: boolean;
	readonly peak: boolean;
};

/** Project hourly commit counts into a stable 24-hour radial selector. */
export function buildTodayHourClock(
	hourlyCommits: ReadonlyArray<number>
): ReadonlyArray<TodayHourClockSegment> {
	const maximum = Math.max(1, ...hourlyCommits);
	const peakHour = hourlyCommits.reduce(
		(best, value, index) => (value > (hourlyCommits[best] ?? 0) ? index : best),
		0
	);
	return hourlyCommits.map((commits, hour) => {
		const activityRatio = commits / maximum;
		return {
			hour,
			commits,
			angleDegrees: (hour / 24) * 360,
			activityRatio,
			barScale: commits === 0 ? 0.08 : 0.24 + activityRatio * 0.76,
			active: commits > 0,
			peak: commits > 0 && hour === peakHour
		};
	});
}
