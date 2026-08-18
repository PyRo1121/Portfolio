<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	import { getClientTelemetry } from '$lib/telemetry/client-telemetry';
	import '../app.css';
	import '$lib/styles/desk.css';

	let { children }: LayoutProps = $props();
	const telemetry = getClientTelemetry();

	$effect(() => {
		telemetry?.recordPage(page.url.pathname);
	});
</script>

{@render children()}
