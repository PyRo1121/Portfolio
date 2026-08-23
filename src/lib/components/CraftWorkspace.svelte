<script lang="ts">
	import {
		ArrowCounterClockwiseIcon as ArrowCounterClockwise,
		CheckCircleIcon as CheckCircle,
		CircleNotchIcon as CircleNotch,
		InfoIcon as Info,
		MinusCircleIcon as MinusCircle,
		WarningCircleIcon as WarningCircle,
		XCircleIcon as XCircle
	} from 'phosphor-svelte';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { createChecksIntelligence } from '$lib/domain/dashboard-craft';
	import { formatInteger } from '$lib/presentation/dashboard-format';

	type Props = { readonly snapshot: GitHubDashboardSnapshot };
	type ChecksMobilePanel = 'repositories' | 'history' | 'context' | 'limits';
	let { snapshot }: Props = $props();
	let mobilePanel = $state<ChecksMobilePanel>('repositories');
	const mobilePanels: ReadonlyArray<{
		readonly id: ChecksMobilePanel;
		readonly label: string;
	}> = [
		{ id: 'repositories', label: 'Current' },
		{ id: 'history', label: 'History' },
		{ id: 'context', label: 'Context' },
		{ id: 'limits', label: 'Limits' }
	];
	const checks = $derived(createChecksIntelligence(snapshot));
</script>

<div class="craft-screen">
	<nav class="workspace-pages" aria-label="Checks panels">
		{#each mobilePanels as panel (panel.id)}
			<button
				type="button"
				class={mobilePanel === panel.id ? 'active' : ''}
				aria-pressed={mobilePanel === panel.id}
				onclick={() => (mobilePanel = panel.id)}>{panel.label}</button
			>
		{/each}
	</nav>

	<section class="checks-summary">
		<header><span>Current checks</span><small>Latest workflow state</small></header>
		<div class="checks-summary__status">
			<span>Repository health now</span>
			<strong>{checks.current.headline}</strong>
			<p>{checks.current.detail}</p>
		</div>
		<div class="checks-summary__facts">
			<div>
				<CheckCircle size={15} weight="duotone" /><strong
					>{formatInteger(checks.current.passingRepositories)}</strong
				><span>passing now</span>
			</div>
			<div>
				<XCircle size={15} weight="duotone" /><strong
					>{formatInteger(checks.current.attentionRepositories)}</strong
				><span>need attention</span>
			</div>
			<div>
				<CircleNotch size={15} weight="duotone" /><strong
					>{formatInteger(checks.current.runningRepositories)}</strong
				><span>in progress</span>
			</div>
			<div>
				<ArrowCounterClockwise size={15} weight="duotone" /><strong
					>{formatInteger(checks.current.recoveredFailureSequences)}</strong
				><span>recovered sequences</span>
			</div>
		</div>
		<footer>
			<span>Absolute evidence only</span><strong>No percentages, ratios, or quality grade</strong>
		</footer>
	</section>

	<section
		class={mobilePanel === 'repositories' ? 'repository-checks panel-visible' : 'repository-checks'}
	>
		<header>
			<span>Latest by repository</span><small>User-triggered · default branches</small>
		</header>
		<div class="repository-checks__grid">
			{#each checks.current.repositories as repository (repository.repository)}
				<article class={`repository-check repository-check--${repository.state}`}>
					<div class="repository-check__identity">
						{#if repository.state === 'passing'}
							<CheckCircle size={17} weight="duotone" />
						{:else if repository.state === 'attention'}
							<XCircle size={17} weight="duotone" />
						{:else if repository.state === 'running'}
							<CircleNotch size={17} weight="duotone" />
						{:else if repository.state === 'noRecord'}
							<MinusCircle size={17} weight="duotone" />
						{:else if repository.state === 'unavailable'}
							<WarningCircle size={17} weight="duotone" />
						{:else}
							<Info size={17} weight="duotone" />
						{/if}
						<div>
							<strong>{repository.repository}</strong>
							<span>{repository.stateLabel}</span>
						</div>
					</div>
					{#if repository.workflows.length > 0}
						<div class="repository-check__workflows" aria-label="Latest workflow results">
							{#each repository.workflows as workflow (workflow.name)}
								<span class={`workflow-chip workflow-chip--${workflow.state}`}>
									<i></i><strong>{workflow.name}</strong><small>{workflow.stateLabel}</small>
								</span>
							{/each}
						</div>
					{/if}
					<p>{repository.detail}</p>
				</article>
			{:else}
				<p class="checks-empty">No active repository check evidence.</p>
			{/each}
		</div>
	</section>

	<section
		class={mobilePanel === 'history' ? 'workflow-history panel-visible' : 'workflow-history'}
	>
		<header><span>Recent run history</span><small>Absolute counts · rolling 7 days</small></header>
		<div class="workflow-history__body">
			<div class="workflow-history__counts">
				<div>
					<span>Passed</span><strong>{formatInteger(checks.history.successfulRuns)}</strong>
				</div>
				<div><span>Failed</span><strong>{formatInteger(checks.history.failedRuns)}</strong></div>
				<div>
					<span>Cancelled</span><strong>{formatInteger(checks.history.cancelledRuns)}</strong>
				</div>
				<div><span>Other</span><strong>{formatInteger(checks.history.otherRuns)}</strong></div>
			</div>
			<p>
				<strong>{formatInteger(checks.history.totalRuns)} runs observed.</strong> Historical outcomes
				stay visible without changing the current repository state.
			</p>
		</div>
	</section>

	<section class={mobilePanel === 'context' ? 'change-context panel-visible' : 'change-context'}>
		<header><span>Change context</span><small>Observed commits</small></header>
		<div class="change-context__grid">
			<div>
				<span>Median files</span><strong>{checks.context.medianFilesPerCommit}</strong><small
					>per commit</small
				>
			</div>
			<div>
				<span>Median changed lines</span><strong
					>{formatInteger(checks.context.medianChangedLinesPerCommit)}</strong
				><small>per commit</small>
			</div>
			<div>
				<span>Commits observed</span><strong>{formatInteger(checks.context.commits)}</strong><small
					>rolling window</small
				>
			</div>
			<div>
				<span>Revert messages</span><strong>{formatInteger(checks.context.reverts)}</strong><small
					>literal matches</small
				>
			</div>
		</div>
	</section>

	<section class={mobilePanel === 'limits' ? 'checks-limits panel-visible' : 'checks-limits'}>
		<header><span>Evidence limits</span><small>Not silently scored</small></header>
		<div>
			{#each checks.unavailable as unavailable (unavailable)}
				<p><i></i>{unavailable}</p>
			{/each}
		</div>
	</section>
</div>
