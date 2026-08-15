import { describe, expect, it } from 'vitest';
import type { EngineeringDay } from '$lib/domain/github-intelligence';
import { createWeekChangeChartModel, createWeekCommitChartModel } from './week-chart-model';

const days: ReadonlyArray<EngineeringDay> = [
	{
		date: '2026-08-14',
		label: 'FRI',
		longLabel: 'Friday',
		commits: 3,
		additions: 120,
		deletions: 45,
		totalChanges: 165,
		height: '100%'
	},
	{
		date: '2026-08-15',
		label: 'SAT',
		longLabel: 'Saturday',
		commits: 1,
		additions: 20,
		deletions: 70,
		totalChanges: 90,
		height: '33%'
	}
];

describe('week chart models', () => {
	it('keeps additions and removals as positive grouped magnitudes', () => {
		const model = createWeekChangeChartModel(days);
		expect(model.series).toEqual([
			{ id: 'added', label: 'Added', values: [120, 20], color: '#d8a54a' },
			{ id: 'removed', label: 'Removed', values: [45, 70], color: '#ce7567' }
		]);
	});

	it('preserves daily commit counts and labels', () => {
		const model = createWeekCommitChartModel(days);
		expect(model.labels).toEqual(['FRI', 'SAT']);
		expect(model.series[0]?.values).toEqual([3, 1]);
	});
});
