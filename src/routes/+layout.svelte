<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	import { loadClientTelemetry } from '$lib/telemetry/telemetry-gate';
	import type { ClientTelemetry } from '$lib/telemetry/client-telemetry';
	import { IconContext } from 'phosphor-svelte';
	import '../app.css';
	import '$lib/styles/desk.css';

	let { children }: LayoutProps = $props();
	let telemetry = $state<ClientTelemetry | null>(null);
	loadClientTelemetry().then((loaded) => (telemetry = loaded));

	$effect(() => {
		telemetry?.recordPage(page.url.pathname);
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="sitemap" type="application/xml" href="/sitemap.xml" />
</svelte:head>

<IconContext values={{ 'aria-hidden': true }}>{@render children()}</IconContext>
