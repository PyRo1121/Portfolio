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
		<header><span>Latest observed checks</span><small>Rolling 7 days</small></header>
		<div class="checks-summary__value">
			<strong
				>{formatInteger(checks.current.repositoriesWithEvidence)}<small
					>/{formatInteger(checks.current.totalRepositories)}</small
				></strong
			><span>active repositories with latest-run evidence</span>
		</div>
		<article>
			<strong>{checks.current.headline}</strong>
			<p>{checks.current.detail}</p>
		</article>
		<div class="checks-summary__facts">
			<div>
				<CheckCircle size={15} weight="duotone" /><strong
					>{formatInteger(checks.current.passingRepositories)}</strong
				><span>passing</span>
			</div>
			<div>
				<XCircle size={15} weight="duotone" /><strong
					>{formatInteger(checks.current.attentionRepositories)}</strong
				><span>attention</span>
			</div>
			<div>
				<ArrowCounterClockwise size={15} weight="duotone" /><strong
					>{formatInteger(checks.current.recoveredFailureSequences)}</strong
				><span>recoveries</span>
			</div>
		</div>
		<footer>
			<span>Not a quality grade</span><strong
				>Latest state, recovery, and history stay separate</strong
			>
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
		<header><span>7-day workflow history</span><small>Context, not a score</small></header>
		<div class="workflow-history__body">
			<div
				class="workflow-history__track"
				aria-label={`${checks.history.successfulRuns} passed, ${checks.history.failedRuns} failed, ${checks.history.cancelledRuns} cancelled, and ${checks.history.otherRuns} other workflow runs`}
			>
				{#if checks.history.successfulRuns > 0}<i
						class="history-passed"
						style={`flex:${checks.history.successfulRuns}`}
					></i>{/if}
				{#if checks.history.failedRuns > 0}<i
						class="history-failed"
						style={`flex:${checks.history.failedRuns}`}
					></i>{/if}
				{#if checks.history.cancelledRuns > 0}<i
						class="history-cancelled"
						style={`flex:${checks.history.cancelledRuns}`}
					></i>{/if}
				{#if checks.history.otherRuns > 0}<i
						class="history-other"
						style={`flex:${checks.history.otherRuns}`}
					></i>{/if}
			</div>
			<div class="workflow-history__counts">
				<div>
					<span>Passed</span><strong>{formatInteger(checks.history.successfulRuns)}</strong>
				</div>
				<div><span>Failed</span><strong>{formatInteger(checks.history.failedRuns)}</strong></div>
				<div>
					<span>Cancelled</span><strong>{formatInteger(checks.history.cancelledRuns)}</strong>
				</div>
				<div>
					<span>Completed</span><strong>{formatInteger(checks.history.completedRuns)}</strong>
				</div>
			</div>
			<p>
				Every observed outcome remains visible; the latest repository state is reported separately.
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
