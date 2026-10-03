<script lang="ts">
	import { onMount } from 'svelte';
	let canvas: HTMLCanvasElement;
	onMount(() => {
		let disposed = false;
		let cleanup: (() => void) | undefined;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				observer.disconnect();
				const url = new URL('/orbit/scene.js', window.location.href).href;
				void import(/* @vite-ignore */ url)
					.then((module: { mountPortfolioSpace: (canvas: HTMLCanvasElement) => () => void }) => {
						if (!disposed) cleanup = module.mountPortfolioSpace(canvas);
					})
					.catch(() => {
						/* The static lighting and all project content remain visible. */
					});
			},
			{ rootMargin: '0px' }
		);
		observer.observe(canvas.parentElement!);
		return () => {
			disposed = true;
			observer.disconnect();
			cleanup?.();
		};
	});
</script>

<div class="portfolio-space" aria-hidden="true"><canvas bind:this={canvas}></canvas></div>
