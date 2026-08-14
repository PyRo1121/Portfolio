<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { formatInteger } from '$lib/presentation/dashboard-format';

	type Props = {
		readonly value: number;
	};

	let { value }: Props = $props();
	const animated = Tween.of(() => value, {
		duration: prefersReducedMotion.current ? 0 : 1_100,
		easing: cubicOut
	});
</script>

<span aria-label={formatInteger(value)}>{formatInteger(Math.round(animated.current))}</span>
