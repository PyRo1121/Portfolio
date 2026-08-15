<script lang="ts">
	import type { WeekBarChartModel } from '$lib/presentation/week-chart-model';
	import { weekBarChart } from '$lib/presentation/week-echarts';

	type Props = {
		readonly model: WeekBarChartModel;
		readonly onSelect: (index: number) => void;
	};

	let { model, onSelect }: Props = $props();
</script>

<div
	class="week-bar-chart"
	role="slider"
	tabindex="0"
	aria-valuemin="0"
	aria-valuemax={Math.max(0, model.labels.length - 1)}
	aria-valuenow="0"
	aria-valuetext={model.longLabels[0] ?? 'No day available'}
	aria-label={`${model.ariaDescription} Use arrow keys to inspect each day.`}
	{@attach weekBarChart(model, onSelect)}
></div>

<style>
	.week-bar-chart {
		width: 100%;
		height: 100%;
		min-height: 0;
		outline: none;
	}
	.week-bar-chart:focus-visible {
		box-shadow: inset 0 0 0 1px var(--accent);
	}
</style>
