<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import DashboardPage from '../+page.svelte';

	// Reuse the public dashboard while keeping form submissions relative to /owner.
	type Props = ComponentProps<typeof DashboardPage>;
	let { data, form, params }: Props = $props();
</script>

<DashboardPage {data} {form} {params} />
