<script lang="ts">
	import {
		ArrowRightIcon as ArrowRight,
		BriefcaseIcon as Briefcase,
		ChartBarIcon as ChartBar,
		CloudIcon as Cloud,
		LinkSimpleIcon as LinkSimple,
		PulseIcon as Pulse,
		WarningCircleIcon as WarningCircle
	} from 'phosphor-svelte';
	import type { Component } from 'svelte';
	import type { OwnerBriefingView } from '$lib/domain/owner-briefing';
	import { ownerWorkspaceDefinitions, type OwnerWorkspace } from '$lib/domain/dashboard-workspace';

	type Props = {
		readonly view: OwnerBriefingView;
		readonly onWorkspace: (workspace: OwnerWorkspace) => void;
	};

	let { view, onWorkspace }: Props = $props();
	const doors = ownerWorkspaceDefinitions.filter((workspace) => workspace.id !== 'briefing');

	function iconForDoor(id: (typeof doors)[number]['id']): Component | null {
		switch (id) {
			case 'career':
				return Briefcase;
			case 'cloudflare':
				return Cloud;
			case 'telemetry':
				return ChartBar;
			case 'mappings':
				return LinkSimple;
			default:
				return null;
		}
	}

	function openDoor(id: (typeof doors)[number]['id']): void {
		if (id === 'career' || id === 'cloudflare' || id === 'telemetry' || id === 'mappings') {
			onWorkspace(id);
		}
	}
	const extrasLabel = $derived(
		view._tag === 'Ready' && view.extraCount > 0
			? `${view.extraCount} more ${view.extraCount === 1 ? 'reminder' : 'reminders'}`
			: null
	);
</script>

<div class="briefing-screen">
	<header class="briefing-pulse">
		<span><Pulse size={14} weight="fill" /> Career pulse</span>
		{#if view._tag === 'Ready'}
			<p class={view.primary.tone}>{view.primary.label}</p>
			<h1>{view.primary.company}</h1>
			<p>{view.primary.action}</p>
			{#if extrasLabel !== null}
				<button type="button" onclick={() => onWorkspace('career')} aria-label={extrasLabel}>
					{extrasLabel}
				</button>
			{/if}
		{:else if view._tag === 'Empty'}
			<h1>Nothing due</h1>
			<p>No Career follow-ups need action today.</p>
		{:else}
			<WarningCircle size={20} weight="duotone" />
			<h1>Career unavailable</h1>
			<p>{view.reason}</p>
		{/if}
	</header>

	<nav class="briefing-doors" aria-label="Owner areas">
		{#each doors as door (door.id)}
			{@const Icon = iconForDoor(door.id)}
			{#if Icon}
				<button type="button" onclick={() => openDoor(door.id)} aria-label={door.label}>
					<Icon size={18} weight="light" aria-hidden="true" />
					<span>
						<strong>{door.label}</strong>
						<small>{door.description}</small>
					</span>
					<ArrowRight size={16} weight="light" aria-hidden="true" />
				</button>
			{/if}
		{/each}
	</nav>
</div>

<style>
	.briefing-screen {
		display: grid;
		grid-template-columns: minmax(18rem, 0.9fr) minmax(0, 1.1fr);
		gap: 1px;
		height: 100%;
		background: var(--line);
	}
	.briefing-pulse,
	.briefing-doors {
		min-width: 0;
		background: var(--surface);
		padding: 1.25rem 1.4rem;
	}
	.briefing-pulse {
		display: grid;
		align-content: start;
		gap: 0.55rem;
	}
	.briefing-pulse > span {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--muted);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.briefing-pulse h1 {
		margin: 0;
		font-size: 1.55rem;
		letter-spacing: -0.04em;
	}
	.briefing-pulse p {
		margin: 0;
		color: var(--muted);
		max-width: 36rem;
	}
	.briefing-pulse .overdue,
	.briefing-pulse .today {
		color: var(--accent);
		font-family: var(--mono);
		font-size: 0.78rem;
	}
	.briefing-pulse .upcoming,
	.briefing-pulse .unscheduled {
		color: var(--muted);
		font-family: var(--mono);
		font-size: 0.78rem;
	}
	.briefing-pulse button {
		justify-self: start;
		margin-top: 0.4rem;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		padding: 0.45rem 0.7rem;
		cursor: pointer;
	}
	.briefing-doors {
		display: grid;
		align-content: start;
		gap: 0.65rem;
	}
	.briefing-doors button {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 0.9rem;
		border: 1px solid var(--line);
		background: var(--surface-deep);
		color: var(--ink);
		text-align: left;
		cursor: pointer;
	}
	.briefing-doors button span {
		display: grid;
		gap: 0.15rem;
	}
	.briefing-doors strong {
		font-size: 0.92rem;
	}
	.briefing-doors small {
		color: var(--muted);
	}
	@media (max-width: 900px) {
		.briefing-screen {
			grid-template-columns: 1fr;
			overflow: auto;
		}
	}
</style>
