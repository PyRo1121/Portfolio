<script lang="ts">
	import { asset } from '$app/paths';
	import {
		ArrowDownRightIcon as ArrowDownRight,
		ArrowUpRightIcon as ArrowUpRight,
		CheckCircleIcon as CheckCircle,
		CircleNotchIcon as CircleNotch,
		GitMergeIcon as GitMerge,
		PackageIcon as Package,
		WarningCircleIcon as WarningCircle,
		XCircleIcon as XCircle
	} from 'phosphor-svelte';
	import type { DeliveryArtifact, GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { formatInteger, formatRelativeTime } from '$lib/presentation/dashboard-format';
	import { formatGitHubArtifactTitle } from '$lib/presentation/github-artifact-title';

	type Props = { readonly snapshot: GitHubDashboardSnapshot };
	type DeliveryMobilePanel = 'outcomes' | 'runs' | 'trail' | 'repos';
	let { snapshot }: Props = $props();
	let mobilePanel = $state<DeliveryMobilePanel>('outcomes');
	const mobilePanels: ReadonlyArray<{
		readonly id: DeliveryMobilePanel;
		readonly label: string;
	}> = [
		{ id: 'outcomes', label: 'Outcomes' },
		{ id: 'runs', label: 'Runs' },
		{ id: 'trail', label: 'GitHub links' },
		{ id: 'repos', label: 'By repository' }
	];
	const delivery = $derived(snapshot.intelligence.delivery);
	const mergeBreakdown = $derived({
		authored: delivery.authoredMergedPullRequests,
		maintainer: delivery.maintainerMergedPullRequests,
		automated: delivery.automatedMergedPullRequests,
		truncated: delivery.mergedPullRequestsTruncated
	});
	const issueBreakdown = $derived({
		authored: delivery.authoredClosedIssues,
		closedByYou: delivery.ownerClosedIssues,
		viaPullRequest: delivery.pullRequestClosedIssues,
		truncated: delivery.closedIssuesTruncated
	});
	const workflow = $derived(delivery.workflows.current);
	const artifacts = $derived(delivery.artifacts.slice(0, 8));
	const verificationTotal = $derived(workflow.successful + workflow.failed);
	const annotationCoverage = $derived(delivery.workflows.current.annotations);
	const latestAnnotation = $derived(annotationCoverage.evidence[0] ?? null);
	const outcomeNoun = $derived(delivery.outcomes === 1 ? 'counted outcome' : 'counted outcomes');
	const outcomeComparison = $derived(
		delivery.outcomeDelta === 0
			? `Same number as the prior seven days (${delivery.previousOutcomes}).`
			: `${Math.abs(delivery.outcomeDelta)} ${
					delivery.outcomeDelta > 0 ? 'more' : 'fewer'
				} than the prior seven days (${delivery.previousOutcomes}).`
	);

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
	<section class="delivery-summary">
		<img
			class="delivery-portrait"
			src={asset('/portrait.webp')}
			alt=""
			width="320"
			height="320"
			fetchpriority="high"
			referrerpolicy="no-referrer"
		/>
		<header>
			<span>{snapshot.period.label}</span><small>Attributed work, releases, and workflow runs</small
			>
		</header>
		<div class="delivery-summary__value">
			<strong>{formatInteger(delivery.outcomes)}</strong><span>{outcomeNoun}</span>
		</div>
		<div class="delivery-message">
			<span>Recorded this week</span>
			<p>
				{formatInteger(delivery.prereleaseBuilds)} prereleases; {formatInteger(
					delivery.mergedPullRequests
				)} merged pull requests; {formatInteger(delivery.closedIssues)} closed issues.
			</p>
		</div>
		<div class="delivery-summary__facts">
			<div><span>Successful runs</span><strong>{formatInteger(workflow.successful)}</strong></div>
			<div><span>Failed runs</span><strong>{formatInteger(workflow.failed)}</strong></div>
			<div>
				<span>Repositories with workflow data</span><strong
					>{delivery.workflows.coveredRepositories}/{delivery.workflows.totalRepositories}</strong
				>
			</div>
		</div>
	</section>

	<section class={mobilePanel === 'outcomes' ? 'outcome-panel panel-visible' : 'outcome-panel'}>
		<header>
			<span>Completed outcomes</span><small
				>Automated updates remain visible but do not raise the headline</small
			>
		</header>
		<div class="outcome-metrics">
			<div>
				<GitMerge size={20} weight="light" /><strong
					>{formatInteger(delivery.mergedPullRequests)}</strong
				><span>Merged PRs</span>
				<small
					>{formatInteger(mergeBreakdown.authored)} authored · {formatInteger(
						mergeBreakdown.maintainer
					)} maintainer{mergeBreakdown.automated > 0
						? ` · ${formatInteger(mergeBreakdown.automated)} automated`
						: ''}</small
				>
				{#if mergeBreakdown.truncated}<small>At least; GitHub result cap reached</small>{/if}
			</div>
			<div>
				<CheckCircle size={20} weight="light" /><strong
					>{formatInteger(delivery.closedIssues)}</strong
				><span>Closed issues</span>
				{#if delivery.closedIssues > 0}
					<small
						>{formatInteger(issueBreakdown.authored)} authored · {formatInteger(
							issueBreakdown.closedByYou
						)} closed by you · {formatInteger(issueBreakdown.viaPullRequest)} via merged PR</small
					>
				{:else}
					<small>No matching issue closures</small>
				{/if}
				{#if issueBreakdown.truncated}<small>At least; GitHub result cap reached</small>{/if}
			</div>
			<div>
				<Package size={20} weight="light" />
				<strong>{formatInteger(delivery.prereleaseBuilds)}</strong>
				<span>Prereleases</span>
				<small>{formatInteger(delivery.releases)} stable releases</small>
			</div>
		</div>
		<div class="outcome-comparison">
			{#if delivery.outcomeDelta >= 0}<ArrowUpRight size={18} weight="bold" />{:else}<ArrowDownRight
					size={18}
					weight="bold"
				/>{/if}
			<div>
				<strong>{outcomeComparison}</strong><span
					>{formatInteger(delivery.outcomes)} {outcomeNoun}</span
				>
			</div>
		</div>
	</section>

	<section
		class={mobilePanel === 'runs' ? 'verification-panel panel-visible' : 'verification-panel'}
	>
		<header>
			<span>Verification</span><small
				>{delivery.workflows.coveredRepositories}/{delivery.workflows.totalRepositories} active repos
				covered</small
			>
		</header>
		<div class="verification-headline">
			<strong>{formatInteger(workflow.total)}</strong>
			<span>user-triggered default-branch runs observed in the rolling window</span>
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
		<header>
			<span>GitHub records</span><small>Pull requests, issues, releases, and runs</small>
		</header>
		<div class="artifact-list">
			{#each artifacts as artifact (artifact.url)}
				<a href={artifact.url} target="_blank" rel="external noreferrer">
					<i class={`artifact-status artifact-status--${artifact.status}`}></i>
					<span class="artifact-kind">{artifactLabel(artifact)}</span>
					<div>
						<strong title={artifact.title}>{formatGitHubArtifactTitle(artifact.title)}</strong
						><small>{artifact.repository} · {artifact.detail}</small>
					</div>
					<time datetime={artifact.occurredAt}
						>{formatRelativeTime(artifact.occurredAt, snapshot.generatedAt)}</time
					>
				</a>
			{:else}<p>No completed outcomes or workflow runs in this seven-day window.</p>{/each}
		</div>
	</section>

	<section
		class={mobilePanel === 'repos'
			? 'repository-verification panel-visible'
			: 'repository-verification'}
	>
		<header><span>Runs by repository</span><small>GitHub Actions run totals</small></header>
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
