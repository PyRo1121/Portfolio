<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { T, useTask } from '@threlte/core';
	import type { Group, PointLight } from 'three';
	import type { CraftIntelligence } from '$lib/domain/dashboard-craft';

	type Props = { readonly craft: CraftIntelligence };
	let { craft }: Props = $props();
	const total = $derived(
		Math.max(
			1,
			craft.observed.successfulChecks + craft.observed.failedChecks + craft.observed.cancelledChecks
		)
	);
	const passedArc = $derived((craft.observed.successfulChecks / total) * Math.PI * 2);
	const failedArc = $derived((craft.observed.failedChecks / total) * Math.PI * 2);
	const cancelledArc = $derived((craft.observed.cancelledChecks / total) * Math.PI * 2);
	let core = $state.raw<Group>(null!);
	let light = $state.raw<PointLight>(null!);
	let elapsed = 0;

	useTask(
		(delta) => {
			elapsed += Math.min(delta, 0.05);
			if (core) {
				core.rotation.y = elapsed * 0.13;
				core.rotation.x = -0.28 + Math.sin(elapsed * 0.32) * 0.08;
			}
			if (light) {
				light.position.x = Math.cos(elapsed * 0.75) * 3.6;
				light.position.z = Math.sin(elapsed * 0.75) * 3.6;
			}
		},
		{ running: () => !prefersReducedMotion.current }
	);
</script>

<T.OrthographicCamera
	makeDefault
	position={[4.8, 3.7, 6.5]}
	zoom={72}
	oncreate={(camera) => camera.lookAt(0, 0, 0)}
/>
<T.Color attach="background" args={['#111310']} />
<T.Fog attach="fog" args={['#111310', 6, 11]} />
<T.AmbientLight intensity={0.4} color="#93978f" />
<T.DirectionalLight position={[3, 5, 4]} intensity={1.6} color="#f2eee3" />
<T.PointLight bind:ref={light} position={[3, 1, 0]} intensity={8} color="#d8a54a" distance={7} />

<T.Group bind:ref={core} rotation.x={-0.28}>
	<T.Mesh rotation.z={Math.PI / 2}>
		<T.TorusGeometry args={[1.8, 0.09, 12, 96, passedArc]} />
		<T.MeshStandardMaterial
			color="#8fae91"
			emissive="#8fae91"
			emissiveIntensity={0.2}
			roughness={0.4}
			metalness={0.25}
		/>
	</T.Mesh>
	<T.Mesh rotation.z={Math.PI / 2 + passedArc}>
		<T.TorusGeometry args={[1.8, 0.09, 12, 96, failedArc]} />
		<T.MeshStandardMaterial
			color="#d17668"
			emissive="#d17668"
			emissiveIntensity={0.2}
			roughness={0.4}
			metalness={0.25}
		/>
	</T.Mesh>
	<T.Mesh rotation.z={Math.PI / 2 + passedArc + failedArc}>
		<T.TorusGeometry args={[1.8, 0.09, 12, 96, cancelledArc]} />
		<T.MeshStandardMaterial
			color="#5f625b"
			emissive="#30332e"
			emissiveIntensity={0.08}
			roughness={0.5}
			metalness={0.15}
		/>
	</T.Mesh>

	<T.Mesh rotation.x={Math.PI / 2.5} rotation.z={-Math.PI / 5}>
		<T.TorusGeometry args={[1.25, 0.035, 8, 80]} />
		<T.MeshBasicMaterial color="#3c403a" transparent opacity={0.68} />
	</T.Mesh>
	<T.Mesh rotation.x={-Math.PI / 3} rotation.z={Math.PI / 4}>
		<T.TorusGeometry args={[0.82, 0.025, 8, 64]} />
		<T.MeshBasicMaterial color="#d8a54a" transparent opacity={0.48} />
	</T.Mesh>
	<T.Mesh scale={0.52}>
		<T.IcosahedronGeometry args={[1, 2]} />
		<T.MeshStandardMaterial
			color="#20231f"
			emissive="#d8a54a"
			emissiveIntensity={0.12}
			roughness={0.32}
			metalness={0.45}
		/>
	</T.Mesh>
</T.Group>
