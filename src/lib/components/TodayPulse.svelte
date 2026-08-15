<script lang="ts">
	import { buildTodayHourClock } from '$lib/domain/today-hour-clock';
	import type { TodayIntelligence } from '$lib/domain/dashboard-today';

	type Props = {
		readonly today: TodayIntelligence;
		readonly timeLabel: string;
		readonly selectedHour: number;
		readonly onSelectHour: (hour: number) => void;
	};
	let { today, timeLabel, selectedHour, onSelectHour }: Props = $props();
	const segments = $derived(buildTodayHourClock(today.hourlyCommits));

	function hourLabel(hour: number): string {
		return `${String(hour).padStart(2, '0')}:00 ${timeLabel}`;
	}

	function selectAndFocusHour(event: KeyboardEvent, hour: number): void {
		let nextHour: number;
		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				nextHour = (hour + 23) % 24;
				break;
			case 'ArrowRight':
			case 'ArrowUp':
				nextHour = (hour + 1) % 24;
				break;
			case 'Home':
				nextHour = 0;
				break;
			case 'End':
				nextHour = 23;
				break;
			default:
				return;
		}
		event.preventDefault();
		const clock = (event.currentTarget as HTMLElement).closest('.pulse-clock');
		onSelectHour(nextHour);
		requestAnimationFrame(() => {
			clock?.querySelector<HTMLElement>(`[data-hour="${nextHour}"]`)?.focus();
		});
	}
</script>

<div class="today-pulse">
	<div
		class="pulse-clock"
		role="radiogroup"
		aria-label={`Commits across 24 viewer-local hours in ${timeLabel}. Hover, tap, or use arrow keys to inspect an hour.`}
	>
		{#each segments as segment (segment.hour)}
			<button
				type="button"
				role="radio"
				class={segment.hour === selectedHour
					? 'hour-bar selected'
					: segment.peak
						? 'hour-bar peak'
						: segment.active
							? 'hour-bar active'
							: 'hour-bar'}
				style={`--angle:${segment.angleDegrees}deg;--bar-scale:${segment.barScale}`}
				data-hour={segment.hour}
				tabindex={segment.hour === selectedHour ? 0 : -1}
				aria-checked={segment.hour === selectedHour}
				aria-label={`${hourLabel(segment.hour)}, ${segment.commits} commits${segment.peak ? ', peak hour' : ''}`}
				onpointerenter={() => onSelectHour(segment.hour)}
				onfocus={() => onSelectHour(segment.hour)}
				onclick={() => onSelectHour(segment.hour)}
				onkeydown={(event) => selectAndFocusHour(event, segment.hour)}
			>
				<i aria-hidden="true"></i>
			</button>
		{/each}

		<span class="clock-label clock-label--00" aria-hidden="true">00</span>
		<span class="clock-label clock-label--06" aria-hidden="true">06</span>
		<span class="clock-label clock-label--12" aria-hidden="true">12</span>
		<span class="clock-label clock-label--18" aria-hidden="true">18</span>

		<div class="pulse-readout" aria-live="polite">
			<span>{hourLabel(selectedHour)}</span>
			<strong>{today.hourlyCommits[selectedHour] ?? 0}</strong>
			<small>commits</small>
		</div>
	</div>
	<p>Hover or focus an hour · arrow keys move around the clock</p>
</div>

<style>
	.today-pulse {
		display: grid;
		height: 100%;
		min-height: 0;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 0.35rem;
		padding: 0.55rem 0.7rem 0.5rem;
		background: #111310;
	}
	.pulse-clock {
		position: relative;
		width: min(24rem, 88%, 52vh);
		aspect-ratio: 1;
		place-self: center;
	}
	.pulse-clock::before {
		content: '';
		position: absolute;
		inset: 7%;
		border: 1px solid #30332e;
		border-radius: 50%;
		pointer-events: none;
	}
	.hour-bar {
		position: absolute;
		top: 50%;
		left: 50%;
		width: clamp(0.72rem, 4.2%, 1rem);
		height: 46%;
		padding: 0;
		border: 0;
		background: transparent;
		transform: translate(-50%, -100%) rotate(var(--angle));
		transform-origin: 50% 100%;
		cursor: pointer;
	}
	.hour-bar i {
		position: absolute;
		top: 4%;
		left: 50%;
		display: block;
		width: 0.32rem;
		height: clamp(1.3rem, 24%, 2.6rem);
		background: #3b3e39;
		transform: translateX(-50%) scaleY(var(--bar-scale));
		transform-origin: 50% 0;
		transition:
			background 140ms ease,
			width 140ms ease,
			transform 140ms ease;
	}
	.hour-bar.active i,
	.hour-bar.peak i {
		background: #b98d42;
	}
	.hour-bar.peak i {
		width: 0.44rem;
	}
	.hour-bar.selected i {
		width: 0.5rem;
		background: #f2eee3;
	}
	.hour-bar:focus-visible {
		outline: 0;
	}
	.hour-bar:focus-visible i {
		outline: 1px solid #d8a54a;
		outline-offset: 3px;
	}
	.clock-label {
		position: absolute;
		font:
			500 0.56rem/1 'Observatory Mono',
			'JetBrains Mono Variable',
			monospace;
		color: #71766e;
		pointer-events: none;
	}
	.clock-label--00 {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}
	.clock-label--06 {
		top: 50%;
		right: 0;
		transform: translateY(-50%);
	}
	.clock-label--12 {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
	}
	.clock-label--18 {
		top: 50%;
		left: 0;
		transform: translateY(-50%);
	}
	.pulse-readout {
		position: absolute;
		top: 50%;
		left: 50%;
		display: grid;
		justify-items: center;
		gap: 0.15rem;
		width: 8rem;
		transform: translate(-50%, -50%);
		text-align: center;
		pointer-events: none;
	}
	.pulse-readout span,
	.pulse-readout small,
	.today-pulse > p {
		font:
			500 0.62rem/1.25 'Observatory Mono',
			'JetBrains Mono Variable',
			monospace;
		color: #8f938b;
	}
	.pulse-readout strong {
		font-size: clamp(1.35rem, 3vw, 2.1rem);
		font-weight: 570;
		line-height: 0.95;
		letter-spacing: -0.06em;
		color: #f2eee3;
	}
	.pulse-readout small {
		color: #d8a54a;
	}
	.today-pulse > p {
		margin: 0;
		text-align: center;
	}
</style>
