import { describe, expect, it } from 'vitest';
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from 'echarts';
import type { WeekBarChartModel } from './week-chart-model';
import { createEditorialWeekSeries } from './week-editorial-series';

const model: WeekBarChartModel = {
	labels: ['MON', 'TUE'],
	longLabels: ['Monday', 'Tuesday'],
	dates: ['2026-08-10', '2026-08-11'],
	series: [
		{ id: 'added', label: 'Added', values: [100, 20], color: '#d8a54a' },
		{ id: 'removed', label: 'Removed', values: [40, 8], color: '#ce7567' }
	],
	unit: 'lines',
	ariaDescription: 'Grouped daily change evidence.'
};

describe('createEditorialWeekSeries', () => {
	it('creates custom series with stable date identities and exact positive values', () => {
		const series = createEditorialWeekSeries(model);

		expect(series).toHaveLength(2);
		expect(series[0]).toMatchObject({
			id: 'added',
			name: 'Added',
			type: 'custom',
			coordinateSystem: 'cartesian2d',
			encode: { x: 0, y: 1, tooltip: [1] },
			data: [
				{ id: 'added-2026-08-10', name: 'Monday', value: [0, 100] },
				{ id: 'added-2026-08-11', name: 'Tuesday', value: [1, 20] }
			]
		});
		expect(series[1]).toMatchObject({
			id: 'removed',
			data: [{ value: [0, 40] }, { value: [1, 8] }]
		});
	});

	it('renders an exact-height evidence bar with an emphasis-only selection lane', () => {
		const [series] = createEditorialWeekSeries(model);
		if (typeof series?.renderItem !== 'function') throw new Error('Expected a custom render item.');

		const params = {
			coordSys: { type: 'cartesian2d', x: 40, y: 20, width: 700, height: 380 }
		} as unknown as CustomSeriesRenderItemParams;
		const api = {
			value: (dimension: number) => (dimension === 0 ? 0 : 100),
			coord: (point: number[]) => [100 + (point[0] ?? 0) * 100, 400 - (point[1] ?? 0)]
		} as unknown as CustomSeriesRenderItemAPI;

		const mark = series.renderItem(params, api);

		expect(mark).toMatchObject({
			type: 'group',
			focus: 'none',
			children: [
				{
					name: 'selected-lane',
					style: { opacity: 0 },
					emphasis: { style: { opacity: 1 } }
				},
				{ name: 'selected-rule' },
				{
					name: 'evidence-bar',
					shape: { y: 300, height: 100 },
					style: { fill: '#d8a54a', opacity: 0.76 }
				},
				{ name: 'measurement-edge' },
				{
					name: 'measurement-cap',
					shape: { y: 299, height: 2 }
				},
				{
					name: 'selected-value',
					ignore: false,
					style: { text: '100', opacity: 0 }
				}
			]
		});
	});
});
