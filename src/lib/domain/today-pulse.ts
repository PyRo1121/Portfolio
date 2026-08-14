import type { TodayIntelligence } from './dashboard-today';

/** One data-driven extrusion in the 24-hour Today activity ring. */
export type TodayPulseSegment = {
	readonly hour: number;
	readonly position: [number, number, number];
	readonly rotationY: number;
	readonly scale: [number, number, number];
	readonly intensity: number;
	readonly active: boolean;
	readonly peak: boolean;
};

/** Project hourly commit counts into a radial Three.js instrument. */
export function buildTodayPulse(today: TodayIntelligence): ReadonlyArray<TodayPulseSegment> {
	const maximum = Math.max(1, ...today.hourlyCommits);
	const peakHour = today.hourlyCommits.reduce(
		(best, value, index) => (value > (today.hourlyCommits[best] ?? 0) ? index : best),
		0
	);
	return today.hourlyCommits.map((commits, hour) => {
		const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
		const ratio = commits / maximum;
		const height = commits === 0 ? 0.05 : 0.18 + ratio * 1.85;
		const radius = 2.25;
		return {
			hour,
			position: [Math.cos(angle) * radius, height / 2 - 0.85, Math.sin(angle) * radius],
			rotationY: -angle,
			scale: [0.16, height, 0.38],
			intensity: commits === 0 ? 0.02 : 0.15 + ratio * 0.28,
			active: commits > 0,
			peak: commits > 0 && hour === peakHour
		};
	});
}
