<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { T, useTask } from '@threlte/core';
	import {
		MathUtils,
		type Group,
		type Mesh,
		type OrthographicCamera,
		type PointLight
	} from 'three';
	import { buildChangeTerrain } from '$lib/domain/change-terrain';
	import type { EngineeringDay } from '$lib/domain/github-intelligence';
	import TerrainColumn from './TerrainColumn.svelte';

	type Props = {
		readonly days: ReadonlyArray<EngineeringDay>;
	};

	let { days }: Props = $props();
	const columns = $derived(buildChangeTerrain(days));
	let camera = $state.raw<OrthographicCamera>(null!);
	let terrain = $state.raw<Group>(null!);
	let light = $state.raw<PointLight>(null!);
	let halo = $state.raw<Mesh>(null!);
	let elapsed = 0;

	useTask(
		(delta) => {
			elapsed += Math.min(delta, 0.05);
			if (terrain) {
				terrain.rotation.y = -0.35 + Math.sin(elapsed * 0.24) * 0.075;
				terrain.position.y = Math.sin(elapsed * 0.65) * 0.035;
			}
			if (camera) {
				camera.position.x = 5.8 + Math.sin(elapsed * 0.18) * 0.32;
				camera.position.z = 7.4 + Math.cos(elapsed * 0.18) * 0.24;
				camera.lookAt(0, -0.35, 0);
			}
			if (light) {
				light.position.x = Math.sin(elapsed * 0.7) * 4.2;
				light.position.z = Math.cos(elapsed * 0.7) * 3.5;
				light.intensity = 10 + Math.sin(elapsed * 1.15) * 2;
			}
			if (halo) {
				const pulse = 1 + (Math.sin(elapsed * 2.2) + 1) * 0.15;
				halo.scale.setScalar(pulse);
				const material = Array.isArray(halo.material) ? halo.material[0] : halo.material;
				if (material && 'opacity' in material)
					material.opacity = MathUtils.lerp(0.08, 0.2, (pulse - 1) / 0.3);
			}
		},
		{ running: () => !prefersReducedMotion.current }
	);
</script>

<T.OrthographicCamera
	bind:ref={camera}
	makeDefault
	position={[5.8, 4.6, 7.4]}
	zoom={58}
	oncreate={(createdCamera) => createdCamera.lookAt(0, -0.35, 0)}
/>
<T.Color attach="background" args={['#111310']} />
<T.Fog attach="fog" args={['#111310', 7, 13]} />
<T.AmbientLight intensity={0.42} color="#8d9188" />
<T.DirectionalLight position={[4, 6, 4]} intensity={1.8} color="#e8e4d9" />
<T.PointLight bind:ref={light} position={[-4, 2, 3]} intensity={11} color="#d8a54a" distance={8} />

<T.Group bind:ref={terrain} rotation.y={-0.35} rotation.x={-0.08}>
	{#each columns as column, index (column.id)}
		<TerrainColumn {column} delay={index * 0.055} />
		{#if index === columns.length - 2}
			<T.Mesh
				bind:ref={halo}
				position={[column.position[0], -0.84, 0.22]}
				rotation.x={-Math.PI / 2}
			>
				<T.RingGeometry args={[0.38, 0.48, 48]} />
				<T.MeshBasicMaterial color="#d8a54a" transparent opacity={0.12} depthWrite={false} />
			</T.Mesh>
		{/if}
	{/each}
	<T.GridHelper args={[6, 12, '#373a35', '#20231f']} position.y={-0.9} />
</T.Group>
