<script lang="ts">
	import { onMount } from 'svelte';
	import type { ClientTelemetry } from '$lib/telemetry/client-telemetry';
	import { PUBLIC_CONTACT_MAILTO } from '$lib/domain/public-seo';
	import '$lib/styles/orbit.css';
	let { telemetry = null }: { telemetry?: ClientTelemetry | null } = $props();
	let stage: HTMLElement;
	onMount(() => {
		let disposed = false;
		let cleanup: (() => void) | undefined;
		const timer = window.setTimeout(() => {
			const url = new URL('/orbit/scene.js', window.location.href).href;
			void import(/* @vite-ignore */ url)
				.then((module: { mountOrbit: (root: HTMLElement) => () => void }) => {
					if (!disposed) cleanup = module.mountOrbit(stage);
				})
				.catch(() => {
					/* The prerendered illustrated portfolio remains usable. */
				});
		}, 350);
		return () => {
			disposed = true;
			window.clearTimeout(timer);
			cleanup?.();
		};
	});
</script>

<section class="hero orbit-stage" bind:this={stage} aria-labelledby="portfolio-heading">
	<img
		class="hero-art"
		src="/orbit/space-hero.png"
		width="1672"
		height="941"
		alt=""
		fetchpriority="high"
	/>
	<canvas class="flight-scene" aria-hidden="true"></canvas>
	<div class="film-overlay" hidden role="region" aria-label="Opening film">
		<div class="film-letterbox top"></div>
		<div class="film-letterbox bottom"></div>
		<div class="film-veil" aria-hidden="true"></div>
		<div class="film-prelude">
			<span>IT STARTS WITH A QUESTION</span>
			<p>Could this<br />work better?</p>
		</div>
		<div class="film-title">
			<p>FROM IDEA TO RELEASE</p>
			<strong>MAKE<span>IT REAL</span></strong><small
				>Tools, experiments, and the decisions behind them.</small
			>
		</div>
		<div class="film-topline">
			<span>SELECTED WORK / 2026</span><span class="film-edition">A SHORT INTRODUCTION</span>
		</div>
		<div class="film-bottomline">
			<span class="film-shot">01 / Departure</span>
			<div>
				<button type="button" id="film-sound" aria-pressed="false">Sound off</button><button
					type="button"
					id="skip-film">Skip opening <span aria-hidden="true">↗</span></button
				>
			</div>
		</div>
		<div class="film-progress" aria-hidden="true"><span></span></div>
	</div>
	<div class="hero-content">
		<h1 id="portfolio-heading">
			<span class="hero-identity">Software developer</span><span class="hero-lines"
				>I build tools<br />I want<br />to use.</span
			>
		</h1>
		<p class="orbit-summary">
			Rust command-line tools, TypeScript apps, and the infrastructure behind them. Explore the
			projects, the code, and the decisions that shaped them.
		</p>
		<div class="orbit-actions">
			<a class="orbit-button primary" href="#work">Explore the work</a><a
				class="orbit-button"
				href={PUBLIC_CONTACT_MAILTO}
				rel="external"
				onclick={() => telemetry?.recordContact('email_summary')}>Start a conversation</a
			>
		</div>
		<div class="orbit-controls">
			<button type="button" id="replay-film" hidden
				><span aria-hidden="true">▷</span> Replay the opening</button
			><button type="button" id="warp-button" hidden>Make the jump</button><button
				type="button"
				id="lighting-toggle"
				aria-pressed="false"
				hidden>Nebula</button
			>
		</div>
	</div>
	<div class="hero-beacon" aria-hidden="true">
		<div class="beacon-reading">
			<span>03 / Home planet</span><strong>Earth</strong><small>McKinney, Texas</small>
		</div>
	</div>
	<div class="orbit-support">
		<span>McKinney, Texas · Open to software development roles</span><a href="#work"
			>Discover what’s in orbit <span aria-hidden="true">↓</span></a
		>
	</div>
	<button type="button" id="motion-toggle" class="motion-toggle" aria-pressed="false" hidden
		>Pause motion</button
	>
</section>
