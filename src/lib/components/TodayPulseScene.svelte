<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { T, useTask } from '@threlte/core';
	import type { Group, PointLight } from 'three';
	import { buildTodayPulse } from '$lib/domain/today-pulse';
	import type { TodayIntelligence } from '$lib/domain/dashboard-today';

	type Props = {
		readonly today: TodayIntelligence;
		readonly selectedHour: number;
		readonly rotationOffset: number;
	};
	let { today, selectedHour, rotationOffset }: Props = $props();
	const segments = $derived(buildTodayPulse(today));
	let ring = $state.raw<Group>(null!);
	let light = $state.raw<PointLight>(null!);
	let elapsed = 0;

	useTask((delta) => {
		const shouldAnimate = !prefersReducedMotion.current;
		if (shouldAnimate) elapsed += Math.min(delta, 0.05);
		if (ring) {
			ring.rotation.y = rotationOffset + elapsed * 0.07;
			ring.position.y = shouldAnimate ? Math.sin(elapsed * 0.7) * 0.035 : 0;
		}
		if (light) {
			light.position.x = Math.cos(elapsed * 0.85) * 3.2;
			light.position.z = Math.sin(elapsed * 0.85) * 3.2;
			light.intensity = shouldAnimate ? 8 + Math.sin(elapsed * 1.5) * 1.6 : 8;
		}
	});
</script>

<T.OrthographicCamera
	makeDefault
	position={[5.8, 5.6, 7.4]}
	zoom={62}
	oncreate={(camera) => camera.lookAt(0, -0.3, 0)}
/>
<T.Color attach="background" args={['#111310']} />
<T.Fog attach="fog" args={['#111310', 7, 13]} />
<T.AmbientLight intensity={0.35} color="#8d9188" />
<T.DirectionalLight position={[3, 6, 4]} intensity={1.7} color="#f2eee3" />
<T.PointLight bind:ref={light} position={[3, 1.5, 0]} intensity={8} color="#d8a54a" distance={7} />

<T.Group bind:ref={ring} rotation.x={-0.06}>
	{#each segments as segment (segment.hour)}
		{@const selected = segment.hour === selectedHour}
		<T.Mesh
			position={segment.position}
			rotation.y={segment.rotationY}
			scale={selected
				? [segment.scale[0] * 1.35, segment.scale[1] * 1.08, segment.scale[2] * 1.35]
				: segment.scale}
		>
			<T.BoxGeometry />
			<T.MeshStandardMaterial
				color={selected ? '#f6f1e8' : segment.active ? '#d8a54a' : '#30332e'}
				emissive={selected ? '#d8a54a' : segment.active ? '#d8a54a' : '#161815'}
				emissiveIntensity={selected ? 0.75 : segment.intensity}
				roughness={0.5}
				metalness={0.15}
			/>
		</T.Mesh>
		{#if segment.peak}
			<T.Mesh
				position={[segment.position[0], -0.79, segment.position[2]]}
				rotation.x={-Math.PI / 2}
			>
				<T.RingGeometry args={[0.28, 0.36, 32]} />
				<T.MeshBasicMaterial color="#d8a54a" transparent opacity={0.35} depthWrite={false} />
			</T.Mesh>
		{/if}
	{/each}
	<T.RingGeometry />
	<T.GridHelper args={[7, 14, '#30332e', '#20221f']} position.y={-0.85} />
</T.Group>
