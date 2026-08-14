<script lang="ts">
	import { Canvas } from '@threlte/core';
	import type { TodayIntelligence } from '$lib/domain/dashboard-today';
	import TodayPulseScene from './TodayPulseScene.svelte';

	type Props = {
		readonly today: TodayIntelligence;
		readonly timeLabel: string;
		readonly selectedHour: number;
		readonly onSelectHour: (hour: number) => void;
	};
	let { today, timeLabel, selectedHour, onSelectHour }: Props = $props();
	let rotationOffset = $state(0);
	let pointerId = $state<number | null>(null);
	let previousPointerX = 0;

	function hourLabel(hour: number): string {
		return `${String(hour).padStart(2, '0')}:00 ${timeLabel}`;
	}

	function handlePointerDown(event: PointerEvent): void {
		pointerId = event.pointerId;
		previousPointerX = event.clientX;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent): void {
		if (pointerId !== event.pointerId) return;
		rotationOffset += (event.clientX - previousPointerX) * 0.008;
		previousPointerX = event.clientX;
	}

	function handlePointerEnd(event: PointerEvent): void {
		if (pointerId !== event.pointerId) return;
		pointerId = null;
		const target = event.currentTarget as HTMLElement;
		if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		const direction = event.key === 'ArrowRight' ? 1 : -1;
		onSelectHour((selectedHour + direction + 24) % 24);
	}
</script>

<div
	class={pointerId !== null ? 'today-pulse dragging' : 'today-pulse'}
	role="slider"
	tabindex="0"
	aria-label={`Interactive 24-hour build pulse. ${hourLabel(selectedHour)}, ${today.hourlyCommits[selectedHour] ?? 0} commits. Drag to rotate; use arrow keys to inspect hours.`}
	aria-valuemin="0"
	aria-valuemax="23"
	aria-valuenow={selectedHour}
	aria-valuetext={`${hourLabel(selectedHour)}, ${today.hourlyCommits[selectedHour] ?? 0} commits`}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerEnd}
	onpointercancel={handlePointerEnd}
	onkeydown={handleKeyDown}
>
	<Canvas dpr={[1, 1.35]} renderMode="always">
		<TodayPulseScene {today} {selectedHour} {rotationOffset} />
	</Canvas>
	<div class="pulse-readout" aria-hidden="true">
		<span>{hourLabel(selectedHour)}</span>
		<strong>{today.hourlyCommits[selectedHour] ?? 0} commits</strong>
		<small>Drag to rotate · ← → inspect</small>
	</div>
</div>

<style>
	.today-pulse {
		position: relative;
		height: 100%;
		min-height: 0;
		background: #111310;
		cursor: grab;
		touch-action: none;
		user-select: none;
	}
	.today-pulse.dragging {
		cursor: grabbing;
	}
	.today-pulse:focus-visible {
		outline: 1px solid #d8a54a;
		outline-offset: -1px;
	}
	.pulse-readout {
		position: absolute;
		top: 0.72rem;
		left: 0.72rem;
		display: grid;
		gap: 0.15rem;
		padding: 0.5rem 0.58rem;
		border: 1px solid #30332e;
		background: rgb(17 19 16 / 78%);
		backdrop-filter: blur(8px);
		pointer-events: none;
	}
	.pulse-readout span,
	.pulse-readout small {
		font:
			500 0.53rem/1.25 'Observatory Mono',
			'JetBrains Mono Variable',
			monospace;
		color: #8f938b;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.pulse-readout strong {
		font-size: 0.76rem;
		font-weight: 600;
		color: #f2eee3;
	}
	.pulse-readout small {
		font-size: 0.46rem;
		color: #d8a54a;
	}
	:global(.today-pulse canvas) {
		display: block;
	}
</style>
