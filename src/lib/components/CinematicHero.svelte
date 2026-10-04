<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { ClientTelemetry } from '$lib/telemetry/client-telemetry';
	import { PUBLIC_CONTACT_MAILTO } from '$lib/domain/public-seo';
	import '$lib/styles/orbit.css';
	let { telemetry = null }: { telemetry?: ClientTelemetry | null } = $props();
	let stage: HTMLElement;
	let openingState = $state<'loading' | 'ready' | 'unavailable'>('loading');
	let reducedMotion = $state(false);
	let motionEnabled = $state(true);
	let retryOpening: (() => void) | undefined;
	let canvasVersion = $state(0);
	onMount(() => {
		let disposed = false;
		let cleanup: (() => void) | undefined;
		let attempt = 0;
		let sceneModule: { mountOrbit: (root: HTMLElement) => () => void } | undefined;
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
		const preference = () => (reducedMotion = reduced.matches);
		preference();
		const openingStatus = (event: Event) => {
			openingState = (event as CustomEvent<'ready' | 'unavailable'>).detail;
		};
		const motionStatus = (event: Event) => {
			motionEnabled = (event as CustomEvent<{ enabled: boolean }>).detail.enabled;
		};
		stage.addEventListener('orbit-opening', openingStatus);
		document.addEventListener('orbit-motion', motionStatus);
		reduced.addEventListener('change', preference);
		const loadOpening = async () => {
			cleanup?.();
			cleanup = undefined;
			openingState = 'loading';
			canvasVersion++;
			await tick();
			if (disposed) return;
			try {
				if (!sceneModule) {
					const url = new URL('/orbit/scene.js', window.location.href).href;
					const moduleUrl = attempt++ ? `${url}?retry=${Date.now()}` : url;
					sceneModule = await import(/* @vite-ignore */ moduleUrl);
				}
				if (!disposed && sceneModule) cleanup = sceneModule.mountOrbit(stage);
			} catch {
				if (!disposed) openingState = 'unavailable';
			}
		};
		retryOpening = () => void loadOpening();
		const timer = window.setTimeout(() => void loadOpening(), 0);
		return () => {
			disposed = true;
			window.clearTimeout(timer);
			cleanup?.();
			stage.removeEventListener('orbit-opening', openingStatus);
			document.removeEventListener('orbit-motion', motionStatus);
			reduced.removeEventListener('change', preference);
		};
	});
</script>

<section class="hero orbit-stage" bind:this={stage} aria-labelledby="portfolio-heading">
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
			<button
				type="button"
				id="replay-film"
				disabled={openingState !== 'ready' || reducedMotion}
				aria-describedby="opening-status"
				><span aria-hidden="true">▷</span> Replay the full opening</button
			><button type="button" id="warp-button" hidden>Make the jump</button><button
				type="button"
				id="lighting-toggle"
				aria-pressed="false"
				hidden>Nebula</button
			>
		</div>
		<p id="opening-status" class="opening-status" role="status">
			{#if openingState === 'unavailable'}
				The opening couldn’t load. <button type="button" onclick={() => retryOpening?.()}
					>Try again</button
				>
			{:else if openingState === 'loading'}
				Loading the opening…
			{:else if reducedMotion}
				Your device has reduced motion enabled.
			{:else if !motionEnabled}
				Motion is paused. Watching the opening resumes it.
			{/if}
		</p>
		<noscript>Enable JavaScript to watch the opening.</noscript>
	</div>
	<div class="orbit-visual">
		<span class="launch-caption" aria-hidden="true" hidden>STARBASE, TEXAS / IGNITION</span>
		<picture>
			<source media="(max-width: 600px)" srcset="/orbit/earth-poster-mobile-stage.jpg" />
			<source media="(max-width: 999px)" srcset="/orbit/earth-poster-tablet.jpg" />
			<img
				class="hero-art"
				src="/orbit/earth-poster-desktop.jpg"
				width="1440"
				height="965"
				alt=""
				fetchpriority="high"
			/>
		</picture>
		{#key canvasVersion}
			<canvas class="flight-scene" aria-hidden="true"></canvas>
		{/key}
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
