import type { EngineeringDay } from '$lib/domain/github-intelligence';

export type WeekBarSeries = {
	readonly id: 'added' | 'removed' | 'commits';
	readonly label: string;
	readonly values: ReadonlyArray<number>;
	readonly color: string;
};

export type WeekBarChartModel = {
	readonly labels: ReadonlyArray<string>;
	readonly longLabels: ReadonlyArray<string>;
	readonly dates: ReadonlyArray<string>;
	readonly series: ReadonlyArray<WeekBarSeries>;
	readonly unit: 'lines' | 'commits';
	readonly ariaDescription: string;
};

/** Build grouped positive bars so added and removed line magnitudes share one baseline. */
export function createWeekChangeChartModel(days: ReadonlyArray<EngineeringDay>): WeekBarChartModel {
	return {
		labels: days.map((day) => day.label),
		longLabels: days.map((day) => day.longLabel),
		dates: days.map((day) => day.date),
		series: [
			{
				id: 'added',
				label: 'Added',
				values: days.map((day) => day.additions),
				color: '#d8a54a'
			},
			{
				id: 'removed',
				label: 'Removed',
				values: days.map((day) => day.deletions),
				color: '#ce7567'
			}
		],
		unit: 'lines',
		ariaDescription:
			'Grouped bars compare lines added and removed for each day in the current seven-day window.'
	};
}

/** Build one exact daily commit-count series for the current viewer-local week. */
export function createWeekCommitChartModel(days: ReadonlyArray<EngineeringDay>): WeekBarChartModel {
	return {
		labels: days.map((day) => day.label),
		longLabels: days.map((day) => day.longLabel),
		dates: days.map((day) => day.date),
		series: [
			{
				id: 'commits',
				label: 'Commits',
				values: days.map((day) => day.commits),
				color: '#d8a54a'
			}
		],
		unit: 'commits',
		ariaDescription: 'Bars show exact default-branch commit counts for each viewer-local day.'
	};
}
