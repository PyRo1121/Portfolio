<script lang="ts">
	import { Canvas } from '@threlte/core';
	import type { EngineeringDay } from '$lib/domain/github-intelligence';
	import ChangeTerrainScene from './ChangeTerrainScene.svelte';

	type Props = {
		readonly days: ReadonlyArray<EngineeringDay>;
	};

	let { days }: Props = $props();
</script>

<div class="change-terrain" aria-hidden="true">
	<Canvas dpr={[1, 1.35]} renderMode="always">
		<ChangeTerrainScene {days} />
	</Canvas>
</div>

<style>
	.change-terrain {
		height: 16rem;
		background: #111310;
	}

	:global(.change-terrain canvas) {
		display: block;
	}
</style>
