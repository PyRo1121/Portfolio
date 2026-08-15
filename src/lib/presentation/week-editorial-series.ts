import type {
	CustomSeriesOption,
	CustomSeriesRenderItem,
	CustomSeriesRenderItemAPI,
	CustomSeriesRenderItemParams,
	CustomSeriesRenderItemReturn
} from 'echarts';
import type { WeekBarChartModel, WeekBarSeries } from '$lib/presentation/week-chart-model';

const integerFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1
});

const SELECTED_LANE_FILL = 'rgba(216, 165, 74, 0.085)';
const SELECTED_RULE = 'rgba(216, 165, 74, 0.72)';
const LABEL_COLOR = '#f1f0eb';
const MONO_FONT = '600 9px JetBrains Mono Variable, monospace';

type CartesianBounds = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

type SeriesLayout = {
	readonly index: number;
	readonly count: number;
};

type EditorialMarkGeometry = {
	readonly categoryCenter: number;
	readonly categoryWidth: number;
	readonly barLeft: number;
	readonly barWidth: number;
	readonly valueY: number;
	readonly zeroY: number;
	readonly barHeight: number;
};

function finiteNumber(value: unknown): number | null {
	const numericValue = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(numericValue) ? numericValue : null;
}

function cartesianBounds(params: CustomSeriesRenderItemParams): CartesianBounds | null {
	const candidate = params.coordSys as CustomSeriesRenderItemParams['coordSys'] &
		Partial<CartesianBounds>;
	const x = finiteNumber(candidate.x);
	const y = finiteNumber(candidate.y);
	const width = finiteNumber(candidate.width);
	const height = finiteNumber(candidate.height);
	return x === null || y === null || width === null || height === null
		? null
		: { x, y, width, height };
}

function markGeometry(
	api: CustomSeriesRenderItemAPI,
	bounds: CartesianBounds,
	categoryCount: number,
	seriesLayout: SeriesLayout
): EditorialMarkGeometry | null {
	const categoryIndex = finiteNumber(api.value(0));
	const value = finiteNumber(api.value(1));
	if (categoryIndex === null || value === null) return null;

	const valueCoordinate = api.coord([categoryIndex, value]);
	const zeroCoordinate = api.coord([categoryIndex, 0]);
	const categoryCenter = finiteNumber(valueCoordinate[0]);
	const valueY = finiteNumber(valueCoordinate[1]);
	const zeroY = finiteNumber(zeroCoordinate[1]);
	if (categoryCenter === null || valueY === null || zeroY === null) return null;

	const categoryWidth = bounds.width / Math.max(1, categoryCount);
	const barWidth = categoryWidth * (seriesLayout.count === 1 ? 0.34 : 0.18);
	const offset =
		seriesLayout.count === 1
			? 0
			: (seriesLayout.index - (seriesLayout.count - 1) / 2) * categoryWidth * 0.24;
	return {
		categoryCenter,
		categoryWidth,
		barLeft: categoryCenter + offset - barWidth / 2,
		barWidth,
		valueY,
		zeroY,
		barHeight: Math.max(0, zeroY - valueY)
	};
}

function createRenderItem(
	model: WeekBarChartModel,
	series: WeekBarSeries,
	seriesIndex: number
): CustomSeriesRenderItem {
	const isLaneOwner = seriesIndex === 0;
	return (params, api): CustomSeriesRenderItemReturn => {
		const bounds = cartesianBounds(params);
		if (bounds === null) return undefined;
		const geometry = markGeometry(api, bounds, model.labels.length, {
			index: seriesIndex,
			count: model.series.length
		});
		if (geometry === null) return undefined;

		const value = finiteNumber(api.value(1)) ?? 0;
		const laneWidth = geometry.categoryWidth * 0.82;
		const minimumLabelWidth = model.series.length === 1 ? 420 : 540;
		const showDirectLabel =
			bounds.width >= minimumLabelWidth && (model.series.length === 1 || geometry.barHeight >= 28);
		const labelInside = geometry.barHeight > 34 || geometry.valueY < bounds.y + 20;
		const labelY = labelInside ? geometry.valueY + 7 : geometry.valueY - 7;

		return {
			type: 'group',
			focus: 'none',
			children: [
				{
					type: 'rect',
					name: 'selected-lane',
					ignore: !isLaneOwner,
					shape: {
						x: geometry.categoryCenter - laneWidth / 2,
						y: bounds.y,
						width: laneWidth,
						height: bounds.height
					},
					style: { fill: SELECTED_LANE_FILL, opacity: 0 },
					emphasis: { style: { opacity: 1 } },
					silent: true,
					z2: -4
				},
				{
					type: 'line',
					name: 'selected-rule',
					ignore: !isLaneOwner,
					shape: {
						x1: geometry.categoryCenter - laneWidth / 2,
						y1: bounds.y,
						x2: geometry.categoryCenter - laneWidth / 2,
						y2: bounds.y + bounds.height
					},
					style: { stroke: SELECTED_RULE, lineWidth: 1, opacity: 0 },
					emphasis: { style: { opacity: 1 } },
					silent: true,
					z2: -3
				},
				{
					type: 'rect',
					name: 'evidence-bar',
					shape: {
						x: geometry.barLeft,
						y: geometry.valueY,
						width: geometry.barWidth,
						height: geometry.barHeight,
						r: [2, 2, 0, 0]
					},
					style: { fill: series.color, opacity: 0.76 },
					emphasis: { style: { opacity: 1 } },
					transition: ['shape'],
					z2: 2
				},
				{
					type: 'line',
					name: 'measurement-edge',
					shape: {
						x1: geometry.barLeft + 1,
						y1: geometry.valueY + 2,
						x2: geometry.barLeft + 1,
						y2: geometry.zeroY
					},
					style: { stroke: 'rgba(255, 255, 255, 0.28)', lineWidth: 1 },
					silent: true,
					z2: 3
				},
				{
					type: 'rect',
					name: 'measurement-cap',
					shape: {
						x: geometry.barLeft - 2,
						y: geometry.valueY - 1,
						width: geometry.barWidth + 4,
						height: 2
					},
					style: { fill: series.color, opacity: value === 0 ? 0.3 : 1 },
					emphasis: { style: { opacity: 1 } },
					transition: ['shape'],
					z2: 4
				},
				{
					type: 'text',
					name: 'selected-value',
					ignore: !showDirectLabel,
					style: {
						x: geometry.barLeft + geometry.barWidth / 2,
						y: labelY,
						text: compactFormatter.format(value),
						font: MONO_FONT,
						fill: LABEL_COLOR,
						align: 'center',
						verticalAlign: labelInside ? 'top' : 'bottom',
						opacity: 0
					},
					emphasis: { style: { opacity: 1 } },
					silent: true,
					z2: 6
				}
			]
		};
	};
}

/** Build product-specific custom ECharts series without changing measured magnitudes. */
export function createEditorialWeekSeries(model: WeekBarChartModel): CustomSeriesOption[] {
	return model.series.map((series, seriesIndex) => ({
		id: series.id,
		name: series.label,
		type: 'custom',
		coordinateSystem: 'cartesian2d',
		renderItem: createRenderItem(model, series, seriesIndex),
		data: model.dates.map((date, index) => ({
			id: `${series.id}-${date}`,
			name: model.longLabels[index] ?? model.labels[index] ?? date,
			value: [index, series.values[index] ?? 0]
		})),
		encode: {
			x: 0,
			y: 1,
			tooltip: [1],
			itemName: 0
		},
		clip: true,
		silent: false,
		itemStyle: { color: series.color },
		animationDuration: 420,
		animationDurationUpdate: 240,
		tooltip: {
			valueFormatter: (value) => {
				const numericValue = finiteNumber(value) ?? 0;
				return `${integerFormatter.format(numericValue)} ${model.unit}`;
			}
		}
	}));
}
