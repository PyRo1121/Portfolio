import { CustomChart, type CustomSeriesOption } from 'echarts/charts';
import {
	AriaComponent,
	GridComponent,
	TooltipComponent,
	type AriaComponentOption,
	type GridComponentOption,
	type TooltipComponentOption
} from 'echarts/components';
import * as echarts from 'echarts/core';
import type { ComposeOption, EChartsType } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { WeekBarChartModel } from '$lib/presentation/week-chart-model';
import { createEditorialWeekSeries } from '$lib/presentation/week-editorial-series';

type WeekBarChartOption = ComposeOption<
	CustomSeriesOption | GridComponentOption | TooltipComponentOption | AriaComponentOption
>;

type ChartSelectionEvent = {
	readonly dataIndex?: number;
};

echarts.use([CustomChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer]);

const integerFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1
});

function axisValue(value: number): string {
	return Math.abs(value) < 1_000 ? integerFormatter.format(value) : compactFormatter.format(value);
}

function chartOption(model: WeekBarChartModel): WeekBarChartOption {
	const reducedMotion =
		globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
	return {
		animation: !reducedMotion,
		animationDuration: reducedMotion ? 0 : 420,
		animationEasing: 'cubicOut',
		aria: {
			enabled: true,
			description: model.ariaDescription
		},
		backgroundColor: 'transparent',
		grid: {
			left: 14,
			right: 14,
			top: 24,
			bottom: 10,
			containLabel: true
		},
		tooltip: {
			trigger: 'axis',
			confine: true,
			axisPointer: {
				type: 'line',
				lineStyle: { color: 'rgba(216, 165, 74, 0.42)', width: 1 }
			},
			backgroundColor: 'rgba(17, 20, 22, 0.98)',
			borderColor: 'rgba(216, 165, 74, 0.46)',
			borderWidth: 1,
			padding: [9, 11],
			textStyle: {
				color: '#f1f0eb',
				fontFamily: 'JetBrains Mono Variable, monospace',
				fontSize: 11,
				lineHeight: 18
			}
		},
		xAxis: {
			type: 'category',
			data: [...model.labels],
			axisLine: { lineStyle: { color: 'rgba(235, 235, 229, 0.18)' } },
			axisTick: { show: false },
			axisLabel: {
				color: 'rgba(235, 235, 229, 0.58)',
				fontFamily: 'JetBrains Mono Variable, monospace',
				fontSize: 10,
				fontWeight: 550,
				margin: 10
			}
		},
		yAxis: {
			type: 'value',
			min: 0,
			splitNumber: 4,
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: {
				color: 'rgba(235, 235, 229, 0.45)',
				fontFamily: 'JetBrains Mono Variable, monospace',
				fontSize: 9,
				formatter: axisValue
			},
			splitLine: {
				lineStyle: { color: 'rgba(235, 235, 229, 0.08)', width: 1 }
			}
		},
		series: createEditorialWeekSeries(model)
	};
}

function selectionLabel(model: WeekBarChartModel, index: number): string {
	const values = model.series
		.map(
			(series) =>
				`${series.label}: ${integerFormatter.format(series.values[index] ?? 0)} ${model.unit}`
		)
		.join(', ');
	return `${model.longLabels[index] ?? model.labels[index] ?? 'Selected day'}. ${values}.`;
}

function updateAriaSelection(element: HTMLElement, model: WeekBarChartModel, index: number): void {
	element.setAttribute('aria-valuenow', String(index));
	element.setAttribute('aria-valuetext', selectionLabel(model, index));
}

function busiestIndex(model: WeekBarChartModel): number {
	let selectedIndex = 0;
	let selectedValue = -1;
	for (let index = 0; index < model.labels.length; index += 1) {
		const value = model.series.reduce((total, series) => total + (series.values[index] ?? 0), 0);
		if (value > selectedValue) {
			selectedIndex = index;
			selectedValue = value;
		}
	}
	return selectedIndex;
}

/** Attach one responsive, keyboard-inspectable ECharts bar chart to a mounted element. */
export function weekBarChart(
	model: WeekBarChartModel,
	onSelect: (index: number) => void
): (element: HTMLElement) => () => void {
	return (element) => {
		const chart: EChartsType = echarts.init(element, undefined, { renderer: 'svg' });
		let selectedIndex = busiestIndex(model);
		chart.setOption(chartOption(model));

		const select = (index: number, showTooltip: boolean): void => {
			selectedIndex = Math.max(0, Math.min(model.labels.length - 1, index));
			updateAriaSelection(element, model, selectedIndex);
			onSelect(selectedIndex);
			chart.dispatchAction({ type: 'downplay' });
			for (let seriesIndex = 0; seriesIndex < model.series.length; seriesIndex += 1) {
				chart.dispatchAction({ type: 'highlight', seriesIndex, dataIndex: selectedIndex });
			}
			if (showTooltip) {
				chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: selectedIndex });
			}
		};
		const selectFromChart = (event: ChartSelectionEvent): void => {
			if (typeof event.dataIndex === 'number') select(event.dataIndex, false);
		};
		const handleKeydown = (event: KeyboardEvent): void => {
			let nextIndex = selectedIndex;
			switch (event.key) {
				case 'ArrowLeft':
				case 'ArrowDown':
					nextIndex -= 1;
					break;
				case 'ArrowRight':
				case 'ArrowUp':
					nextIndex += 1;
					break;
				case 'Home':
					nextIndex = 0;
					break;
				case 'End':
					nextIndex = model.labels.length - 1;
					break;
				case 'Escape':
					chart.dispatchAction({ type: 'hideTip' });
					return;
				default:
					return;
			}
			event.preventDefault();
			select(nextIndex, true);
		};

		select(selectedIndex, false);
		chart.on('mouseover', selectFromChart);
		chart.on('click', selectFromChart);
		element.addEventListener('keydown', handleKeydown);
		const resizeObserver = new ResizeObserver(() => chart.resize());
		resizeObserver.observe(element);

		return () => {
			resizeObserver.disconnect();
			element.removeEventListener('keydown', handleKeydown);
			chart.dispose();
		};
	};
}
