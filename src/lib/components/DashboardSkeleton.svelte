<script lang="ts">
	type Props = {
		readonly failed: boolean;
		readonly message: string;
		readonly onRetry: () => void;
	};
	let { failed, message, onRetry }: Props = $props();
	const bars = [0.18, 0.32, 0.25, 0.58, 0.9, 0.62, 0.2, 0.44, 0.3, 0.7, 0.38, 0.16];
</script>

<div class="dashboard-skeleton" role="status" aria-live="polite">
	<section class="skeleton-summary">
		<div class="skeleton-line skeleton-line--short"></div>
		<div class="skeleton-number"></div>
		<div class="skeleton-line"></div>
		<div class="skeleton-line skeleton-line--medium"></div>
		<div class="skeleton-cells"><i></i><i></i><i></i></div>
	</section>
	<section class="skeleton-visual">
		<header><span>Loading saved dashboard</span><small>GitHub data</small></header>
		<div class="skeleton-ring"></div>
		<div class="skeleton-bars">
			{#each bars as height, index (index)}<i style={`--height:${height}`}></i>{/each}
		</div>
	</section>
	<section class="skeleton-side">
		{#each Array.from({ length: 4 }, (_, index) => index) as index (index)}<div>
				<i></i><span></span>
			</div>{/each}
	</section>
	<footer>
		<p>
			{failed
				? message || 'GitHub refresh is delayed. No verified snapshot has been cached yet.'
				: 'Loading the first verified snapshot. Later visits open instantly from the last-known-good cache.'}
		</p>
		{#if failed}<button type="button" onclick={onRetry}>Try refresh again</button>{/if}
	</footer>
</div>

<style>
	.dashboard-skeleton {
		display: grid;
		height: 100%;
		min-height: 0;
		grid-template-columns: minmax(15rem, 0.65fr) minmax(26rem, 1.45fr) minmax(16rem, 0.75fr);
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 1px;
		border: 1px solid rgba(239, 238, 233, 0.1);
		background: rgba(239, 238, 233, 0.1);
		color: #8e9189;
	}
	section {
		min-width: 0;
		min-height: 0;
		background: #121310;
	}
	.skeleton-summary {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.3rem;
	}
	.skeleton-line,
	.skeleton-number,
	.skeleton-cells i,
	.skeleton-side i,
	.skeleton-side span {
		background: linear-gradient(90deg, #1a1c18 20%, #282a25 45%, #1a1c18 70%);
		background-size: 220% 100%;
		animation: sweep 1.7s ease-in-out infinite;
	}
	.skeleton-line {
		width: 75%;
		height: 0.55rem;
	}
	.skeleton-line--short {
		width: 38%;
	}
	.skeleton-line--medium {
		width: 58%;
	}
	.skeleton-number {
		width: 58%;
		height: 9rem;
		margin: auto 0;
	}
	.skeleton-cells {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		margin-top: auto;
		background: rgba(239, 238, 233, 0.1);
	}
	.skeleton-cells i {
		height: 3.5rem;
	}
	.skeleton-visual {
		position: relative;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) 32%;
		overflow: hidden;
	}
	header {
		display: flex;
		justify-content: space-between;
		padding: 0.7rem;
		border-bottom: 1px solid rgba(239, 238, 233, 0.1);
		font:
			500 0.58rem/1.2 'Observatory Mono',
			monospace;
		text-transform: uppercase;
	}
	.skeleton-ring {
		align-self: center;
		justify-self: center;
		width: min(54%, 18rem);
		aspect-ratio: 1;
		border: 1.2rem solid #20221e;
		border-right-color: #d8a54a;
		border-radius: 50%;
		animation: turn 5s linear infinite;
	}
	.skeleton-bars {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		align-items: end;
		gap: 0.25rem;
		padding: 0.8rem;
		border-top: 1px solid rgba(239, 238, 233, 0.1);
	}
	.skeleton-bars i {
		height: calc(var(--height) * 100%);
		background: #30332e;
		transform-origin: bottom;
	}
	.skeleton-side {
		display: grid;
		grid-template-rows: repeat(4, 1fr);
	}
	.skeleton-side > div {
		display: grid;
		align-content: center;
		gap: 0.6rem;
		padding: 1rem;
		border-bottom: 1px solid rgba(239, 238, 233, 0.1);
	}
	.skeleton-side i {
		width: 42%;
		height: 0.5rem;
	}
	.skeleton-side span {
		width: 70%;
		height: 1.9rem;
	}
	footer {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 0.9rem;
		background: #0f100e;
	}
	footer p {
		margin: 0;
		font:
			500 0.58rem/1.3 'Observatory Mono',
			monospace;
	}
	footer button {
		padding: 0.4rem 0.55rem;
		border: 1px solid rgba(239, 238, 233, 0.2);
		background: transparent;
		color: #efeee9;
		font:
			500 0.55rem/1 'Observatory Mono',
			monospace;
		cursor: pointer;
	}
	@keyframes sweep {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
	}
	@keyframes turn {
		to {
			transform: rotate(1turn);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.skeleton-line,
		.skeleton-number,
		.skeleton-cells i,
		.skeleton-side i,
		.skeleton-side span,
		.skeleton-ring {
			animation: none;
		}
	}
</style>
