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
			<span>EVERY BUILD BEGINS</span>
			<p>with a little<br />curiosity.</p>
		</div>
		<div class="film-title">
			<p>A PERSONAL UNIVERSE</p>
			<strong>OLEN<span>IN ORBIT</span></strong><small
				>Software. Systems. A restless imagination.</small
			>
		</div>
		<div class="film-topline">
			<span>OLEN / IN ORBIT</span><span class="film-edition">AN EXPLORATION IN THREE ACTS</span>
		</div>
		<div class="film-bottomline">
			<span class="film-shot">01 / A signal in the silence</span>
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
			<span class="hero-identity">Olen Latham · Software developer</span><span class="hero-lines"
				>One human.<br />A universe<br />of builds.</span
			>
		</h1>
		<p class="orbit-summary">
			I turn the things I wish existed into things you can use. Developer tools in Rust. Web
			platforms in TypeScript. Ideas that refuse to stay ideas.
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
			<span>Origin point</span><strong>Earth.</strong><small>One restless builder.</small>
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
