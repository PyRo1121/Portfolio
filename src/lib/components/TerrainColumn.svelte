<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { T, useTask } from '@threlte/core';
	import type { Mesh } from 'three';
	import type { ChangeTerrainColumn } from '$lib/domain/change-terrain';

	type Props = {
		readonly column: ChangeTerrainColumn;
		readonly delay: number;
	};

	let { column, delay }: Props = $props();
	let mesh = $state.raw<Mesh>(null!);
	let elapsed = 0;

	useTask(
		(delta) => {
			if (!mesh) return;
			elapsed += Math.min(delta, 0.05);
			const progress = Math.min(1, Math.max(0, (elapsed - delay) / 0.72));
			const eased = 1 - Math.pow(1 - progress, 4);
			const height = Math.max(0.01, column.scale[1] * eased);
			mesh.scale.y = height;
			mesh.position.y = -0.9 + height / 2;
		},
		{ running: () => !prefersReducedMotion.current }
	);
</script>

<T.Mesh
	bind:ref={mesh}
	position={[
		column.position[0],
		prefersReducedMotion.current ? column.position[1] : -0.895,
		column.position[2]
	]}
	scale={[column.scale[0], prefersReducedMotion.current ? column.scale[1] : 0.01, column.scale[2]]}
>
	<T.BoxGeometry />
	<T.MeshStandardMaterial
		color={column.color}
		emissive={column.color}
		emissiveIntensity={column.emissiveIntensity}
		roughness={0.48}
		metalness={0.16}
	/>
</T.Mesh>
