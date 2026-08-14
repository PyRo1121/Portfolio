<script lang="ts">
	import {
		ArrowDownRight,
		ArrowUpRight,
		CheckCircle,
		CircleNotch,
		GitMerge,
		Package,
		WarningCircle,
		XCircle
	} from 'phosphor-svelte';
	import type { DeliveryArtifact, GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { workflowAnnotationCoverage } from '$lib/domain/dashboard-workflow-annotations';
	import {
		formatInteger,
		formatRelativeTime,
		formatSigned
	} from '$lib/presentation/dashboard-format';

	type Props = { readonly snapshot: GitHubDashboardSnapshot };
	type DeliveryMobilePanel = 'outcomes' | 'checks' | 'trail' | 'repos';
	let { snapshot }: Props = $props();
	let mobilePanel = $state<DeliveryMobilePanel>('outcomes');
	const mobilePanels: ReadonlyArray<{
		readonly id: DeliveryMobilePanel;
		readonly label: string;
	}> = [
		{ id: 'outcomes', label: 'Outcomes' },
		{ id: 'checks', label: 'Checks' },
		{ id: 'trail', label: 'Trail' },
		{ id: 'repos', label: 'Repos' }
	];
	const delivery = $derived(snapshot.intelligence.delivery);
	const workflow = $derived(delivery.workflows.current);
	const artifacts = $derived(delivery.artifacts.slice(0, 8));
	const verificationTotal = $derived(workflow.successful + workflow.failed);
	const annotationCoverage = $derived(workflowAnnotationCoverage(snapshot));
	const latestAnnotation = $derived(annotationCoverage.evidence[0] ?? null);

	function artifactLabel(artifact: DeliveryArtifact): string {
		switch (artifact.kind) {
			case 'PullRequest':
				return 'Merged PR';
			case 'Issue':
				return 'Closed issue';
			case 'Release':
				return 'Release';
			case 'WorkflowRun':
				return 'Workflow';
		}
	}
</script>

<div class="delivery-screen">
	<nav class="workspace-pages" aria-label="Delivery panels">
		{#each mobilePanels as panel (panel.id)}
			<button
				type="button"
				class={mobilePanel === panel.id ? 'active' : ''}
				aria-pressed={mobilePanel === panel.id}
				onclick={() => (mobilePanel = panel.id)}>{panel.label}</button
			>
		{/each}
	</nav>
	<section class="delivery-score">
		<img
			class="delivery-portrait"
			src={snapshot.profile.avatarUrl}
			alt=""
			width="320"
			height="320"
			fetchpriority="high"
			referrerpolicy="no-referrer"
		/>
		<header><span>{snapshot.period.label}</span><small>Evidence-backed delivery</small></header>
		<div class="delivery-score__value">
			<strong>{delivery.score}</strong><span>delivery signal</span>
		</div>
		<div class="delivery-message">
			<span>{delivery.label}</span>
			<p>{delivery.message}</p>
		</div>
		<div class="delivery-score__footer">
			<span>{formatInteger(delivery.outcomes)} outcomes</span><strong
				>{formatSigned(delivery.outcomeDelta)} vs prior window</strong
			>
		</div>
		<div class="score-formula" aria-label="Delivery signal formula">
			<div><span>Outcomes</span><strong>{delivery.scoreBreakdown.outcomes}/56</strong></div>
			<div><span>Verification</span><strong>{delivery.scoreBreakdown.verification}/34</strong></div>
			<div><span>Coverage</span><strong>{delivery.scoreBreakdown.coverage}/10</strong></div>
		</div>
	</section>

	<section class={mobilePanel === 'outcomes' ? 'outcome-panel panel-visible' : 'outcome-panel'}>
		<header><span>Outcomes landed</span><small>Authored GitHub artifacts</small></header>
		<div class="outcome-metrics">
			<div>
				<GitMerge size={20} weight="light" /><strong
					>{formatInteger(delivery.mergedPullRequests)}</strong
				><span>Merged PRs</span>
			</div>
			<div>
				<CheckCircle size={20} weight="light" /><strong
					>{formatInteger(delivery.closedIssues)}</strong
				><span>Closed issues</span>
			</div>
			<div>
				<Package size={20} weight="light" />
				<strong>{formatInteger(delivery.prereleaseBuilds)}</strong>
				<span>Dev builds</span>
				<small>{formatInteger(delivery.releases)} stable releases</small>
			</div>
		</div>
		<div class="outcome-comparison">
			{#if delivery.outcomeDelta >= 0}<ArrowUpRight size={18} weight="bold" />{:else}<ArrowDownRight
					size={18}
					weight="bold"
				/>{/if}
			<div>
				<strong>{formatSigned(delivery.outcomeDelta)}</strong><span
					>{delivery.previousOutcomes} outcomes in the prior seven days</span
				>
			</div>
		</div>
	</section>

	<section
		class={mobilePanel === 'checks' ? 'verification-panel panel-visible' : 'verification-panel'}
	>
		<header>
			<span>Verification</span><small
				>{delivery.workflows.coveredRepositories}/{delivery.workflows.totalRepositories} active repos
				covered</small
			>
		</header>
		<div class="verification-headline">
			<strong>{delivery.workflowPassRate === null ? '—' : `${delivery.workflowPassRate}%`}</strong>
			<span>pass rate across completed user-triggered checks</span>
		</div>
		<div
			class="verification-track"
			aria-label={`${workflow.successful} passed and ${workflow.failed} failed workflow runs`}
		>
			<i
				style={`transform:scaleX(${verificationTotal === 0 ? 0 : workflow.successful / verificationTotal})`}
			></i>
		</div>
		<div class="verification-counts">
			<div>
				<CheckCircle size={15} /><strong>{formatInteger(workflow.successful)}</strong><span
					>passed</span
				>
			</div>
			<div>
				<XCircle size={15} /><strong>{formatInteger(workflow.failed)}</strong><span>failed</span>
			</div>
			<div>
				<CircleNotch size={15} /><strong>{formatInteger(workflow.cancelled)}</strong><span
					>cancelled</span
				>
			</div>
		</div>
		{#if latestAnnotation}
			<a
				class="verification-annotation"
				href={latestAnnotation.jobUrl}
				target="_blank"
				rel="external noreferrer"
				title={latestAnnotation.message}
			>
				<div>
					<small>Observed check annotation</small>
					<strong>{latestAnnotation.message}{latestAnnotation.messageTruncated ? '…' : ''}</strong>
				</div>
				<span>{latestAnnotation.repository} · {latestAnnotation.jobName}</span>
			</a>
		{:else if annotationCoverage.state === 'Unavailable' && annotationCoverage.targetedRuns > 0}
			<p class="coverage-warning">
				<WarningCircle size={14} />{annotationCoverage.detail}
			</p>
		{/if}
		{#if delivery.workflows.unavailableRepositories.length > 0 || delivery.workflows.truncated}
			<p class="coverage-warning">
				<WarningCircle size={14} />{delivery.workflows.truncated
					? 'Results exceeded GitHub’s bounded search window.'
					: `${delivery.workflows.unavailableRepositories.length} repositories could not expose Actions data.`}
			</p>
		{/if}
	</section>

	<section class={mobilePanel === 'trail' ? 'delivery-trail panel-visible' : 'delivery-trail'}>
		<header><span>Evidence trail</span><small>Open any artifact on GitHub</small></header>
		<div class="artifact-list">
			{#each artifacts as artifact (artifact.url)}
				<a href={artifact.url} target="_blank" rel="external noreferrer">
					<i class={`artifact-status artifact-status--${artifact.status}`}></i>
					<span class="artifact-kind">{artifactLabel(artifact)}</span>
					<div>
						<strong>{artifact.title}</strong><small>{artifact.repository} · {artifact.detail}</small
						>
					</div>
					<time datetime={artifact.occurredAt}
						>{formatRelativeTime(artifact.occurredAt, snapshot.generatedAt)}</time
					>
				</a>
			{:else}<p>No delivery artifacts landed in this rolling window yet.</p>{/each}
		</div>
	</section>

	<section
		class={mobilePanel === 'repos'
			? 'repository-verification panel-visible'
			: 'repository-verification'}
	>
		<header><span>Checks by workstream</span><small>Exact Actions run totals</small></header>
		<div>
			{#each workflow.repositories.slice(0, 6) as repository (repository.repository)}
				<article>
					<strong>{repository.repository.split('/').at(-1)}</strong>
					<div class="repository-check-track">
						<i
							style={`transform:scaleX(${repository.total === 0 ? 0 : repository.successful / repository.total})`}
						></i>
					</div>
					<span>{formatInteger(repository.successful)} pass</span><span
						>{formatInteger(repository.failed)} fail</span
					><span>{formatInteger(repository.cancelled)} cancel</span>
				</article>
			{:else}<p>No accessible workflow runs for active repositories.</p>{/each}
		</div>
	</section>
</div>
