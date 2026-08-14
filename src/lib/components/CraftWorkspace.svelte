<script lang="ts">
	import { CheckCircle, Info, WarningCircle, XCircle } from 'phosphor-svelte';
	import type { GitHubDashboardSnapshot } from '$lib/domain/github-intelligence';
	import { createCraftIntelligence } from '$lib/domain/dashboard-craft';
	import { formatInteger } from '$lib/presentation/dashboard-format';
	import CraftCore from './CraftCore.svelte';

	type Props = { readonly snapshot: GitHubDashboardSnapshot };
	type CraftMobilePanel = 'verify' | 'review' | 'mix' | 'discipline' | 'limits';
	let { snapshot }: Props = $props();
	let mobilePanel = $state<CraftMobilePanel>('review');
	const mobilePanels: ReadonlyArray<{ readonly id: CraftMobilePanel; readonly label: string }> = [
		{ id: 'verify', label: 'Verify' },
		{ id: 'review', label: 'Review' },
		{ id: 'mix', label: 'Mix' },
		{ id: 'discipline', label: 'Discipline' },
		{ id: 'limits', label: 'Limits' }
	];
	const craft = $derived(createCraftIntelligence(snapshot));
</script>

<div class="craft-screen">
	<nav class="workspace-pages" aria-label="Craft panels">
		{#each mobilePanels as panel (panel.id)}
			<button
				type="button"
				class={mobilePanel === panel.id ? 'active' : ''}
				aria-pressed={mobilePanel === panel.id}
				onclick={() => (mobilePanel = panel.id)}>{panel.label}</button
			>
		{/each}
	</nav>
	<section class="craft-score">
		<img
			class="craft-portrait"
			src={snapshot.profile.avatarUrl}
			alt=""
			width="280"
			height="280"
			fetchpriority="high"
			referrerpolicy="no-referrer"
		/>
		<header><span>Rolling 7 days</span><small>Observed + inferred</small></header>
		<div><strong>{craft.score}</strong><span>craft signal</span></div>
		<article>
			<strong>{craft.label}</strong>
			<p>{craft.message}</p>
		</article>
		<footer><span>Not a code-quality grade</span><strong>Formula-backed signal</strong></footer>
	</section>

	<section
		class={mobilePanel === 'verify' ? 'craft-verification panel-visible' : 'craft-verification'}
	>
		<header>
			<span>Observed verification</span><small>GitHub Actions · default branches</small>
		</header>
		<div class="craft-verification-body">
			<CraftCore {craft} />
			<div class="craft-pass-rate">
				<strong
					>{craft.observed.workflowPassRate === null
						? '—'
						: `${craft.observed.workflowPassRate}%`}</strong
				><span>completed checks passing</span>
			</div>
		</div>
		<div class="craft-checks">
			<div>
				<CheckCircle size={16} /><strong>{formatInteger(craft.observed.successfulChecks)}</strong
				><span>passed</span>
			</div>
			<div>
				<XCircle size={16} /><strong>{formatInteger(craft.observed.failedChecks)}</strong><span
					>failed</span
				>
			</div>
			<div>
				<WarningCircle size={16} /><strong>{formatInteger(craft.observed.cancelledChecks)}</strong
				><span>cancelled</span>
			</div>
		</div>
	</section>

	<section
		class={mobilePanel === 'review' ? 'reviewability-panel panel-visible' : 'reviewability-panel'}
	>
		<header><span>Observed reviewability</span><small>Commit shape</small></header>
		<div class="reviewability-grid">
			<div>
				<span>Focused commits</span><strong>{formatInteger(craft.observed.focusedCommits)}</strong
				><small>≤8 files and ≤500 lines</small>
			</div>
			<div>
				<span>Oversized commits</span><strong
					>{formatInteger(craft.observed.oversizedCommits)}</strong
				><small>&gt;25 files or &gt;2K lines</small>
			</div>
			<div>
				<span>Median files</span><strong>{craft.observed.medianFilesPerCommit}</strong><small
					>per commit</small
				>
			</div>
			<div>
				<span>Reverts</span><strong>{formatInteger(craft.observed.reverts)}</strong><small
					>observed messages</small
				>
			</div>
		</div>
	</section>

	<section class={mobilePanel === 'mix' ? 'craft-mix panel-visible' : 'craft-mix'}>
		<header>
			<span>Inferred work mix</span><small
				>{craft.inferred.categorizedCommitShare}% classified by message</small
			>
		</header>
		<div class="craft-spectrum">
			{#each craft.inferred.categories as category (category.category)}
				<div
					style={`flex:${Math.max(category.share, 0.015)}`}
					title={`${category.label}: ${category.commits}`}
				></div>
			{/each}
		</div>
		<div class="craft-categories">
			{#each craft.inferred.categories as category (category.category)}
				<article>
					<span>{category.label}</span><strong>{formatInteger(category.commits)}</strong>
					<div><i style={`transform:scaleX(${category.share})`}></i></div>
				</article>
			{/each}
		</div>
	</section>

	<section
		class={mobilePanel === 'discipline' ? 'commit-discipline panel-visible' : 'commit-discipline'}
	>
		<header><span>Inferred discipline</span><small>Commit messages only</small></header>
		<div class="discipline-value">
			<strong>{craft.inferred.conventionalCommitShare}%</strong><span
				>use a conventional prefix</span
			>
		</div>
		<p>
			<Info size={15} />Classification is inferred from commit prefixes and verbs. It is not a
			semantic analysis of the changed code.
		</p>
	</section>

	<section class={mobilePanel === 'limits' ? 'quality-coverage panel-visible' : 'quality-coverage'}>
		<header><span>Quality coverage</span><small>What Weeknote cannot prove</small></header>
		<div>
			{#each craft.unavailable as unavailable (unavailable)}<p><i></i>{unavailable}</p>{/each}
		</div>
	</section>
</div>
