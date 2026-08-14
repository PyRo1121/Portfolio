<script lang="ts">
	import { Canvas } from '@threlte/core';
	import type { CraftIntelligence } from '$lib/domain/dashboard-craft';
	import CraftCoreScene from './CraftCoreScene.svelte';

	type Props = { readonly craft: CraftIntelligence };
	let { craft }: Props = $props();
</script>

<div class="craft-core" aria-hidden="true">
	<Canvas dpr={[1, 1.35]} renderMode="always">
		<CraftCoreScene {craft} />
	</Canvas>
</div>

<style>
	.craft-core {
		height: 100%;
		min-height: 0;
		background: #111310;
	}
	:global(.craft-core canvas) {
		display: block;
	}
</style>
