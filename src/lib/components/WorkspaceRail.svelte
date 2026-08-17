<script lang="ts">
	import {
		BriefcaseIcon as Briefcase,
		ChartBarIcon as ChartBar,
		ChartLineUpIcon as ChartLineUp,
		CirclesThreePlusIcon as CirclesThreePlus,
		CloudIcon as Cloud,
		FlaskIcon as Flask,
		PackageIcon as Package,
		SquaresFourIcon as SquaresFour,
		SunHorizonIcon as SunHorizon
	} from 'phosphor-svelte';
	import type { Component } from 'svelte';
	import type { WorkspaceSignal } from '$lib/domain/dashboard-navigation';
	import { workspaceDefinitions, type DashboardWorkspace } from '$lib/domain/dashboard-workspace';

	type Props = {
		readonly activeWorkspace: DashboardWorkspace;
		readonly signals: Readonly<Record<DashboardWorkspace, WorkspaceSignal>> | null;
		readonly onWorkspace: (workspace: DashboardWorkspace) => void;
	};

	let { activeWorkspace, signals, onWorkspace }: Props = $props();
	const compactLabels: Readonly<Record<DashboardWorkspace, string>> = {
		today: 'Today',
		brief: 'Week',
		delivery: 'Deliver',
		craft: 'Quality',
		repositories: 'Project',
		activity: 'Commits',
		cloudflare: 'Cloud',
		career: 'Career',
		telemetry: 'Visit'
	};
	const icons: Readonly<Record<DashboardWorkspace, Component>> = {
		today: SunHorizon,
		brief: SquaresFour,
		delivery: Package,
		craft: Flask,
		activity: ChartLineUp,
		repositories: CirclesThreePlus,
		cloudflare: Cloud,
		career: Briefcase,
		telemetry: ChartBar
	};
</script>

<nav class="workspace-rail" aria-label="Dashboard sections">
	{#each workspaceDefinitions as workspace (workspace.id)}
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
			<Icon
				size={18}
				weight={workspace.id === activeWorkspace ? 'fill' : 'light'}
				aria-hidden="true"
			/>
			<span class="workspace-link__copy">
				<strong
					><span class="workspace-label-full">{workspace.label}</span><span
						class="workspace-label-compact">{compactLabels[workspace.id]}</span
					></strong
				>
				<small>{workspace.description}</small>
			</span>
			{#if signals !== null}
				{@const signal = signals[workspace.id]}
				<span
					class={signal.tone === 'attention'
						? 'workspace-link__signal workspace-link__signal--attention'
						: 'workspace-link__signal'}
				>
					<b>{signal.value}</b><small>{signal.label}</small>
				</span>
			{/if}
			<kbd>{workspace.shortcut}</kbd>
		</button>
	{/each}
</nav>
