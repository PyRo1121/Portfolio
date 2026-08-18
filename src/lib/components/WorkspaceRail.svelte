<script lang="ts">
	import {
		BriefcaseIcon as Briefcase,
		ChartBarIcon as ChartBar,
		ChartLineUpIcon as ChartLineUp,
		CirclesThreePlusIcon as CirclesThreePlus,
		CloudIcon as Cloud,
		FlaskIcon as Flask,
		LinkSimpleIcon as LinkSimple,
		PackageIcon as Package,
		PulseIcon as Pulse,
		SquaresFourIcon as SquaresFour,
		SunHorizonIcon as SunHorizon
	} from 'phosphor-svelte';
	import type { Component } from 'svelte';
	import type { WorkspaceSignal } from '$lib/domain/dashboard-navigation';
	import type { DashboardWorkspace, WorkspaceDefinition } from '$lib/domain/dashboard-workspace';

	type Props = {
		readonly workspaces: ReadonlyArray<WorkspaceDefinition>;
		readonly activeWorkspace: DashboardWorkspace;
		readonly signals: Readonly<Partial<Record<DashboardWorkspace, WorkspaceSignal>>> | null;
		readonly onWorkspace: (workspace: DashboardWorkspace) => void;
	};

	let { workspaces, activeWorkspace, signals, onWorkspace }: Props = $props();
	const compactLabels: Readonly<Partial<Record<DashboardWorkspace, string>>> = {
		today: 'Today',
		brief: 'Week',
		delivery: 'Deliver',
		craft: 'Quality',
		repositories: 'Project',
		activity: 'Commits',
		briefing: 'Brief',
		cloudflare: 'Cloud',
		career: 'Career',
		telemetry: 'Visit',
		mappings: 'Map'
	};
	const icons: Readonly<Partial<Record<DashboardWorkspace, Component>>> = {
		today: SunHorizon,
		brief: SquaresFour,
		delivery: Package,
		craft: Flask,
		activity: ChartLineUp,
		repositories: CirclesThreePlus,
		briefing: Pulse,
		cloudflare: Cloud,
		career: Briefcase,
		telemetry: ChartBar,
		mappings: LinkSimple
	};
</script>

<nav class="workspace-rail" aria-label="Dashboard sections">
	{#each workspaces as workspace (workspace.id)}
		{@const Icon = icons[workspace.id]}
		<button
			type="button"
			class={workspace.id === activeWorkspace
				? 'workspace-link workspace-link--active'
				: 'workspace-link'}
			aria-current={workspace.id === activeWorkspace ? 'page' : undefined}
			onclick={() => onWorkspace(workspace.id)}
		>
			<span class="workspace-link__index">0{workspace.index}</span>
			{#if Icon}
				<Icon
					size={18}
					weight={workspace.id === activeWorkspace ? 'fill' : 'light'}
					aria-hidden="true"
				/>
			{/if}
			<span class="workspace-link__copy">
				<strong
					><span class="workspace-label-full">{workspace.label}</span><span
						class="workspace-label-compact">{compactLabels[workspace.id] ?? workspace.label}</span
					></strong
				>
				<small>{workspace.description}</small>
			</span>
			{#if signals !== null}
				{@const signal = signals[workspace.id]}
				{#if signal}
					<span
						class={signal.tone === 'attention'
							? 'workspace-link__signal workspace-link__signal--attention'
							: 'workspace-link__signal'}
					>
						<b>{signal.value}</b><small>{signal.label}</small>
					</span>
				{/if}
			{/if}
			<kbd>{workspace.shortcut}</kbd>
		</button>
	{/each}
</nav>
